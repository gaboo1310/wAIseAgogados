import { 
  Controller, 
  Post, 
  Get, 
  Delete,
  Body, 
  Query, 
  Param, 
  UseGuards, 
  Req, 
  UseInterceptors, 
  UploadedFile,
  BadRequestException,
  Res
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { UploadsService, FileItem } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('test')
  testUploads() {
    console.log('🧪 Uploads test endpoint called');
    return {
      success: true,
      message: 'Uploads module is working ✅',
      timestamp: new Date().toISOString()
    };
  }

  @Get('test-aws')
  async testAWS() {
    console.log('🧪 AWS test endpoint called');
    return await this.uploadsService.testConnection();
  }

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('path') path: string = '',
    @Req() req: any
  ) {
    console.log('📤 Upload file called');
    console.log('File:', file?.originalname);
    console.log('Path:', path);
    
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Extraer userId de Auth0
    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId && req.user) {
      const userKeys = Object.keys(req.user);
      userId = req.user[userKeys[0]] || 'auth0-user-default';
    }

    console.log('Upload userId:', userId);
    
    return await this.uploadsService.uploadFile(file, path, userId);
  }

  @Post('create-folder')
  @UseGuards(AuthGuard('jwt'))
  async createFolder(
    @Body() body: { folderName: string; path: string },
    @Req() req: any
  ) {
    console.log('📁 Create folder called');
    console.log('Folder name:', body.folderName);
    console.log('Path:', body.path);

    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId && req.user) {
      const userKeys = Object.keys(req.user);
      userId = req.user[userKeys[0]] || 'auth0-user-default';
    }

    return await this.uploadsService.createFolder(body.folderName, body.path, userId);
  }

  @Post('move')
  @UseGuards(AuthGuard('jwt'))
  async moveFile(
    @Body() body: { sourcePath: string; targetPath: string; fileName: string },
    @Req() req: any
  ) {
    console.log('🎯 Move file called');
    console.log('Source path:', body.sourcePath);
    console.log('Target path:', body.targetPath);
    console.log('File name:', body.fileName);

    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId && req.user) {
      const userKeys = Object.keys(req.user);
      userId = req.user[userKeys[0]] || 'auth0-user-default';
    }

    return await this.uploadsService.moveFile(body.sourcePath, body.targetPath, body.fileName, userId);
  }

  @Get('list')
  @UseGuards(AuthGuard('jwt'))
  async listFiles(
    @Query('path') path: string = '',
    @Req() req: any
  ) {
    console.log('📋 List files called');
    console.log('Path:', path);

    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId && req.user) {
      const userKeys = Object.keys(req.user);
      userId = req.user[userKeys[0]] || 'auth0-user-default';
    }

    console.log('List userId:', userId);
    
    return await this.uploadsService.listFiles(path, userId);
  }

  @Get('download/*path')
  @UseGuards(AuthGuard('jwt'))
  async downloadFile(
    @Param('path') filePath: string,
    @Req() req: any,
    @Res() res: Response
  ) {
    console.log('📥 Download file called');
    console.log('File path:', filePath);
    console.log('File path type:', typeof filePath);

    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId && req.user) {
      const userKeys = Object.keys(req.user);
      userId = req.user[userKeys[0]] || 'auth0-user-default';
    }

    // Ensure filePath is a string
    const filePathStr = String(filePath);
    const fileStream = await this.uploadsService.downloadFile(filePathStr, userId);
    
    // Set headers for file download
    const fileName = filePathStr.split('/').pop() || 'download';
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    fileStream.pipe(res);
  }

  @Get('view/*path')
  @UseGuards(AuthGuard('jwt'))
  async viewFile(
    @Param('path') filePath: string,
    @Req() req: any,
    @Res() res: Response
  ) {
    console.log('👁️ View file called');
    console.log('File path:', filePath);

    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId && req.user) {
      const userKeys = Object.keys(req.user);
      userId = req.user[userKeys[0]] || 'auth0-user-default';
    }

    // Ensure filePath is a string
    const filePathStr = String(filePath);
    const fileStream = await this.uploadsService.downloadFile(filePathStr, userId);
    
    // Get file extension to determine content type
    const fileExtension = filePathStr.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    // Set appropriate content type for inline viewing
    switch (fileExtension) {
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'txt':
        contentType = 'text/plain';
        break;
      case 'html':
        contentType = 'text/html';
        break;
      case 'json':
        contentType = 'application/json';
        break;
      case 'xml':
        contentType = 'application/xml';
        break;
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'svg':
        contentType = 'image/svg+xml';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'mp4':
        contentType = 'video/mp4';
        break;
      case 'mp3':
        contentType = 'audio/mpeg';
        break;
      case 'wav':
        contentType = 'audio/wav';
        break;
      case 'css':
        contentType = 'text/css';
        break;
      case 'js':
        contentType = 'application/javascript';
        break;
      case 'md':
        contentType = 'text/markdown';
        break;
      default:
        contentType = 'application/octet-stream';
    }
    
    // Set headers for inline viewing (not download)
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    
    // Add CORS headers if needed
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    fileStream.pipe(res);
  }

  @Delete('delete/*path')
  @UseGuards(AuthGuard('jwt'))
  async deleteFile(
    @Param('path') filePath: string,
    @Req() req: any
  ) {
    console.log('🗑️ Delete file called');
    console.log('File path:', filePath);

    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId && req.user) {
      const userKeys = Object.keys(req.user);
      userId = req.user[userKeys[0]] || 'auth0-user-default';
    }

    // Ensure filePath is a string
    const filePathStr = String(filePath);
    return await this.uploadsService.deleteFile(filePathStr, userId);
  }

  @Get('signed-url/*path')
  @UseGuards(AuthGuard('jwt'))
  async getSignedUrl(
    @Param('path') filePath: string,
    @Req() req: any
  ) {
    console.log('🔗 Get signed URL called');
    console.log('File path:', filePath);

    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId && req.user) {
      const userKeys = Object.keys(req.user);
      userId = req.user[userKeys[0]] || 'auth0-user-default';
    }

    // Ensure filePath is a string
    const filePathStr = String(filePath);
    return await this.uploadsService.getSignedUrl(filePathStr, userId);
  }

  @Delete('delete-folder/*path')
  @UseGuards(AuthGuard('jwt'))
  async deleteFolder(
    @Param('path') folderPath: string,
    @Req() req: any
  ) {
    console.log('🗑️ Delete folder called');
    console.log('Folder path:', folderPath);

    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId && req.user) {
      const userKeys = Object.keys(req.user);
      userId = req.user[userKeys[0]] || 'auth0-user-default';
    }

    // Ensure folderPath is a string
    const folderPathStr = String(folderPath);
    return await this.uploadsService.deleteFolder(folderPathStr, userId);
  }
}