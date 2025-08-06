// chatRequest.dto.ts - Chat request data transfer object
import { IsString, IsUUID, MinLength, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class ChatRequestDto {
  @IsString()
  @MinLength(1)
  prompt: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  @IsBoolean()
  useWebSearch?: boolean;
}

// Legacy DTO for backward compatibility
export class ProsConsDiscusserDto extends ChatRequestDto {
  @IsOptional()
  @IsString()
  focus?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedLibraries?: string[];
}