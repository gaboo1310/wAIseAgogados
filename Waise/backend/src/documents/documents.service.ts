import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SaveDocumentDto, GetDocumentsDto, DocumentMetadata, SavedDocumentDto } from './dtos';
import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentsService {
  private s3: AWS.S3;
  private bucketName: string;
  private useLocalStorage: boolean;
  private localStoragePath: string;

  constructor() {
    console.log('🔧 DocumentsService Constructor');
    
    // Check if we should use local storage
    this.useLocalStorage = process.env.USE_LOCAL_STORAGE === 'true' || !process.env.AWS_ACCESS_KEY_ID;
    this.localStoragePath = process.env.LOCAL_STORAGE_PATH || 'uploads';
    
    if (this.useLocalStorage) {
      console.log('📁 Using local file storage for documents');
      console.log('- Local storage path:', this.localStoragePath);
      
      // Ensure uploads directory exists
      if (!fs.existsSync(this.localStoragePath)) {
        fs.mkdirSync(this.localStoragePath, { recursive: true });
      }
    } else {
      console.log('☁️ Using AWS S3 storage for documents');
      console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
      console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
      console.log('AWS_REGION:', process.env.AWS_REGION);
      console.log('AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);
      
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim(),
        region: process.env.AWS_REGION || 'us-east-1',
        signatureVersion: 'v4'
      });
      this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'waise-documents-storage';
    }
  }

  async saveDocument(saveDocumentDto: SaveDocumentDto, userId: string): Promise<{ id: string; message: string }> {
    console.log('💾 SaveDocument called');
    console.log('UserId:', userId);
    console.log('Document:', saveDocumentDto);
    
    if (this.useLocalStorage) {
      return this.saveDocumentLocal(saveDocumentDto, userId);
    } else {
      return this.saveDocumentS3(saveDocumentDto, userId);
    }
  }

  private async saveDocumentLocal(saveDocumentDto: SaveDocumentDto, userId: string): Promise<{ id: string; message: string }> {
    try {
      const now = new Date().toISOString();
      const documentId = saveDocumentDto.id || uuidv4();
      
      // Buscar documento existente si se proporciona ID
      let existingDocument: SavedDocumentDto | null = null;
      if (saveDocumentDto.id) {
        try {
          existingDocument = await this.getDocumentFromLocal(documentId, userId);
        } catch (error) {
          // El documento no existe, crear uno nuevo
        }
      }

      const document: SavedDocumentDto = {
        id: documentId,
        title: saveDocumentDto.title,
        content: saveDocumentDto.content,
        templateId: saveDocumentDto.templateId,
        templateName: saveDocumentDto.templateName,
        createdAt: existingDocument?.createdAt || now,
        updatedAt: now,
        userId: userId
      };

      const userDir = this.getLocalUserDir(userId);
      const documentPath = path.join(userDir, 'documents');
      const filePath = path.join(documentPath, `${documentId}.json`);
      
      // Ensure directories exist
      if (!fs.existsSync(documentPath)) {
        fs.mkdirSync(documentPath, { recursive: true });
      }

      console.log('📤 Saving to local storage...');
      fs.writeFileSync(filePath, JSON.stringify(document, null, 2));
      console.log('✅ Local save successful');

      return {
        id: documentId,
        message: existingDocument ? 'Documento actualizado exitosamente' : 'Documento guardado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error saving document locally:', error);
      throw new BadRequestException(`Error guardando el documento: ${error.message}`);
    }
  }

  private async saveDocumentS3(saveDocumentDto: SaveDocumentDto, userId: string): Promise<{ id: string; message: string }> {
    try {
      const now = new Date().toISOString();
      const documentId = saveDocumentDto.id || uuidv4();
      
      // Buscar documento existente si se proporciona ID
      let existingDocument: SavedDocumentDto | null = null;
      if (saveDocumentDto.id) {
        try {
          existingDocument = await this.getDocumentFromS3(documentId, userId);
        } catch (error) {
          // El documento no existe, crear uno nuevo
        }
      }

      const document: SavedDocumentDto = {
        id: documentId,
        title: saveDocumentDto.title,
        content: saveDocumentDto.content,
        templateId: saveDocumentDto.templateId,
        templateName: saveDocumentDto.templateName,
        createdAt: existingDocument?.createdAt || now,
        updatedAt: now,
        userId: userId
      };

      const key = this.getDocumentKey(userId, documentId);
      
      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: JSON.stringify(document, null, 2),
        ContentType: 'application/json',
        Metadata: {
          userId: userId,
          documentId: documentId,
          title: saveDocumentDto.title,
          templateName: saveDocumentDto.templateName || '',
          createdAt: document.createdAt,
          updatedAt: document.updatedAt
        }
      };

      console.log('📤 Uploading to S3...');
      await this.s3.upload(uploadParams).promise();
      console.log('✅ Upload successful');

      return {
        id: documentId,
        message: existingDocument ? 'Documento actualizado exitosamente' : 'Documento guardado exitosamente'
      };
    } catch (error) {
      console.error('❌ Error guardando documento en S3:', error);
      throw new BadRequestException('Error guardando el documento');
    }
  }

  async getDocuments(userId: string): Promise<GetDocumentsDto> {
    if (this.useLocalStorage) {
      return this.getDocumentsLocal(userId);
    } else {
      return this.getDocumentsS3(userId);
    }
  }

  private async getDocumentsLocal(userId: string): Promise<GetDocumentsDto> {
    try {
      const userDir = this.getLocalUserDir(userId);
      const documentsDir = path.join(userDir, 'documents');
      
      const documents: DocumentMetadata[] = [];
      
      // Ensure documents directory exists
      if (!fs.existsSync(documentsDir)) {
        fs.mkdirSync(documentsDir, { recursive: true });
      }

      // Read all JSON files in the documents directory
      const files = fs.readdirSync(documentsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(documentsDir, file);
            const stats = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            const document: SavedDocumentDto = JSON.parse(content);
            
            documents.push({
              id: document.id,
              title: document.title || 'Documento sin título',
              templateName: document.templateName || undefined,
              createdAt: document.createdAt,
              updatedAt: document.updatedAt,
              size: stats.size
            });
          } catch (error) {
            console.error(`Error reading document ${file}:`, error);
            // Skip corrupted files
          }
        }
      }

      // Sort by updatedAt descending
      documents.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return {
        documents,
        totalCount: documents.length
      };

    } catch (error) {
      console.error('❌ Error obteniendo documentos locales:', error);
      throw new BadRequestException('Error obteniendo documentos');
    }
  }

  private async getDocumentsS3(userId: string): Promise<GetDocumentsDto> {
    try {
      const prefix = this.getUserSessionPrefix(userId);
      
      const listParams = {
        Bucket: this.bucketName,
        Prefix: prefix,
      };

      const response = await this.s3.listObjectsV2(listParams).promise();
      
      const documents: DocumentMetadata[] = [];
      
      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key && object.Size && object.LastModified) {
            try {
              // Obtener metadatos del objeto
              const headParams = {
                Bucket: this.bucketName,
                Key: object.Key
              };
              
              const headResponse = await this.s3.headObject(headParams).promise();
              const metadata = headResponse.Metadata;
              
              documents.push({
                id: metadata?.documentid || object.Key.split('/').pop()?.replace('.json', '') || '',
                title: metadata?.title || 'Documento sin título',
                templateName: metadata?.templatename || undefined,
                createdAt: metadata?.createdat || object.LastModified.toISOString(),
                updatedAt: metadata?.updatedat || object.LastModified.toISOString(),
                size: object.Size
              });
            } catch (error) {
              console.error('Error obteniendo metadatos:', error);
            }
          }
        }
      }

      // Ordenar por fecha de actualización (más reciente primero)
      documents.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return {
        documents,
        totalCount: documents.length
      };
    } catch (error) {
      console.error('Error obteniendo documentos de S3:', error);
      throw new BadRequestException('Error obteniendo los documentos');
    }
  }

  async getDocument(documentId: string, userId: string): Promise<SavedDocumentDto> {
    if (this.useLocalStorage) {
      return await this.getDocumentFromLocal(documentId, userId);
    } else {
      return await this.getDocumentFromS3(documentId, userId);
    }
  }

  async deleteDocument(documentId: string, userId: string): Promise<{ message: string }> {
    if (this.useLocalStorage) {
      return this.deleteDocumentLocal(documentId, userId);
    } else {
      return this.deleteDocumentS3(documentId, userId);
    }
  }

  private async deleteDocumentLocal(documentId: string, userId: string): Promise<{ message: string }> {
    try {
      const userDir = this.getLocalUserDir(userId);
      const documentPath = path.join(userDir, 'documents', `${documentId}.json`);
      
      if (!fs.existsSync(documentPath)) {
        throw new NotFoundException('Documento no encontrado');
      }

      fs.unlinkSync(documentPath);

      return { message: 'Documento eliminado exitosamente' };
    } catch (error) {
      console.error('Error eliminando documento local:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error eliminando el documento');
    }
  }

  private async deleteDocumentS3(documentId: string, userId: string): Promise<{ message: string }> {
    try {
      const key = this.getDocumentKey(userId, documentId);
      
      const deleteParams = {
        Bucket: this.bucketName,
        Key: key
      };

      await this.s3.deleteObject(deleteParams).promise();

      return { message: 'Documento eliminado exitosamente' };
    } catch (error) {
      console.error('Error eliminando documento de S3:', error);
      throw new BadRequestException('Error eliminando el documento');
    }
  }

  private async getDocumentFromLocal(documentId: string, userId: string): Promise<SavedDocumentDto> {
    try {
      const userDir = this.getLocalUserDir(userId);
      const documentPath = path.join(userDir, 'documents', `${documentId}.json`);
      
      if (!fs.existsSync(documentPath)) {
        throw new NotFoundException('Documento no encontrado');
      }

      const content = fs.readFileSync(documentPath, 'utf8');
      const document = JSON.parse(content);
      return document;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error obteniendo documento local:', error);
      throw new BadRequestException('Error obteniendo el documento');
    }
  }

  private getLocalUserDir(userId: string): string {
    // Sanitize userId for Windows filesystem - replace invalid characters
    const sanitizedUserId = userId.replace(/[|<>:"/\\*?]/g, '_');
    return path.join(this.localStoragePath, sanitizedUserId);
  }

  private async getDocumentFromS3(documentId: string, userId: string): Promise<SavedDocumentDto> {
    try {
      const key = this.getDocumentKey(userId, documentId);
      
      const getParams = {
        Bucket: this.bucketName,
        Key: key
      };

      const response = await this.s3.getObject(getParams).promise();
      
      if (!response.Body) {
        throw new NotFoundException('Documento no encontrado');
      }

      const document = JSON.parse(response.Body.toString());
      return document;
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        throw new NotFoundException('Documento no encontrado');
      }
      console.error('Error obteniendo documento de S3:', error);
      throw new BadRequestException('Error obteniendo el documento');
    }
  }

  private getDocumentKey(userId: string, documentId: string): string {
    return `documents/sessions/${userId}/documents/${documentId}.json`;
  }

  private getUserSessionPrefix(userId: string): string {
    return `documents/sessions/${userId}/documents/`;
  }

  async testS3Connection(): Promise<any> {
    if (this.useLocalStorage) {
      return {
        success: true,
        message: 'Using local file storage - S3 test not applicable',
        storage: 'local',
        path: this.localStoragePath
      };
    }

    try {
      console.log('🔍 Testing S3 Configuration:');
      console.log('Bucket Name:', this.bucketName);
      console.log('Region:', process.env.AWS_REGION);
      console.log('Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET ✅' : 'NOT SET ❌');
      console.log('Secret Access Key:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET ✅' : 'NOT SET ❌');

      // Test 1: List buckets (to verify credentials)
      console.log('📋 Test 1: Listing buckets...');
      const buckets = await this.s3.listBuckets().promise();
      console.log('Available buckets:', buckets.Buckets?.map(b => b.Name));

      // Test 2: Check if our bucket exists
      console.log('🪣 Test 2: Checking if bucket exists...');
      try {
        const headResult = await this.s3.headBucket({ Bucket: this.bucketName }).promise();
        console.log(`Bucket "${this.bucketName}" exists ✅`);
      } catch (error) {
        console.log(`Bucket "${this.bucketName}" does not exist or no access ❌`);
        console.log('Bucket error:', error.message);
      }

      // Test 3: Try to put a test object
      console.log('📄 Test 3: Creating test object...');
      const testKey = 'test/connection-test.json';
      const testData = {
        message: 'S3 connection test',
        timestamp: new Date().toISOString()
      };

      await this.s3.upload({
        Bucket: this.bucketName,
        Key: testKey,
        Body: JSON.stringify(testData),
        ContentType: 'application/json'
      }).promise();
      console.log('Test object created successfully ✅');

      // Test 4: Try to read the test object
      console.log('📖 Test 4: Reading test object...');
      const getResult = await this.s3.getObject({
        Bucket: this.bucketName,
        Key: testKey
      }).promise();
      console.log('Test object read successfully ✅');

      // Test 5: Delete test object
      console.log('🗑️ Test 5: Cleaning up test object...');
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: testKey
      }).promise();
      console.log('Test object deleted successfully ✅');

      return {
        success: true,
        message: 'S3 connection test passed ✅',
        config: {
          bucketName: this.bucketName,
          region: process.env.AWS_REGION,
          hasCredentials: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY
        },
        availableBuckets: buckets.Buckets?.map(b => b.Name) || []
      };

    } catch (error) {
      console.error('❌ S3 Connection test failed:', error);
      return {
        success: false,
        error: error.message,
        config: {
          bucketName: this.bucketName,
          region: process.env.AWS_REGION,
          hasCredentials: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY
        }
      };
    }
  }
}