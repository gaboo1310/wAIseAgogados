// import { IsString} from "class-validator";

// export class ProsConsDiscusserDto {

//     @IsString()
//     readonly prompt: string;
    
//   }

import { IsBoolean, IsOptional, IsString, IsUUID, MinLength, IsArray } from 'class-validator';

export class ProsConsDiscusserDto {
  @IsString()
  @MinLength(1)
  prompt: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  @IsBoolean()
  useWebSearch?: boolean;  // 👈 nuevo campo opcional

  @IsOptional()
  @IsArray()
  selectedLibraries?: string[]; // <-- nuevo campo opcional

  @IsOptional()
  @IsString()
  focus?: string;
}