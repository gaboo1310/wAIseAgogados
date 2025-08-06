import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentMetadata } from './document-metadata.entity';
import { DocumentMetadataService } from './document-metadata.service';
import { DocumentMetadataController } from './document-metadata.controller';
import { OcrModule } from '../ocr/ocr.module';
import { VectorModule } from '../vector/vector.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentMetadata]),
    OcrModule,
    VectorModule,
  ],
  providers: [DocumentMetadataService],
  controllers: [DocumentMetadataController],
  exports: [DocumentMetadataService],
})
export class DocumentMetadataModule {}