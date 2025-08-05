import { Body, Controller, Get, Post, Delete, Param, UseGuards, Req, BadRequestException, UsePipes, ValidationPipe, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DocumentsService } from './documents.service';
import { SaveDocumentDto, GetDocumentsDto, SavedDocumentDto } from './dtos';
import { RequestWithUser } from '../auth/interfaces/request-with-user';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('save')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
  async saveDocument(
    @Body() saveDocumentDto: SaveDocumentDto,
    @Req() req: any // Usar any para debugging
  ) {
    console.log('🎯 Documents Controller - Save called');
    console.log('Request body:', saveDocumentDto);
    console.log('Full request user:', JSON.stringify(req.user, null, 2));
    
    // Intentar extraer userId de diferentes formas
    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    
    if (!userId && req.user) {
      // Si no encontramos userId, usar el primer valor que encontremos
      const userKeys = Object.keys(req.user);
      console.log('Available user keys:', userKeys);
      userId = req.user[userKeys[0]] || 'auth0-user-' + Date.now();
    }
    
    console.log('Final userId:', userId);
    
    if (!userId) {
      console.error('❌ No userId found in request');
      throw new BadRequestException('User ID not found in request');
    }
    
    return await this.documentsService.saveDocument(saveDocumentDto, userId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getDocuments(
    @Req() req: any
  ) {
    console.log('📋 Documents Controller - List called');
    console.log('Full request user:', JSON.stringify(req.user, null, 2));
    
    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    
    if (!userId && req.user) {
      const userKeys = Object.keys(req.user);
      console.log('Available user keys:', userKeys);
      userId = req.user[userKeys[0]] || 'auth0-user-default';
    }
    
    console.log('Final userId for list:', userId);
    return await this.documentsService.getDocuments(userId);
  }

  @Get(':documentId')
  @UseGuards(AuthGuard('jwt'))
  async getDocument(
    @Param('documentId') documentId: string,
    @Req() req: any
  ): Promise<SavedDocumentDto> {
    console.log('📄 Documents Controller - Get called for:', documentId);
    
    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    
    if (!userId && req.user) {
      const userKeys = Object.keys(req.user);
      userId = req.user[userKeys[0]] || 'auth0-user-default';
    }
    
    console.log('Final userId for get:', userId);
    return await this.documentsService.getDocument(documentId, userId);
  }

  @Delete(':documentId')
  @UseGuards(AuthGuard('jwt'))
  async deleteDocument(
    @Param('documentId') documentId: string,
    @Req() req: RequestWithUser
  ) {
    const userId = req.user?.userId;
    return await this.documentsService.deleteDocument(documentId, userId);
  }

  @Get('test/s3')
  async testS3Connection() {
    console.log('🧪 Testing S3 connection...');
    return await this.documentsService.testS3Connection();
  }

  @Get('test/auth')
  @UseGuards(AuthGuard('jwt'))
  async testAuthToken(@Req() req: RequestWithUser) {
    console.log('🔐 Testing Auth0 token validation...');
    console.log('Full request user object:', JSON.stringify(req.user, null, 2));
    console.log('Headers:', req.headers.authorization);
    
    return {
      success: true,
      message: 'Auth0 token validation passed ✅',
      user: req.user,
      hasUserId: !!req.user?.userId,
      hasEmail: !!req.user?.email,
      fullUserObject: req.user
    };
  }

  @Post('save-simple')
  async saveDocumentSimple(@Body() body: any) {
    console.log('💾 Simple save called with body:', body);
    
    try {
      // Usar un userId por defecto para testing
      const userId = body.userId || 'test-user-' + Date.now();
      const saveDocumentDto = {
        id: body.id,
        title: body.title || 'Documento sin título',
        content: body.content || '',
        templateId: body.templateId,
        templateName: body.templateName
      };
      
      console.log('Calling service with userId:', userId);
      const result = await this.documentsService.saveDocument(saveDocumentDto, userId);
      console.log('Save result:', result);
      
      return result;
    } catch (error) {
      console.error('Simple save error:', error);
      throw new BadRequestException(`Error saving document: ${error.message}`);
    }
  }

  @Get('list-simple')
  async getDocumentsSimple() {
    console.log('📋 Simple list called');
    
    try {
      // Usar el mismo userId fijo que usamos para guardar
      const userId = 'test-user-fixed';
      console.log('Getting documents for userId:', userId);
      
      const result = await this.documentsService.getDocuments(userId);
      console.log('Documents found:', result.totalCount);
      
      return result;
    } catch (error) {
      console.error('Simple list error:', error);
      throw new BadRequestException(`Error getting documents: ${error.message}`);
    }
  }

  @Get('get-simple/:documentId')
  async getDocumentSimple(@Param('documentId') documentId: string) {
    console.log('📄 Simple get called for document:', documentId);
    
    try {
      const userId = 'test-user-fixed';
      const result = await this.documentsService.getDocument(documentId, userId);
      console.log('Document retrieved successfully');
      
      return result;
    } catch (error) {
      console.error('Simple get error:', error);
      throw new BadRequestException(`Error getting document: ${error.message}`);
    }
  }

  // TEMPORARY UPLOADS ENDPOINTS - Remove when uploads module works
  @Get('uploads-test')
  testUploadsFunctionality() {
    console.log('🧪 Temporary uploads test endpoint called');
    return {
      success: true,
      message: 'Uploads functionality test ✅',
      timestamp: new Date().toISOString()
    };
  }

  @Get('uploads-list')
  @UseGuards(AuthGuard('jwt'))
  async listUploads(@Query('path') path: string = '', @Req() req: any) {
    console.log('📋 Temporary uploads list called');
    console.log('Path:', path);

    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId && req.user) {
      const userKeys = Object.keys(req.user);
      userId = req.user[userKeys[0]] || 'auth0-user-default';
    }

    // Por ahora devolver lista vacía como placeholder
    return {
      files: [],
      currentPath: path,
      totalCount: 0
    };
  }
}