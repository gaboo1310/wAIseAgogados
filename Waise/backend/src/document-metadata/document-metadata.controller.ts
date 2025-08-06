import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
  BadRequestException,
  NotFoundException,
  Patch,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from '@nestjs/passport';
import { DocumentMetadataService } from './document-metadata.service';
import { DocumentType } from './document-metadata.entity';
import { extractUserId } from '../common/auth.helper';
import * as fs from 'fs';

interface RequestWithUser extends Request {
  user: {
    sub?: string;
    userId: string;
    [key: string]: any;
  };
}

@Controller('document-metadata')
@UseGuards(AuthGuard('jwt'))
export class DocumentMetadataController {
  constructor(private readonly documentMetadataService: DocumentMetadataService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/documents',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `doc-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF and image files are allowed'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = extractUserId(req.user);
    
    try {
      // Crear directorio si no existe
      const uploadDir = './uploads/documents';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Leer archivo para S3
      const fileBuffer = fs.readFileSync(file.path);

      const document = await this.documentMetadataService.createDocument({
        filename: file.originalname,
        originalPath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        userId,
        fileBuffer,
      });

      // Limpiar archivo temporal después de procesamiento
      setTimeout(() => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (error) {
          console.warn(`Failed to cleanup temporary file ${file.path}:`, error);
        }
      }, 30000); // 30 segundos para que OCR termine

      return {
        success: true,
        document: {
          id: document.id,
          filename: document.filename,
          fileSize: document.fileSize,
          status: document.status,
          uploadDate: document.uploadDate,
        },
        message: 'Document uploaded successfully and is being processed',
      };

    } catch (error) {
      // Limpiar archivo temporal en caso de error
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch {
        // Ignore cleanup errors
      }

      console.error('[DocumentMetadataController] Upload error:', error);
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  @Get('my-documents')
  async getMyDocuments(@Req() req: RequestWithUser) {
    const userId = extractUserId(req.user);
    const documents = await this.documentMetadataService.findDocumentsByUser(userId);
    
    return {
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        documentType: doc.documentType,
        status: doc.status,
        isProcessed: doc.isProcessed,
        ocrConfidence: doc.ocrConfidence,
        pageCount: doc.pageCount,
        fileSize: doc.fileSize,
        uploadDate: doc.uploadDate,
        applicableTemplates: doc.applicableTemplates,
        isSelectedForTemplate: doc.isSelectedForTemplate,
        extractedFields: doc.extractedFields,
      })),
      totalCount: documents.length,
    };
  }

  @Get('search')
  async searchDocuments(
    @Query('q') query: string,
    @Req() req: RequestWithUser,
  ) {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters long');
    }

    const userId = extractUserId(req.user);
    const documents = await this.documentMetadataService.searchDocuments(userId, query);
    
    return {
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        documentType: doc.documentType,
        status: doc.status,
        uploadDate: doc.uploadDate,
        // Snippet del texto extraído que coincide
        textSnippet: this.getTextSnippet(doc.extractedText, query),
      })),
      query,
      totalFound: documents.length,
    };
  }

  @Get('by-type/:type')
  async getDocumentsByType(
    @Param('type') type: string,
    @Req() req: RequestWithUser,
  ) {
    const validTypes: DocumentType[] = ['contract', 'invoice', 'legal_brief', 'evidence', 'court_document', 'other'];
    
    if (!validTypes.includes(type as DocumentType)) {
      throw new BadRequestException(`Invalid document type. Valid types: ${validTypes.join(', ')}`);
    }

    const userId = extractUserId(req.user);
    const documents = await this.documentMetadataService.getDocumentsByType(userId, type as DocumentType);
    
    return {
      success: true,
      documentType: type,
      documents,
      totalCount: documents.length,
    };
  }

  @Get('stats')
  async getProcessingStats(@Req() req: RequestWithUser) {
    const userId = extractUserId(req.user);
    const stats = await this.documentMetadataService.getProcessingStats(userId);
    
    return {
      success: true,
      stats,
    };
  }

  @Get('selected')
  async getSelectedDocuments(@Req() req: RequestWithUser) {
    const userId = extractUserId(req.user);
    const documents = await this.documentMetadataService.getSelectedDocuments(userId);
    
    return {
      success: true,
      selectedDocuments: documents,
      totalSelected: documents.length,
    };
  }

  @Get(':id')
  async getDocument(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const document = await this.documentMetadataService.findDocumentById(id);
    
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Verificar que el documento pertenece al usuario
    if (document.userId !== extractUserId(req.user)) {
      throw new NotFoundException('Document not found');
    }

    return {
      success: true,
      document,
    };
  }

  @Patch(':id/select')
  async toggleDocumentSelection(
    @Param('id') id: string,
    @Body() body: { isSelected: boolean },
    @Req() req: RequestWithUser,
  ) {
    const userId = extractUserId(req.user);
    const success = await this.documentMetadataService.updateDocumentSelection(
      id,
      userId,
      body.isSelected,
    );

    if (!success) {
      throw new NotFoundException('Document not found or access denied');
    }

    return {
      success: true,
      message: body.isSelected ? 'Document selected for template' : 'Document unselected',
    };
  }

  @Delete(':id')
  async deleteDocument(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = extractUserId(req.user);
    const success = await this.documentMetadataService.deleteDocument(id, userId);

    if (!success) {
      throw new NotFoundException('Document not found or could not be deleted');
    }

    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }

  private getTextSnippet(text: string, query: string): string {
    if (!text) return '';
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    
    if (index === -1) return text.substring(0, 200) + '...';
    
    const start = Math.max(0, index - 100);
    const end = Math.min(text.length, index + query.length + 100);
    
    return (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
  }
}