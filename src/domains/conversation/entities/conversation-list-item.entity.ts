import { ConversationType } from '../../../shared/enums';

export interface ConversationParticipantPreview {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface ConversationLastMessage {
  id: string;
  sender_id: string | null;
  sender_name: string | null;
  message: string;
  type: string;
  attachments: { url: string; type: string }[];
  is_edited: boolean;
  is_deleted: boolean;
  created_at: Date;
  status: 'seen' | 'delivered';
}

export interface ConversationListItem {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar_url: string | null;
  description: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  is_online: boolean;
  is_muted: boolean;
  is_pinned: boolean;
  unread_count: number;
  last_read_at: Date | null;
  last_message: ConversationLastMessage | null;
  participants_count: number;
  participants: ConversationParticipantPreview[];
}
