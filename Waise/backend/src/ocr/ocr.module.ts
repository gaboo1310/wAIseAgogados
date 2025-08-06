import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { OcrController } from './ocr.controller';

@Module({
  providers: [OcrService],
  controllers: [OcrController],
  exports: [OcrService], // Para usar en otros módulos
})
export class OcrModule {}