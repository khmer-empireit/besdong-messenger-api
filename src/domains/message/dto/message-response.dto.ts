import { ApiProperty } from '@nestjs/swagger';

class MessageData {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  conversation_id: string;

  @ApiProperty({ example: 'uuid', nullable: true })
  sender_id: string | null;

  @ApiProperty({ example: 'Hello!' })
  content: string;

  @ApiProperty({ enum: ['text'], example: 'text' })
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
