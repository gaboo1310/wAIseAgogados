import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  uploadedAt?: string;
  path: string;
}

@Injectable()
export class UploadsService {
  private s3: AWS.S3;
  private bucketName: string;

  constructor() {
    console.log('🔧 UploadsService Constructor');
    
    // Validate AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID) {
      console.error('❌ AWS_ACCESS_KEY_ID is missing');
    }
    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('❌ AWS_SECRET_ACCESS_KEY is missing');
    }
    
    console.log('AWS Configuration:');
    console.log('- Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'MISSING');
    console.log('- Secret Key:', process.env.AWS_SECRET_ACCESS_KEY ? `${process.env.AWS_SECRET_ACCESS_KEY.substring(0, 8)}... (${process.env.AWS_SECRET_ACCESS_KEY.length} chars)` : 'MISSING');
    console.log('- Region:', process.env.AWS_REGION);
    console.log('- Bucket:', process.env.AWS_S3_BUCKET_NAME);
    
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'marval-documents';
  }

  async testConnection() {
    try {
      console.log('🧪 Testing AWS S3 connection...');
      const buckets = await this.s3.listBuckets().promise();
      console.log('✅ AWS S3 connection successful');
      console.log('Available buckets:', buckets.Buckets.map(b => b.Name));
      
      const bucketExists = buckets.Buckets.some(b => b.Name === this.bucketName);
      console.log(`Bucket "${this.bucketName}":`, bucketExists ? '✅ Exists' : '❌ Not found');
      
      return { success: true, buckets: buckets.Buckets.map(b => b.Name), bucketExists };
    } catch (error) {
      console.error('❌ AWS S3 connection failed:', error.message);
      console.error('Error code:', error.code);
      return { success: false, error: error.message, code: error.code };
    }
  }

  async uploadFile(file: Express.Multer.File, path: string, userId: string) {
    try {
      console.log('📤 Uploading file to S3');
      console.log('File details:', {
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });

      const fileId = uuidv4();
      const fileName = file.originalname;
      const filePath = path ? `${path}/${fileName}` : fileName;
      const s3Key = this.getFileKey(userId, filePath);

      console.log('S3 Key:', s3Key);

      const uploadParams = {
        Bucket: this.bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          userId: userId,
          fileId: fileId,
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
          path: filePath
        }
      };

      const result = await this.s3.upload(uploadParams).promise();
      console.log('✅ File uploaded successfully');

      return {
        id: fileId,
        name: fileName,
        path: filePath,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        s3Key: result.Key,
        message: 'Archivo subido exitosamente'
      };

    } catch (error) {
      console.error('❌ Error uploading file:', error);
      throw new BadRequestException('Error subiendo el archivo');
    }
  }

  async createFolder(folderName: string, path: string, userId: string) {
    try {
      console.log('📁 Creating folder');
      
      // Validar nombre de carpeta
      if (!folderName || folderName.trim().length === 0) {
        throw new BadRequestException('Nombre de carpeta inválido');
      }

      // Crear un objeto marcador para la carpeta (S3 no tiene carpetas reales)
      const folderPath = path ? `${path}/${folderName}` : folderName;
      const s3Key = this.getFolderKey(userId, folderPath);

      console.log('Folder S3 Key:', s3Key);

      const uploadParams = {
        Bucket: this.bucketName,
        Key: s3Key,
        Body: '',
        ContentType: 'application/x-directory',
        Metadata: {
          userId: userId,
          folderName: folderName,
          createdAt: new Date().toISOString(),
          path: folderPath,
          type: 'folder'
        }
      };

      await this.s3.upload(uploadParams).promise();
      console.log('✅ Folder created successfully');

      return {
        name: folderName,
        path: folderPath,
        type: 'folder',
        createdAt: new Date().toISOString(),
        message: 'Carpeta creada exitosamente'
      };

    } catch (error) {
      console.error('❌ Error creating folder:', error);
      throw new BadRequestException('Error creando la carpeta');
    }
  }

  async listFiles(path: string, userId: string) {
    try {
      console.log('📋 Listing files for path:', path);
      
      const prefix = this.getUserUploadsPrefix(userId, path);
      console.log('S3 Prefix:', prefix);

      const listParams = {
        Bucket: this.bucketName,
        Prefix: prefix,
        Delimiter: '/'
      };

      const response = await this.s3.listObjectsV2(listParams).promise();
      const files: FileItem[] = [];

      // Procesar carpetas (CommonPrefixes)
      if (response.CommonPrefixes) {
        for (const prefix of response.CommonPrefixes) {
          if (prefix.Prefix) {
            const folderName = prefix.Prefix.replace(listParams.Prefix, '').replace('/', '');
            if (folderName) {
              files.push({
                id: uuidv4(),
                name: folderName,
                type: 'folder',
                path: path ? `${path}/${folderName}` : folderName
              });
            }
          }
        }
      }

      // Procesar archivos
      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key && object.Size && object.LastModified) {
            // Filtrar el marcador de carpeta y archivos que son solo marcadores de directorio
            if (object.Key.endsWith('/') || object.Size === 0) continue;
            
            const fileName = object.Key.split('/').pop();
            if (fileName) {
              try {
                // Obtener metadatos
                const headParams = {
                  Bucket: this.bucketName,
                  Key: object.Key
                };
                
                const headResponse = await this.s3.headObject(headParams).promise();
                const metadata = headResponse.Metadata;

                // Construir la ruta correcta basada en la ubicación real del archivo en S3
                const actualPath = this.extractPathFromS3Key(object.Key, userId);
                
                files.push({
                  id: metadata?.fileid || uuidv4(),
                  name: fileName,
                  type: 'file',
                  size: object.Size,
                  uploadedAt: metadata?.uploadedat || object.LastModified.toISOString(),
                  path: actualPath
                });
              } catch (error) {
                console.error('Error getting file metadata:', error);
                // Agregar archivo sin metadatos si hay error
                const fallbackPath = this.extractPathFromS3Key(object.Key, userId);
                
                files.push({
                  id: uuidv4(),
                  name: fileName,
                  type: 'file',
                  size: object.Size,
                  uploadedAt: object.LastModified.toISOString(),
                  path: fallbackPath
                });
              }
            }
          }
        }
      }

      // Ordenar: carpetas primero, luego archivos
      files.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      console.log('📋 Files found:', files.length);

      return {
        files,
        currentPath: path,
        totalCount: files.length
      };

    } catch (error) {
      console.error('❌ Error listing files:', error);
      throw new BadRequestException('Error obteniendo la lista de archivos');
    }
  }

  async downloadFile(filePath: string, userId: string) {
    try {
      console.log('📥 Downloading file:', filePath);
      
      const s3Key = this.getFileKey(userId, filePath);
      console.log('Download S3 Key:', s3Key);

      const getParams = {
        Bucket: this.bucketName,
        Key: s3Key
      };

      // Verificar que el archivo existe
      try {
        await this.s3.headObject(getParams).promise();
      } catch (error) {
        if (error.code === 'NoSuchKey') {
          throw new NotFoundException('Archivo no encontrado');
        }
        throw error;
      }

      // Crear stream para descargar
      const stream = this.s3.getObject(getParams).createReadStream();
      console.log('✅ File stream created');
      
      return stream;

    } catch (error) {
      console.error('❌ Error downloading file:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error descargando el archivo');
    }
  }

  private getFileKey(userId: string, filePath: string): string {
    return `uploads/${userId}/${filePath}`;
  }

  private getFolderKey(userId: string, folderPath: string): string {
    return `uploads/${userId}/${folderPath}/`;
  }

  private getUserUploadsPrefix(userId: string, path: string = ''): string {
    const basePath = `uploads/${userId}/`;
    return path ? `${basePath}${path}/` : basePath;
  }

  private extractPathFromS3Key(s3Key: string, userId: string): string {
    // S3 Key format: uploads/userId/path/to/file.ext
    // We want to extract: path/to/file.ext
    const userPrefix = `uploads/${userId}/`;
    
    if (!s3Key.startsWith(userPrefix)) {
      console.warn('⚠️ S3 key does not start with expected user prefix:', s3Key);
      return s3Key; // Return as-is if unexpected format
    }
    
    const pathWithoutPrefix = s3Key.substring(userPrefix.length);
    console.log('📁 Extracted path from S3 key:', s3Key, '->', pathWithoutPrefix);
    
    return pathWithoutPrefix;
  }

  async deleteFile(filePath: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🗑️ Deleting file:', filePath, 'for user:', userId);
      
      const key = this.getFileKey(userId, filePath);
      
      const deleteParams = {
        Bucket: this.bucketName,
        Key: key
      };

      await this.s3.deleteObject(deleteParams).promise();
      
      console.log('✅ File deleted successfully');
      return {
        success: true,
        message: 'Archivo eliminado exitosamente'
      };
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      throw new BadRequestException('Error eliminando el archivo');
    }
  }

  async getSignedUrl(filePath: string, userId: string): Promise<{ url: string; expiresIn: number }> {
    try {
      console.log('🔗 Generating signed URL for:', filePath, 'user:', userId);
      
      const key = this.getFileKey(userId, filePath);
      const expiresIn = 3600; // 1 hour
      
      const signedUrl = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn
      });
      
      console.log('✅ Signed URL generated successfully');
      return {
        url: signedUrl,
        expiresIn: expiresIn
      };
    } catch (error) {
      console.error('❌ Error generating signed URL:', error);
      throw new BadRequestException('Error generando URL firmada');
    }
  }

  async moveFile(sourcePath: string, targetPath: string, fileName: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🎯 Moving file:', fileName);
      console.log('From sourcePath:', sourcePath);
      console.log('To targetPath:', targetPath);
      console.log('User ID:', userId);
      
      const sourceKey = this.getFileKey(userId, sourcePath);
      
      // Manejar el caso donde targetPath está vacío (directorio raíz)
      const finalTargetPath = targetPath ? `${targetPath}/${fileName}` : fileName;
      const destinationKey = this.getFileKey(userId, finalTargetPath);
      
      console.log('Source S3 Key:', sourceKey);
      console.log('Destination S3 Key:', destinationKey);
      console.log('Final target path:', finalTargetPath);

      // Primero verificar que el archivo origen existe
      try {
        await this.s3.headObject({
          Bucket: this.bucketName,
          Key: sourceKey
        }).promise();
      } catch (error) {
        if (error.code === 'NoSuchKey') {
          throw new NotFoundException('El archivo origen no existe');
        }
        throw error;
      }

      // Copiar el archivo a la nueva ubicación
      const copyParams = {
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceKey}`,
        Key: destinationKey
      };

      await this.s3.copyObject(copyParams).promise();
      console.log('✅ File copied to destination');

      // Eliminar el archivo original
      const deleteParams = {
        Bucket: this.bucketName,
        Key: sourceKey
      };

      await this.s3.deleteObject(deleteParams).promise();
      console.log('✅ Original file deleted');
      console.log('✅ File move completed successfully');
      console.log('✅ File should now be at:', destinationKey);

      return {
        success: true,
        message: 'Archivo movido exitosamente'
      };

    } catch (error) {
      console.error('❌ Error moving file:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error moviendo el archivo');
    }
  }

  async deleteFolder(folderPath: string, userId: string): Promise<{ success: boolean; message: string; deletedCount: number }> {
    try {
      console.log('🗑️ Deleting folder:', folderPath, 'for user:', userId);
      
      const folderPrefix = this.getFolderKey(userId, folderPath);
      console.log('🗑️ Folder prefix to delete:', folderPrefix);
      
      // Listar todos los objetos dentro de la carpeta
      const listParams = {
        Bucket: this.bucketName,
        Prefix: folderPrefix
      };

      const listedObjects = await this.s3.listObjectsV2(listParams).promise();
      
      if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
        console.log('⚠️ No objects found in folder, deleting folder marker only');
        // Solo eliminar el marcador de carpeta si existe
        try {
          await this.s3.deleteObject({
            Bucket: this.bucketName,
            Key: folderPrefix
          }).promise();
        } catch (error) {
          console.log('ℹ️ No folder marker to delete');
        }
        
        return {
          success: true,
          message: 'Carpeta eliminada exitosamente',
          deletedCount: 0
        };
      }

      // Preparar objetos para eliminación en lotes - filtrar keys undefined
      const objectsToDelete = listedObjects.Contents
        .filter(obj => obj.Key) // Filtrar objetos sin Key
        .map(obj => ({ Key: obj.Key! })); // Non-null assertion después del filter
      
      console.log('🗑️ Objects to delete:', objectsToDelete.length);

      // Eliminar en lotes (máximo 1000 objetos por request)
      const deleteRequests: Promise<AWS.S3.DeleteObjectsOutput>[] = [];
      const batchSize = 1000;
      
      for (let i = 0; i < objectsToDelete.length; i += batchSize) {
        const batch = objectsToDelete.slice(i, i + batchSize);
        
        const deleteParams: AWS.S3.DeleteObjectsRequest = {
          Bucket: this.bucketName,
          Delete: {
            Objects: batch,
            Quiet: false
          }
        };

        deleteRequests.push(this.s3.deleteObjects(deleteParams).promise());
      }

      // Ejecutar todas las eliminaciones en paralelo
      const deleteResults = await Promise.all(deleteRequests);
      
      let totalDeleted = 0;
      deleteResults.forEach(result => {
        if (result.Deleted) {
          totalDeleted += result.Deleted.length;
        }
        if (result.Errors && result.Errors.length > 0) {
          console.error('❌ Some objects failed to delete:', result.Errors);
        }
      });

      console.log('✅ Folder deletion completed successfully');
      console.log('✅ Total objects deleted:', totalDeleted);

      return {
        success: true,
        message: 'Carpeta y todos sus contenidos eliminados exitosamente',
        deletedCount: totalDeleted
      };

    } catch (error) {
      console.error('❌ Error deleting folder:', error);
      throw new BadRequestException('Error eliminando la carpeta');
    }
  }
}