import { 
  Controller, 
  Post, 
  UploadedFile, 
  UseInterceptors, 
  BadRequestException,
  Get,
  UseGuards,
  Param,
  Req 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AuthGuard } from '@nestjs/passport';
import { OcrService } from './ocr.service';
import * as fs from 'fs';

@Controller('ocr')
@UseGuards(AuthGuard('jwt'))
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Get('test')
  async testConnection() {
    const isConnected = await this.ocrService.testConnection();
    return {
      status: isConnected ? 'connected' : 'failed',
      message: isConnected 
        ? 'Mistral OCR service is working correctly' 
        : 'Failed to connect to Mistral API'
    };
  }

  @Get('debug')
  async debugOCR() {
    return {
      success: true,
      message: 'OCR service debug info - using direct PDF processing',
      details: {
        mistralApiKey: !!process.env.MISTRAL_API_KEY,
        mistralModel: process.env.MISTRAL_MODEL,
        nodeVersion: process.version,
        platform: process.platform,
        pdfProcessingMode: 'direct_to_mistral'
      }
    };
  }

  @Post('extract')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `ocr-${uniqueSuffix}${extname(file.originalname)}`);
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
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
    }),
  )
  async extractText(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    console.log(`[OCR Controller] Processing file: ${file.originalname}`);
    console.log(`[OCR Controller] File path: ${file.path}`);

    try {
      // Crear directorio de uploads/temp si no existe
      const tempDir = './uploads/temp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const result = await this.ocrService.extractTextFromPdf(file.path);

      // Limpiar archivo temporal
      try {
        fs.unlinkSync(file.path);
        console.log(`[OCR Controller] Cleaned up temporary file: ${file.path}`);
      } catch (cleanupError) {
        console.warn(`[OCR Controller] Failed to cleanup file ${file.path}:`, cleanupError);
      }

      return {
        filename: file.originalname,
        fileSize: file.size,
        ...result
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

      console.error('[OCR Controller] Error processing file:', error);
      throw new BadRequestException(`OCR processing failed: ${error.message}`);
    }
  }

  @Get('stats')
  async getOCRStats() {
    console.log('[OCR Controller] Getting OCR statistics');
    
    try {
      // Esta es una implementación básica - en producción podrías
      // conectar con una base de datos o servicio de estadísticas real
      const stats = {
        totalDocuments: 0,
        processedDocuments: 0,
        pendingDocuments: 0,
        averageConfidence: 0,
        totalVectors: 0,
        storageUsed: '0 MB'
      };

      return {
        success: true,
        ...stats,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('[OCR Controller] Error getting stats:', error);
      return {
        success: false,
        error: error.message,
        totalDocuments: 0,
        processedDocuments: 0,
        pendingDocuments: 0,
        averageConfidence: 0,
        totalVectors: 0,
        storageUsed: '0 MB'
      };
    }
  }

  @Get('get-text/*path')
  async getTextFromFile(
    @Param('path') filePath: string,
    @Req() req: any
  ) {
    console.log('📄 Get OCR text from file:', filePath);
    
    let userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId && req.user) {
      const userKeys = Object.keys(req.user);
      userId = req.user[userKeys[0]] || 'auth0-user-default';
    }

    try {
      // Por ahora, simulamos que tenemos texto OCR guardado
      // En el futuro, esto debería buscar en una base de datos o cache
      const mockText = `Texto extraído del archivo ${filePath}. 
      
      Este es contenido simulado para demostrar la funcionalidad.
      En una implementación real, este texto vendría de:
      1. Una base de datos donde se almacena el OCR de cada archivo
      2. Un cache en memoria 
      3. Reprocesamiento del archivo si es necesario
      
      Información del archivo:
      - Ruta: ${filePath}
      - Usuario: ${userId}
      - Fecha de consulta: ${new Date().toISOString()}`;

      return {
        success: true,
        text: mockText,
        filePath: filePath,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting OCR text:', error);
      throw new BadRequestException('Error obteniendo el texto del archivo');
    }
  }
}