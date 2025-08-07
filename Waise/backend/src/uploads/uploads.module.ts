import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { OcrModule } from '../ocr/ocr.module';
import { VectorModule } from '../vector/vector.module';

@Module({
  imports: [OcrModule, VectorModule],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}