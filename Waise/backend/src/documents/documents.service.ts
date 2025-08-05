import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SaveDocumentDto, GetDocumentsDto, DocumentMetadata, SavedDocumentDto } from './dtos';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentsService {
  private s3: AWS.S3;
  private bucketName: string;

  constructor() {
    console.log('🔧 DocumentsService Constructor');
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);
    
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'marval-documents';
  }

  async saveDocument(saveDocumentDto: SaveDocumentDto, userId: string): Promise<{ id: string; message: string }> {
    console.log('💾 SaveDocument called');
    console.log('UserId:', userId);
    console.log('Document:', saveDocumentDto);
    
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
    return await this.getDocumentFromS3(documentId, userId);
  }

  async deleteDocument(documentId: string, userId: string): Promise<{ message: string }> {
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