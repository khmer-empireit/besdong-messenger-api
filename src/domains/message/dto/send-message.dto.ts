import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType, AttachmentType } from '../../../shared/enums';

export class AttachmentInputDto {
  @ApiProperty({ example: 'https://cdn.example.com/attachments/file.jpg' })
  @IsString()
  url: string;

  @ApiProperty({ example: 'attachments/uuid/file.jpg' })
  @IsString()
  key: string;

  @ApiProperty({ enum: AttachmentType })
  @IsEnum(AttachmentType)
  type: AttachmentType;

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
  @ApiPropertyOptional({ enum: MessageType, default: MessageType.Text })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType = MessageType.Text;

  @ApiPropertyOptional({ example: 'Hello!' })
  @ValidateIf((o) => o.type === MessageType.Text || o.type === undefined)
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
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: 'reply_to_id must be a valid UUID' })
  reply_to_id?: string;
}
