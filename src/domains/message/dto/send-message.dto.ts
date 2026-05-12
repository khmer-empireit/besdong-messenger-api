import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttachmentInputDto {
  @ApiProperty({ example: 'https://cdn.example.com/attachments/file.jpg' })
  @IsString()
  url: string;

  @ApiProperty({ example: 'attachments/uuid/file.jpg' })
  @IsString()
  key: string;

  @ApiProperty({ enum: ['image', 'file', 'audio', 'video'] })
  @IsIn(['image', 'file', 'audio', 'video'])
  type: 'image' | 'file' | 'audio' | 'video';

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mime_type: string;

  @ApiProperty({ example: 204800 })
  @IsInt()
  @Min(1)
  size: number;

  @ApiPropertyOptional({ example: 1920 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ example: 1080 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 'document.pdf' })
  @IsOptional()
  @IsString()
  file_name?: string;
}

export class SendMessageDto {
  @ApiPropertyOptional({ enum: ['text', 'image', 'file', 'audio'], default: 'text' })
  @IsOptional()
  @IsEnum(['text', 'image', 'file', 'audio'])
  type?: 'text' | 'image' | 'file' | 'audio' = 'text';

  @ApiPropertyOptional({ example: 'Hello!' })
  @ValidateIf((o) => o.type === 'text' || o.type === undefined)
  @IsString()
  @MinLength(1)
  content?: string;

  @ApiPropertyOptional({ type: [AttachmentInputDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AttachmentInputDto)
  attachments?: AttachmentInputDto[];

  @ApiPropertyOptional({ example: 'message-uuid' })
  @IsOptional()
  @IsUUID('4')
  reply_to_id?: string;
}
