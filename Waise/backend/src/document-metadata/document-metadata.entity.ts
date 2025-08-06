import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type DocumentType = 'contract' | 'invoice' | 'legal_brief' | 'evidence' | 'court_document' | 'other';

@Entity('document_metadata')
export class DocumentMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Identificación básica
  @Column()
  filename: string;

  @Column()
  originalPath: string;

  @Column({ nullable: true })
  s3Key?: string; // Clave en AWS S3

  @Column({ nullable: true })
  s3Bucket?: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column()
  mimeType: string;

  @Column()
  userId: string; // ID del usuario de Auth0

  // OCR y procesamiento
  @Column({ type: 'text', nullable: true })
  extractedText: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  ocrConfidence: number;

  @Column({ default: 0 })
  pageCount: number;

  @Column({ default: false })
  isProcessed: boolean;

  // Clasificación automática
  @Column({ 
    type: 'enum', 
    enum: ['contract', 'invoice', 'legal_brief', 'evidence', 'court_document', 'other'],
    default: 'other'
  })
  documentType: DocumentType;

  @Column({ nullable: true })
  category: string;

  // Datos extraídos (JSON para flexibilidad)
  @Column({ type: 'json', nullable: true })
  extractedFields: {
    parties?: string[];           // Partes del contrato
    dates?: string[];             // Fechas relevantes (como strings ISO)
    amounts?: number[];           // Montos
    addresses?: string[];         // Direcciones
    emails?: string[];            // Correos
    phones?: string[];            // Teléfonos
    caseNumber?: string;          // Número de causa
    courtName?: string;           // Tribunal
    [key: string]: any;           // Otros campos dinámicos
  };

  // Para templates y RAG
  @Column({ type: 'json', nullable: true })
  applicableTemplates: string[]; // Qué plantillas puede usar este documento

  @Column({ default: false })
  isSelectedForTemplate: boolean; // Para UI de selección

  // Vector embeddings
  @Column({ nullable: true })
  vectorId?: string;              // ID principal en Pinecone

  @Column({ type: 'json', nullable: true })
  chunkIds: string[];           // IDs de chunks si se divide

  // Status y procesamiento
  @Column({ default: 'uploaded' })
  status: string;               // 'uploaded', 'processing', 'completed', 'error'

  @Column({ type: 'text', nullable: true })
  errorMessage: string;         // En caso de errores

  @Column({ type: 'json', nullable: true })
  processingMetadata: {
    ocrProcessingTime?: number;
    embeddingProcessingTime?: number;
    vectorProcessingTime?: number;
    classificationProcessingTime?: number;
    totalProcessingTime?: number;
  };

  @CreateDateColumn()
  uploadDate: Date;

  @UpdateDateColumn()
  lastModified: Date;
}