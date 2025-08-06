import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentMetadata, DocumentType } from './document-metadata.entity';
import { OcrService } from '../ocr/ocr.service';
import { VectorService } from '../vector/vector.service';
import * as AWS from 'aws-sdk';
import * as path from 'path';

interface CreateDocumentDto {
  filename: string;
  originalPath: string;
  fileSize: number;
  mimeType: string;
  userId: string;
  fileBuffer?: Buffer;
}

@Injectable()
export class DocumentMetadataService {
  private s3: AWS.S3 | null = null;
  private useLocalStorage: boolean;

  constructor(
    @InjectRepository(DocumentMetadata)
    private readonly documentRepository: Repository<DocumentMetadata>,
    private readonly ocrService: OcrService,
    private readonly vectorService: VectorService,
  ) {
    this.useLocalStorage = process.env.USE_LOCAL_STORAGE === 'true' || !process.env.AWS_ACCESS_KEY_ID;
    
    if (!this.useLocalStorage) {
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
      });
    } else {
      console.log('[DocumentMetadataService] Using local storage mode - S3 disabled');
    }
  }

  async createDocument(createDocumentDto: CreateDocumentDto): Promise<DocumentMetadata> {
    const { filename, originalPath, fileSize, mimeType, userId, fileBuffer } = createDocumentDto;

    let s3Key: string | null = null;
    let s3Bucket: string | null = null;

    // Solo generar S3 info si no estamos en modo local
    if (!this.useLocalStorage) {
      const timestamp = Date.now();
      s3Key = `uploaded-documents/${userId}/${timestamp}-${filename}`;
      s3Bucket = process.env.AWS_S3_BUCKET_NAME || 'abogadostest';
    }

    // Crear entrada inicial en base de datos
    const document = this.documentRepository.create({
      filename,
      originalPath,
      s3Key: s3Key || undefined,
      s3Bucket: s3Bucket || undefined,
      fileSize,
      mimeType,
      userId,
      status: 'uploaded',
    });

    const savedDocument = await this.documentRepository.save(document);

    // Si tenemos el buffer del archivo, procesar
    if (fileBuffer) {
      try {
        // Solo subir a S3 si no estamos en modo local
        if (!this.useLocalStorage && s3Bucket && s3Key) {
          await this.uploadToS3(s3Bucket, s3Key, fileBuffer, mimeType);
        }
        
        // Procesar de forma asíncrona
        this.processDocumentAsync(savedDocument.id, originalPath);
      } catch (error) {
        console.error('[DocumentMetadataService] Error uploading:', error);
        await this.updateDocumentStatus(savedDocument.id, 'error', error.message);
      }
    }

    return savedDocument;
  }

  private async uploadToS3(bucket: string, key: string, buffer: Buffer, contentType: string): Promise<void> {
    if (!this.s3) {
      throw new Error('S3 client not initialized');
    }
    
    const uploadParams = {
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    };

    await this.s3.upload(uploadParams).promise();
    console.log(`[DocumentMetadataService] File uploaded to S3: s3://${bucket}/${key}`);
  }

  private async processDocumentAsync(documentId: string, filePath: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`[DocumentMetadataService] Starting processing for document ${documentId}`);
      
      // Actualizar status
      await this.updateDocumentStatus(documentId, 'processing');

      // 1. Extraer texto con OCR
      const ocrStartTime = Date.now();
      const ocrResult = await this.ocrService.extractTextFromPdf(filePath);
      const ocrProcessingTime = Date.now() - ocrStartTime;

      if (!ocrResult.success) {
        throw new Error(`OCR failed: ${ocrResult.error}`);
      }

      // 2. Clasificar documento automáticamente
      const classificationStartTime = Date.now();
      const documentType = this.classifyDocument(ocrResult.extractedText);
      const classificationProcessingTime = Date.now() - classificationStartTime;

      // 3. Extraer campos estructurados
      const extractedFields = this.extractStructuredFields(ocrResult.extractedText, documentType);

      // 4. Determinar plantillas aplicables
      const applicableTemplates = this.determineApplicableTemplates(documentType, extractedFields);

      // 5. Procesar en vector database para RAG
      let vectorIds: string[] = [];
      const vectorStartTime = Date.now();
      
      try {
        console.log(`[DocumentMetadataService] Adding document ${documentId} to vector database...`);
        
        // Obtener datos del documento una sola vez
        const currentDoc = await this.documentRepository.findOne({ where: { id: documentId } });
        
        vectorIds = await this.vectorService.addDocumentToVector({
          id: documentId,
          text: ocrResult.extractedText,
          metadata: {
            documentId,
            userId: currentDoc?.userId || '',
            filename: currentDoc?.filename || '',
            documentType,
            chunkIndex: 0,
            totalChunks: 1,
            ...extractedFields,
          },
        });
        
        console.log(`[DocumentMetadataService] Added ${vectorIds.length} chunks to vector database`);
      } catch (vectorError) {
        console.error(`[DocumentMetadataService] Error adding to vector database:`, vectorError);
        // Continue without failing the entire process
      }
      
      const vectorProcessingTime = Date.now() - vectorStartTime;

      // 6. Actualizar documento con resultados
      const totalProcessingTime = Date.now() - startTime;
      
      await this.documentRepository.update(documentId, {
        extractedText: ocrResult.extractedText,
        ocrConfidence: ocrResult.confidence,
        pageCount: ocrResult.metadata?.pageCount || 1,
        documentType,
        extractedFields,
        applicableTemplates,
        vectorId: vectorIds.length > 0 ? vectorIds.join(',') : undefined,
        isProcessed: true,
        status: 'completed',
        processingMetadata: {
          ocrProcessingTime,
          classificationProcessingTime,
          vectorProcessingTime,
          totalProcessingTime,
        },
      });

      console.log(`[DocumentMetadataService] Document ${documentId} processed successfully in ${totalProcessingTime}ms`);

    } catch (error) {
      console.error(`[DocumentMetadataService] Error processing document ${documentId}:`, error);
      await this.updateDocumentStatus(documentId, 'error', error.message);
    }
  }

  private async updateDocumentStatus(documentId: string, status: string, errorMessage?: string): Promise<void> {
    const updateData: any = { status };
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }
    await this.documentRepository.update(documentId, updateData);
  }

  private classifyDocument(text: string): DocumentType {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('contrato') || lowerText.includes('convenio') || lowerText.includes('acuerdo')) {
      return 'contract';
    }
    if (lowerText.includes('factura') || lowerText.includes('boleta') || lowerText.includes('invoice')) {
      return 'invoice';
    }
    if (lowerText.includes('demanda') || lowerText.includes('querella') || lowerText.includes('alegato')) {
      return 'legal_brief';
    }
    if (lowerText.includes('tribunal') || lowerText.includes('juzgado') || lowerText.includes('sentencia')) {
      return 'court_document';
    }
    if (lowerText.includes('evidencia') || lowerText.includes('prueba') || lowerText.includes('testimonio')) {
      return 'evidence';
    }
    
    return 'other';
  }

  private extractStructuredFields(text: string, documentType: DocumentType): any {
    const fields: any = {};
    
    // Extraer emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex);
    if (emails) fields.emails = [...new Set(emails)];

    // Extraer teléfonos (formato chileno)
    const phoneRegex = /(\+?56\s?)?(\(?[0-9]\)?\s?)?[0-9]{4}\s?[0-9]{4}/g;
    const phones = text.match(phoneRegex);
    if (phones) fields.phones = [...new Set(phones.map(p => p.trim()))];

    // Extraer fechas (varios formatos)
    const dateRegex = /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b|\b\d{1,2}\s+de\s+[a-zA-Z]+\s+de\s+\d{4}\b/g;
    const dates = text.match(dateRegex);
    if (dates) fields.dates = [...new Set(dates)];

    // Extraer montos (formato chileno)
    const amountRegex = /\$\s?[\d.,]+|\d+\s?pesos?|\d+\s?UF/g;
    const amounts = text.match(amountRegex);
    if (amounts) fields.amounts = amounts.map(a => a.trim());

    // Extraer RUT/DNI chilenos
    const rutRegex = /\b\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/g;
    const ruts = text.match(rutRegex);
    if (ruts) fields.ruts = [...new Set(ruts)];

    // Campos específicos por tipo de documento
    if (documentType === 'court_document') {
      // Buscar RIT/RUC
      const ritRegex = /RIT\s*[:\-]?\s*[0-9\-]+/gi;
      const rits = text.match(ritRegex);
      if (rits) fields.caseNumber = rits[0];

      // Buscar tribunal
      const tribunalRegex = /(?:tribunal|juzgado|corte)[\s\w]*(?:de|del)[\s\w]*/gi;
      const tribunals = text.match(tribunalRegex);
      if (tribunals) fields.courtName = tribunals[0];
    }

    if (documentType === 'contract') {
      // Intentar extraer partes del contrato
      const partiesRegex = /(?:comparecen|partes|contratante|contratista)[:\s]*([^\.]+)/gi;
      const parties = text.match(partiesRegex);
      if (parties) fields.parties = parties.map(p => p.trim());
    }

    if (documentType === 'invoice') {
      // Buscar número de factura
      const invoiceRegex = /(?:factura|boleta)\s*n[°º]?\s*[\d\-]+/gi;
      const invoiceNumbers = text.match(invoiceRegex);
      if (invoiceNumbers) fields.invoiceNumber = invoiceNumbers[0];
    }

    return Object.keys(fields).length > 0 ? fields : null;
  }

  private determineApplicableTemplates(documentType: DocumentType, extractedFields: any): string[] {
    const templates: string[] = [];
    
    switch (documentType) {
      case 'contract':
        templates.push('contrato-arrendamiento', 'contrato-compraventa', 'contrato-prestacion-servicios');
        break;
      case 'court_document':
        templates.push('demanda-civil', 'recurso-apelacion', 'escrito-contestacion');
        break;
      case 'legal_brief':
        templates.push('alegato-conclusion', 'memorial-casacion');
        break;
      case 'invoice':
        templates.push('factura-legal', 'boleta-honorarios');
        break;
      default:
        templates.push('documento-general');
    }

    return templates;
  }

  // Métodos de consulta
  async findDocumentsByUser(userId: string): Promise<DocumentMetadata[]> {
    return this.documentRepository.find({
      where: { userId },
      order: { uploadDate: 'DESC' },
    });
  }

  async findDocumentById(id: string): Promise<DocumentMetadata | null> {
    return this.documentRepository.findOne({ where: { id } });
  }

  async deleteDocument(id: string, userId: string): Promise<boolean> {
    const document = await this.documentRepository.findOne({ 
      where: { id, userId } 
    });

    if (!document) {
      return false;
    }

    try {
      // Solo eliminar de S3 si no estamos en modo local y el documento tiene datos S3
      if (!this.useLocalStorage && this.s3 && document.s3Bucket && document.s3Key) {
        await this.s3.deleteObject({
          Bucket: document.s3Bucket,
          Key: document.s3Key,
        }).promise();
        console.log(`[DocumentMetadataService] File deleted from S3: s3://${document.s3Bucket}/${document.s3Key}`);
      }

      // Eliminar de Pinecone si existe vectorId
      if (document.vectorId) {
        try {
          const chunkIds = document.vectorId.split(',').filter(id => id.trim());
          const deleted = await this.vectorService.deleteDocumentFromVector(document.id, chunkIds);
          if (deleted) {
            console.log(`[DocumentMetadataService] Deleted ${chunkIds.length} vector chunks from Pinecone`);
          } else {
            console.warn(`[DocumentMetadataService] Failed to delete vector chunks from Pinecone`);
          }
        } catch (vectorError) {
          console.error(`[DocumentMetadataService] Error deleting from vector database:`, vectorError);
          // Continue with deletion even if vector cleanup fails
        }
      }

      // Eliminar de base de datos
      await this.documentRepository.delete(id);

      console.log(`[DocumentMetadataService] Document ${id} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`[DocumentMetadataService] Error deleting document ${id}:`, error);
      return false;
    }
  }

  async updateDocumentSelection(id: string, userId: string, isSelected: boolean): Promise<boolean> {
    const result = await this.documentRepository.update(
      { id, userId },
      { isSelectedForTemplate: isSelected }
    );
    return (result.affected || 0) > 0;
  }

  async getSelectedDocuments(userId: string): Promise<DocumentMetadata[]> {
    return this.documentRepository.find({
      where: { userId, isSelectedForTemplate: true },
      order: { uploadDate: 'DESC' },
    });
  }

  async searchDocuments(userId: string, query: string): Promise<DocumentMetadata[]> {
    return this.documentRepository
      .createQueryBuilder('doc')
      .where('doc.userId = :userId', { userId })
      .andWhere(
        '(doc.filename ILIKE :query OR doc.extractedText ILIKE :query OR doc.category ILIKE :query)',
        { query: `%${query}%` }
      )
      .orderBy('doc.uploadDate', 'DESC')
      .getMany();
  }

  async getDocumentsByType(userId: string, documentType: DocumentType): Promise<DocumentMetadata[]> {
    return this.documentRepository.find({
      where: { userId, documentType },
      order: { uploadDate: 'DESC' },
    });
  }

  async getProcessingStats(userId: string): Promise<any> {
    const totalDocs = await this.documentRepository.count({ where: { userId } });
    const processedDocs = await this.documentRepository.count({ where: { userId, isProcessed: true } });
    const errorDocs = await this.documentRepository.count({ where: { userId, status: 'error' } });
    
    return {
      total: totalDocs,
      processed: processedDocs,
      errors: errorDocs,
      pending: totalDocs - processedDocs - errorDocs
    };
  }
}