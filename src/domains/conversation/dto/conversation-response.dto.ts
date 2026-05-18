import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationType, MessageType, ParticipantRole } from '../../../shared/enums';

class ParticipantData {
  @ApiProperty({ example: 'ebced2f7-e8a6-4bd9-9f96-5e6fb129a434' })
  conversation_id: string;

  @ApiProperty({ example: 'ebced2f7-e8a6-4bd9-9f96-5e6fb129a434' })
  user_id: string;

  @ApiProperty({ enum: ParticipantRole, example: ParticipantRole.Member })
  role: ParticipantRole;

  @ApiProperty()
  joined_at: Date;

  @ApiProperty({ nullable: true })
  muted_until: Date | null;

  @ApiProperty({ nullable: true })
  last_read_at: Date | null;

  @ApiProperty({ example: false })
  is_pinned: boolean;
}

// ─── Conversation list shape ──────────────────────────────────────────────────

class LastMessageAttachment {
  @ApiProperty({ example: 'https://cdn.example.com/file.jpg' })
  url: string;

  @ApiProperty({ example: 'image' })
  type: string;
}

class LastMessageData {
  @ApiProperty({ example: 'dd68cda2-a9de-436e-a2c6-da7f806c265f' })
  id: string;

  @ApiProperty({ example: 'ebced2f7-e8a6-4bd9-9f96-5e6fb129a434', nullable: true })
  sender_id: string | null;

  @ApiProperty({ example: 'Sokheng Updated', nullable: true })
  sender_name: string | null;

  @ApiProperty({ example: 'Hello!' })
  message: string;

  @ApiProperty({ enum: MessageType, example: MessageType.Text })
  type: string;

  @ApiProperty({ example: false })
  is_edited: boolean;

  @ApiProperty({ example: false })
  is_deleted: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty({ enum: ['seen', 'delivered'], example: 'delivered' })
  status: 'seen' | 'delivered';

  @ApiProperty({ type: [LastMessageAttachment] })
  attachments: LastMessageAttachment[];
}

class ParticipantPreview {
  @ApiProperty({ example: 'ebced2f7-e8a6-4bd9-9f96-5e6fb129a434' })
  id: string;

  @ApiProperty({ example: 'Sokheng Updated' })
  name: string;

  @ApiProperty({ example: 'https://cdn.example.com/avatar.webp', nullable: true })
  avatar_url: string | null;
}

class ConversationListItemData {
  @ApiProperty({ example: '9699b83b-6303-4c73-8af5-03a4b660e66e' })
  id: string;

  @ApiProperty({ enum: ConversationType, example: ConversationType.Direct })
  type: ConversationType;

  @ApiProperty({ example: null, nullable: true })
  name: string | null;

  @ApiProperty({ example: null, nullable: true })
  avatar_url: string | null;

  @ApiProperty({ example: null, nullable: true })
  description: string | null;

  @ApiProperty({ example: 'ebced2f7-e8a6-4bd9-9f96-5e6fb129a434', nullable: true })
  created_by: string | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty({ nullable: true })
  last_read_at: Date | null;

  @ApiProperty({ example: false })
  is_pinned: boolean;

  @ApiProperty({ example: false })
  is_muted: boolean;

  @ApiProperty({ example: false, description: 'Online status of the other user (direct conversations only)' })
  is_online: boolean;

  @ApiProperty({ example: 3 })
  unread_count: number;

  @ApiPropertyOptional({ type: LastMessageData, nullable: true })
  last_message: LastMessageData | null;

  @ApiProperty({ example: 2 })
  participants_count: number;

  @ApiProperty({ type: [ParticipantPreview], description: 'Up to 5 participants preview' })
  participants: ParticipantPreview[];
}

class PaginationData {
  @ApiProperty({ example: null, nullable: true, description: 'Pass as ?cursor= to fetch next page' })
  cursor: string | null;

  @ApiProperty({ example: false })
  has_more: boolean;

  @ApiProperty({ example: 20 })
  limit: number;
}

class ConversationListData {
  @ApiProperty({ type: [ConversationListItemData] })
  data: ConversationListItemData[];

  @ApiProperty({ type: PaginationData })
  pagination: PaginationData;
}

// ─── Single conversation shape ────────────────────────────────────────────────

class ConversationData {
  @ApiProperty({ example: '9699b83b-6303-4c73-8af5-03a4b660e66e' })
  id: string;

  @ApiProperty({ enum: ConversationType, example: ConversationType.Direct })
  type: ConversationType;

  @ApiProperty({ example: null, nullable: true })
  name: string | null;

  @ApiProperty({ example: null, nullable: true })
  avatar_url: string | null;

  @ApiProperty({ example: 'ebced2f7-e8a6-4bd9-9f96-5e6fb129a434', nullable: true })
  created_by: string | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

class ConversationDetailData extends ConversationData {
  @ApiProperty({ type: [ParticipantData] })
  participants: ParticipantData[];
}

class ConversationActionData {
  @ApiProperty({ example: 'Conversation pinned' })
  message: string;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export class ConversationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ConversationData })
  data: ConversationData;
}

export class ConversationDetailResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ConversationDetailData })
  data: ConversationDetailData;
}

export class ConversationListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ConversationListData })
  data: ConversationListData;
}

export class ConversationSearchResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [ConversationListItemData] })
  data: ConversationListItemData[];
}

export class ConversationActionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ConversationActionData })
  data: ConversationActionData;
}
