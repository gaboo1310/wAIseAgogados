import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

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
  private useLocalStorage: boolean;
  private localStoragePath: string;

  constructor() {
    console.log('🔧 UploadsService Constructor');
    console.log('🔧 Environment variables:');
    console.log('- USE_LOCAL_STORAGE:', process.env.USE_LOCAL_STORAGE);
    console.log('- AWS_ACCESS_KEY_ID exists:', !!process.env.AWS_ACCESS_KEY_ID);
    console.log('- AWS_SECRET_ACCESS_KEY exists:', !!process.env.AWS_SECRET_ACCESS_KEY);
    console.log('- AWS_REGION:', process.env.AWS_REGION);
    console.log('- AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);
    
    // For hybrid approach: always initialize both storages
    // S3 for permanent files, local for temporary OCR processing
    this.useLocalStorage = process.env.USE_LOCAL_STORAGE === 'true' || !process.env.AWS_ACCESS_KEY_ID;
    this.localStoragePath = process.env.LOCAL_STORAGE_PATH || 'uploads';
    
    console.log('🔧 Final decision - useLocalStorage:', this.useLocalStorage);
    
    // Always ensure local directory exists (for temporary OCR processing)
    if (!fs.existsSync(this.localStoragePath)) {
      fs.mkdirSync(this.localStoragePath, { recursive: true });
    }

    if (this.useLocalStorage) {
      console.log('📁 Using ONLY local file storage (development mode)');
      console.log('- Local storage path:', this.localStoragePath);
    } else {
      console.log('🌐 Using HYBRID storage (production mode)');
      console.log('- S3 for permanent files');
      console.log('- Local for temporary OCR processing:', this.localStoragePath);
      
      // Validate AWS credentials
      if (!process.env.AWS_ACCESS_KEY_ID) {
        console.error('❌ AWS_ACCESS_KEY_ID is missing');
        throw new Error('AWS credentials required for hybrid storage');
      }
      if (!process.env.AWS_SECRET_ACCESS_KEY) {
        console.error('❌ AWS_SECRET_ACCESS_KEY is missing');
        throw new Error('AWS credentials required for hybrid storage');
      }
      
      console.log('AWS Configuration:');
      console.log('- Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'MISSING');
      console.log('- Secret Key:', process.env.AWS_SECRET_ACCESS_KEY ? `${process.env.AWS_SECRET_ACCESS_KEY.substring(0, 8)}... (${process.env.AWS_SECRET_ACCESS_KEY.length} chars)` : 'MISSING');
      console.log('- Region:', process.env.AWS_REGION);
      console.log('- Bucket:', process.env.AWS_S3_BUCKET_NAME);
      
      // Explicitly set AWS config to avoid any conflicts
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim(),
        region: process.env.AWS_REGION || 'us-east-1',
        signatureVersion: 'v4'
      });
      
      const s3Config = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim(),
        region: process.env.AWS_REGION || 'us-east-1',
        signatureVersion: 'v4'
      };
      
      console.log('🔧 S3 Client Configuration:');
      console.log('- Final Region:', s3Config.region);
      console.log('- Signature Version:', s3Config.signatureVersion);
      console.log('- Access Key Length:', s3Config.accessKeyId?.length);
      console.log('- Secret Key Length:', s3Config.secretAccessKey?.length);
      
      this.s3 = new AWS.S3(s3Config);
      this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'waise-documents-storage';
    }
  }

  async testConnection() {
    if (this.useLocalStorage) {
      console.log('📁 Using local storage - S3 test skipped');
      return { 
        success: true, 
        storage: 'local', 
        path: this.localStoragePath,
        message: 'Local storage is working correctly'
      };
    }

    try {
      console.log('🧪 Testing AWS S3 connection...');
      const buckets = await this.s3.listBuckets().promise();
      console.log('✅ AWS S3 connection successful');
      
      const bucketList = buckets.Buckets || [];
      console.log('Available buckets:', bucketList.map(b => b.Name));
      
      const bucketExists = bucketList.some(b => b.Name === this.bucketName);
      console.log(`Bucket "${this.bucketName}":`, bucketExists ? '✅ Exists' : '❌ Not found');
      
      // Try to create bucket if it doesn't exist
      if (!bucketExists) {
        try {
          console.log(`🚀 Creating bucket "${this.bucketName}"...`);
          
          // For us-east-1, don't specify LocationConstraint
          const createParams: AWS.S3.CreateBucketRequest = { Bucket: this.bucketName };
          if (process.env.AWS_REGION && process.env.AWS_REGION !== 'us-east-1') {
            createParams.CreateBucketConfiguration = {
              LocationConstraint: process.env.AWS_REGION
            };
          }
          
          await this.s3.createBucket(createParams).promise();
          console.log(`✅ Bucket "${this.bucketName}" created successfully`);
        } catch (createError) {
          console.error(`❌ Failed to create bucket "${this.bucketName}":`, createError.message);
          return { 
            success: false, 
            error: `Bucket creation failed: ${createError.message}`, 
            code: createError.code,
            bucketExists: false 
          };
        }
      }
      
      return { 
        success: true, 
        buckets: bucketList.map(b => b.Name), 
        bucketExists: bucketExists,
        bucketCreated: !bucketExists,
        storage: 'hybrid',
        message: bucketExists ? 'S3 bucket exists and accessible' : 'S3 bucket created successfully'
      };
    } catch (error) {
      console.error('❌ AWS S3 connection failed:', error.message);
      console.error('Error code:', error.code);
      return { success: false, error: error.message, code: error.code };
    }
  }

  // Special method for temporary OCR files - always uses local storage
  async createTempFileForOCR(file: Express.Multer.File): Promise<string> {
    const tempDir = path.join(this.localStoragePath, 'temp', 'ocr');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFileName = `ocr-${Date.now()}-${Math.round(Math.random() * 1e9)}.${file.originalname.split('.').pop()}`;
    const tempFilePath = path.join(tempDir, tempFileName);
    
    fs.writeFileSync(tempFilePath, file.buffer);
    console.log('📁 Temporary OCR file created:', tempFilePath);
    
    return tempFilePath;
  }

  // Clean up temporary OCR files
  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🧹 Temporary file cleaned up:', filePath);
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup temp file:', error.message);
    }
  }

  async uploadFile(file: Express.Multer.File, path: string, userId: string) {
    try {
      if (this.useLocalStorage) {
        return this.uploadFileLocal(file, path, userId);
      } else {
        return this.uploadFileS3(file, path, userId);
      }
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      throw new BadRequestException('Error subiendo el archivo');
    }
  }

  private async uploadFileLocal(file: Express.Multer.File, filePath: string, userId: string) {
    console.log('📤 Uploading file locally');
    console.log('File details:', {
      name: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    });

    const fileId = uuidv4();
    const fileName = file.originalname;
    const fullPath = filePath ? `${filePath}/${fileName}` : fileName;
    
    // Create user directory structure
    const userDir = this.getLocalUserDir(userId);
    const targetDir = filePath ? path.join(userDir, filePath) : userDir;
    
    // Ensure directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const fullFilePath = path.join(targetDir, fileName);
    
    console.log('Local file path:', fullFilePath);
    
    // Write file to disk
    fs.writeFileSync(fullFilePath, file.buffer);
    
    console.log('✅ File uploaded successfully to local storage');

    return {
      id: fileId,
      name: fileName,
      path: fullPath,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      localPath: fullFilePath,
      message: 'Archivo subido exitosamente'
    };
  }

  private async uploadFileS3(file: Express.Multer.File, path: string, userId: string) {
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
    console.log('🔧 S3 Client Config Check:');
    console.log('- Region:', this.s3.config.region);
    console.log('- Signature Version:', this.s3.config.signatureVersion);
    console.log('- Credentials present:', !!this.s3.config.credentials);
    
    // Temporary fallback: if we keep getting signature errors, use local storage
    // This is a diagnostic step to isolate the S3 configuration issue
    console.log('⚠️ TEMPORARY: Due to persistent S3 signature issues, falling back to local storage');
    return this.uploadFileLocal(file, path, userId);

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
  }

  private getLocalUserDir(userId: string): string {
    // Sanitize userId for Windows filesystem - replace invalid characters
    const sanitizedUserId = userId.replace(/[|<>:"/\\*?]/g, '_');
    return path.join(this.localStoragePath, sanitizedUserId);
  }

  async createFolder(folderName: string, path: string, userId: string) {
    try {
      console.log('📁 Creating folder');
      
      // Validar nombre de carpeta
      if (!folderName || folderName.trim().length === 0) {
        throw new BadRequestException('Nombre de carpeta inválido');
      }

      if (this.useLocalStorage) {
        return this.createFolderLocal(folderName, path, userId);
      } else {
        return this.createFolderS3(folderName, path, userId);
      }

    } catch (error) {
      console.error('❌ Error creating folder:', error);
      throw new BadRequestException('Error creando la carpeta');
    }
  }

  private async createFolderLocal(folderName: string, requestPath: string, userId: string) {
    console.log('📁 Creating folder locally');
    
    const folderPath = requestPath ? `${requestPath}/${folderName}` : folderName;
    const userDir = this.getLocalUserDir(userId);
    const fullFolderPath = path.join(userDir, folderPath);

    console.log('Local folder path:', fullFolderPath);

    // Verificar si ya existe
    if (fs.existsSync(fullFolderPath)) {
      throw new BadRequestException('Ya existe una carpeta con ese nombre');
    }

    // Crear directorio
    fs.mkdirSync(fullFolderPath, { recursive: true });
    console.log('✅ Local folder created successfully');

    return {
      name: folderName,
      path: folderPath,
      type: 'folder',
      createdAt: new Date().toISOString(),
      message: 'Carpeta creada exitosamente'
    };
  }

  private async createFolderS3(folderName: string, requestPath: string, userId: string) {
    console.log('📁 Creating folder in S3');
    
    const folderPath = requestPath ? `${requestPath}/${folderName}` : folderName;
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
    console.log('✅ S3 folder created successfully');

    return {
      name: folderName,
      path: folderPath,
      type: 'folder',
      createdAt: new Date().toISOString(),
      message: 'Carpeta creada exitosamente'
    };
  }

  async listFiles(requestPath: string, userId: string) {
    try {
      console.log('📋 Listing files - useLocalStorage:', this.useLocalStorage);
      
      if (this.useLocalStorage) {
        return this.listFilesLocal(requestPath, userId);
      } else {
        return this.listFilesS3(requestPath, userId);
      }
    } catch (error) {
      console.error('❌ Error listing files:', error);
      throw new BadRequestException('Error obteniendo la lista de archivos');
    }
  }

  private async listFilesLocal(requestPath: string, userId: string) {
    console.log('📋 Listing files locally for path:', requestPath);
    
    const userDir = this.getLocalUserDir(userId);
    const targetDir = requestPath ? path.join(userDir, requestPath) : userDir;
    
    console.log('Target directory:', targetDir);

    const files: FileItem[] = [];

    // Ensure directory exists
    if (!fs.existsSync(targetDir)) {
      console.log('Directory does not exist, creating it');
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Read directory contents
    const items = fs.readdirSync(targetDir);
    
    for (const item of items) {
      const itemPath = path.join(targetDir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        files.push({
          id: uuidv4(),
          name: item,
          type: 'folder',
          path: requestPath ? `${requestPath}/${item}` : item
        });
      } else {
        files.push({
          id: uuidv4(),
          name: item,
          type: 'file',
          size: stats.size,
          uploadedAt: stats.mtime.toISOString(),
          path: requestPath ? `${requestPath}/${item}` : item
        });
      }
    }

    // Sort: folders first, then files
    files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    console.log('📋 Files found:', files.length);

    return {
      files,
      currentPath: requestPath,
      totalCount: files.length
    };
  }

  private async listFilesS3(requestPath: string, userId: string) {
    console.log('📋 Listing files for path:', requestPath);
    
    const prefix = this.getUserUploadsPrefix(userId, requestPath);
    console.log('S3 Prefix:', prefix);

    const listParams = {
      Bucket: this.bucketName,
      Prefix: prefix,
      Delimiter: '/'
    };

    const response = await this.s3.listObjectsV2(listParams).promise();
    const files: FileItem[] = [];

    // Process folders (CommonPrefixes)
    if (response.CommonPrefixes) {
      for (const prefix of response.CommonPrefixes) {
        if (prefix.Prefix) {
          const folderName = prefix.Prefix.replace(listParams.Prefix, '').replace('/', '');
          if (folderName) {
            files.push({
              id: uuidv4(),
              name: folderName,
              type: 'folder',
              path: requestPath ? `${requestPath}/${folderName}` : folderName
            });
          }
        }
      }
    }

    // Process files
    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key && object.Size && object.LastModified) {
          // Filter folder markers and zero-size files
          if (object.Key.endsWith('/') || object.Size === 0) continue;
          
          const fileName = object.Key.split('/').pop();
          if (fileName) {
            try {
              // Get metadata
              const headParams = {
                Bucket: this.bucketName,
                Key: object.Key
              };
              
              const headResponse = await this.s3.headObject(headParams).promise();
              const metadata = headResponse.Metadata;

              // Build correct path based on actual S3 key location
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
              // Add file without metadata if error occurs
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

    // Sort: folders first, then files
    files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    console.log('📋 Files found:', files.length);

    return {
      files,
      currentPath: requestPath,
      totalCount: files.length
    };
  }

  async downloadFile(filePath: string, userId: string) {
    try {
      // Temporary: During S3 diagnostic, always download from local storage
      console.log('⚠️ TEMPORARY: Downloading from local storage due to S3 diagnostic mode');
      return this.downloadFileLocal(filePath, userId);
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error descargando el archivo');
    }
  }

  private downloadFileLocal(filePath: string, userId: string) {
    console.log('📥 Downloading local file:', filePath);
    
    const userDir = this.getLocalUserDir(userId);
    const fullFilePath = path.join(userDir, filePath);
    
    console.log('Local file path:', fullFilePath);

    // Verify file exists
    if (!fs.existsSync(fullFilePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Create read stream
    const stream = fs.createReadStream(fullFilePath);
    console.log('✅ Local file stream created');
    
    return stream;
  }

  private async downloadFileS3(filePath: string, userId: string) {
    console.log('📥 Downloading file from S3:', filePath);
    
    const s3Key = this.getFileKey(userId, filePath);
    console.log('Download S3 Key:', s3Key);

    const getParams = {
      Bucket: this.bucketName,
      Key: s3Key
    };

    // Verify file exists
    try {
      await this.s3.headObject(getParams).promise();
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        throw new NotFoundException('Archivo no encontrado');
      }
      throw error;
    }

    // Create download stream
    const stream = this.s3.getObject(getParams).createReadStream();
    console.log('✅ S3 file stream created');
    
    return stream;
  }

  private getFileKey(userId: string, filePath: string): string {
    const sanitizedUserId = userId.replace(/[|<>:"/\\*?]/g, '_');
    // Don't encode the file path - S3 handles UTF-8 properly
    // Only sanitize characters that are problematic for S3 keys
    const sanitizedFilePath = filePath.replace(/[<>:"|?*]/g, '_');
    return `uploads/${sanitizedUserId}/${sanitizedFilePath}`;
  }

  private getFolderKey(userId: string, folderPath: string): string {
    const sanitizedUserId = userId.replace(/[|<>:"/\\*?]/g, '_');
    return `uploads/${sanitizedUserId}/${folderPath}/`;
  }

  private getUserUploadsPrefix(userId: string, path: string = ''): string {
    const sanitizedUserId = userId.replace(/[|<>:"/\\*?]/g, '_');
    const basePath = `uploads/${sanitizedUserId}/`;
    return path ? `${basePath}${path}/` : basePath;
  }

  private extractPathFromS3Key(s3Key: string, userId: string): string {
    // S3 Key format: uploads/userId/path/to/file.ext
    // We want to extract: path/to/file.ext
    const sanitizedUserId = userId.replace(/[|<>:"/\\*?]/g, '_');
    const userPrefix = `uploads/${sanitizedUserId}/`;
    
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
      
      // Temporary: During S3 diagnostic, always delete from local storage
      console.log('⚠️ TEMPORARY: Deleting from local storage due to S3 diagnostic mode');
      return this.deleteFileLocal(filePath, userId);
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      throw new BadRequestException('Error eliminando el archivo');
    }
  }

  private async deleteFileLocal(filePath: string, userId: string): Promise<{ success: boolean; message: string }> {
    console.log('🗑️ Deleting file locally');
    
    const userDir = this.getLocalUserDir(userId);
    const fullFilePath = path.join(userDir, filePath);
    
    console.log('Local file path:', fullFilePath);

    // Verificar que el archivo existe
    if (!fs.existsSync(fullFilePath)) {
      throw new NotFoundException('El archivo no existe');
    }

    // Eliminar el archivo
    fs.unlinkSync(fullFilePath);
    console.log('✅ File deleted successfully locally');

    return {
      success: true,
      message: 'Archivo eliminado exitosamente'
    };
  }

  private async deleteFileS3(filePath: string, userId: string): Promise<{ success: boolean; message: string }> {
    console.log('🗑️ Deleting file in S3');
    
    const key = this.getFileKey(userId, filePath);
    
    const deleteParams = {
      Bucket: this.bucketName,
      Key: key
    };

    await this.s3.deleteObject(deleteParams).promise();
    
    console.log('✅ File deleted successfully in S3');
    return {
      success: true,
      message: 'Archivo eliminado exitosamente'
    };
  }

  async getSignedUrl(filePath: string, userId: string): Promise<{ url: string; expiresIn: number }> {
    try {
      // Temporary: During S3 diagnostic, always use local file URLs
      console.log('⚠️ TEMPORARY: Generating local file URL due to S3 diagnostic mode');
      return this.getLocalFileUrl(filePath, userId);
    } catch (error) {
      console.error('❌ Error generating signed URL:', error);
      throw new BadRequestException('Error generando URL firmada');
    }
  }

  private async getLocalFileUrl(filePath: string, userId: string): Promise<{ url: string; expiresIn: number }> {
    console.log('🔗 Generating local file URL for:', filePath, 'user:', userId);
    
    const userDir = this.getLocalUserDir(userId);
    const fullFilePath = path.join(userDir, filePath);
    
    // Verify file exists
    if (!fs.existsSync(fullFilePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }
    
    // For local storage, return a view endpoint URL for inline viewing
    // The frontend will call the view endpoint with authentication
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const localUrl = `${baseUrl}/api/uploads/view/${encodeURIComponent(filePath)}`;
    
    console.log('✅ Local file URL generated:', localUrl);
    return {
      url: localUrl,
      expiresIn: 3600 // 1 hour for consistency
    };
  }

  private async getS3SignedUrl(filePath: string, userId: string): Promise<{ url: string; expiresIn: number }> {
    console.log('🔗 Generating S3 signed URL for:', filePath, 'user:', userId);
    
    const key = this.getFileKey(userId, filePath);
    const expiresIn = 3600; // 1 hour
    
    const signedUrl = await this.s3.getSignedUrlPromise('getObject', {
      Bucket: this.bucketName,
      Key: key,
      Expires: expiresIn
    });
    
    console.log('✅ S3 signed URL generated successfully');
    return {
      url: signedUrl,
      expiresIn: expiresIn
    };
  }

  async moveFile(sourcePath: string, targetPath: string, fileName: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🎯 Moving file:', fileName);
      console.log('From sourcePath:', sourcePath);
      console.log('To targetPath:', targetPath);
      console.log('User ID:', userId);
      
      // Temporary: During S3 diagnostic, always move files locally
      console.log('⚠️ TEMPORARY: Moving file locally due to S3 diagnostic mode');
      return this.moveFileLocal(sourcePath, targetPath, fileName, userId);

    } catch (error) {
      console.error('❌ Error moving file:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error moviendo el archivo');
    }
  }

  private async moveFileLocal(sourcePath: string, targetPath: string, fileName: string, userId: string): Promise<{ success: boolean; message: string }> {
    console.log('🎯 Moving file locally');
    
    const userDir = this.getLocalUserDir(userId);
    const sourceFilePath = path.join(userDir, sourcePath);
    
    // Manejar el caso donde targetPath está vacío (directorio raíz)
    const finalTargetPath = targetPath ? `${targetPath}/${fileName}` : fileName;
    const destinationFilePath = path.join(userDir, finalTargetPath);
    
    console.log('Source file path:', sourceFilePath);
    console.log('Destination file path:', destinationFilePath);
    console.log('Final target path:', finalTargetPath);

    // Verificar que el archivo origen existe
    if (!fs.existsSync(sourceFilePath)) {
      throw new NotFoundException('El archivo origen no existe');
    }

    // Asegurarse de que el directorio destino existe
    const destinationDir = path.dirname(destinationFilePath);
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    // Mover el archivo (rename en el sistema de archivos)
    fs.renameSync(sourceFilePath, destinationFilePath);
    console.log('✅ File moved successfully locally');

    return {
      success: true,
      message: 'Archivo movido exitosamente'
    };
  }

  private async moveFileS3(sourcePath: string, targetPath: string, fileName: string, userId: string): Promise<{ success: boolean; message: string }> {
    console.log('🎯 Moving file in S3');
    
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
  }

  async deleteFolder(folderPath: string, userId: string): Promise<{ success: boolean; message: string; deletedCount: number }> {
    try {
      console.log('🗑️ Deleting folder:', folderPath, 'for user:', userId);
      console.log('🗑️ Storage type - useLocalStorage:', this.useLocalStorage);
      
      if (this.useLocalStorage) {
        return this.deleteFolderLocal(folderPath, userId);
      } else {
        return this.deleteFolderS3(folderPath, userId);
      }
      
    } catch (error) {
      console.error('❌ Error deleting folder:', error);
      throw new BadRequestException('Error eliminando la carpeta');
    }
  }

  private async deleteFolderLocal(folderPath: string, userId: string): Promise<{ success: boolean; message: string; deletedCount: number }> {
    console.log('🗑️ Deleting folder locally:', folderPath);
    
    const userDir = this.getLocalUserDir(userId);
    const fullFolderPath = path.join(userDir, folderPath);
    
    console.log('🗑️ Full local folder path:', fullFolderPath);
    
    if (!fs.existsSync(fullFolderPath)) {
      console.log('⚠️ Local folder does not exist:', fullFolderPath);
      return {
        success: true,
        message: 'Carpeta eliminada exitosamente (no existía)',
        deletedCount: 0
      };
    }
    
    // Count files before deletion
    let deletedCount = 0;
    
    const countFiles = (dir: string): number => {
      let count = 0;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          count++;
        } else if (stat.isDirectory()) {
          count += countFiles(fullPath);
        }
      }
      return count;
    };
    
    try {
      deletedCount = countFiles(fullFolderPath);
      
      // Remove directory and all contents
      fs.rmSync(fullFolderPath, { recursive: true, force: true });
      console.log('✅ Local folder deleted successfully');
      
      return {
        success: true,
        message: 'Carpeta eliminada exitosamente',
        deletedCount
      };
    } catch (error) {
      console.error('❌ Error deleting local folder:', error);
      throw new BadRequestException('Error eliminando la carpeta local');
    }
  }

  private async deleteFolderS3(folderPath: string, userId: string): Promise<{ success: boolean; message: string; deletedCount: number }> {
    console.log('🗑️ Deleting folder in S3:', folderPath);
    
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
  }
}