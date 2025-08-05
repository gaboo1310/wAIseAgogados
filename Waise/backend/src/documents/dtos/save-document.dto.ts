import { IsOptional, IsString } from 'class-validator';

export class SaveDocumentDto {
  @IsOptional()
  @IsString()
  id?: string; // Para actualizaciones

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  templateName?: string;
}