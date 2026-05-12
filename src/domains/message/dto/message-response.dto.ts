import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AttachmentData {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ enum: ['image', 'file', 'audio', 'video'] })
  type: string;

  @ApiProperty({ example: 'https://cdn.example.com/attachments/file.jpg' })
  url: string;

  @ApiProperty({ example: 'attachments/uuid/file.jpg' })
  key: string;

  @ApiProperty({ example: 'image/jpeg' })
  mime_type: string;

  @ApiProperty({ example: 204800 })
  size: number;

  @ApiPropertyOptional({ example: 1920, nullable: true })
  width: number | null;

  @ApiPropertyOptional({ example: 1080, nullable: true })
  height: number | null;

  @ApiPropertyOptional({ example: 'document.pdf', nullable: true })
  file_name: string | null;

  @ApiProperty()
  created_at: Date;
}

class MessageData {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  conversation_id: string;

  @ApiProperty({ example: 'uuid', nullable: true })
  sender_id: string | null;

  @ApiProperty({ example: 'Hello!' })
  content: string;

  @ApiProperty({ enum: ['text', 'image', 'file', 'audio', 'call_log', 'system'], example: 'text' })
  type: string;

  @ApiProperty({ example: null, nullable: true })
  reply_to_id: string | null;

  @ApiProperty({ example: false })
  is_edited: boolean;

  @ApiProperty({ nullable: true })
  edited_at: Date | null;

  @ApiProperty({ nullable: true })
  deleted_at: Date | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty({ type: [AttachmentData] })
  attachments: AttachmentData[];
}

class MessageActionData {
  @ApiProperty({ example: 'Message deleted' })
  message: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MessageData })
  data: MessageData;
}

export class MessageListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [MessageData] })
  data: MessageData[];
}

export class MessageActionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MessageActionData })
  data: MessageActionData;
}
