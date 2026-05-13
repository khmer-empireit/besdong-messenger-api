import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType, AttachmentType } from '../../../shared/enums';

class AttachmentData {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ enum: AttachmentType })
  type: AttachmentType;

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

class ReplyToData {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid', nullable: true })
  sender_id: string | null;

  @ApiProperty({ example: 'dara_meas', nullable: true })
  sender_username: string | null;

  @ApiProperty({ example: 'Dara Meas', nullable: true })
  sender_display_name: string | null;

  @ApiProperty({ example: 'Hello!' })
  content: string;

  @ApiProperty({ enum: MessageType })
  type: MessageType;
}

class ReactionData {
  @ApiProperty({ example: '👍' })
  emoji: string;

  @ApiProperty({ example: 3 })
  count: number;

  @ApiProperty({ example: true })
  reacted_by_me: boolean;
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

  @ApiProperty({ enum: MessageType, example: MessageType.Text })
  type: MessageType;

  @ApiProperty({ example: null, nullable: true })
  reply_to_id: string | null;

  @ApiPropertyOptional({ type: ReplyToData, nullable: true })
  reply_to: ReplyToData | null;

  @ApiProperty({ example: null, nullable: true })
  forwarded_from_id: string | null;

  @ApiPropertyOptional({ type: ReplyToData, nullable: true })
  forwarded_from: ReplyToData | null;

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

  @ApiProperty({ type: [ReactionData] })
  reactions: ReactionData[];
}

class MessageActionData {
  @ApiProperty({ example: 'Success' })
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
