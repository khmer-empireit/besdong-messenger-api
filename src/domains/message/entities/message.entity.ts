import { MessageType, AttachmentType } from '../../../shared/enums';

export { MessageType, AttachmentType };

export interface MessageAttachment {
  id: string;
  message_id: string;
  url: string;
  key: string;
  type: AttachmentType;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  file_name: string | null;
  created_at: Date;
}

export interface ReplyToMessage {
  id: string;
  sender_id: string | null;
  sender_username: string | null;
  sender_display_name: string | null;
  content: string;
  type: MessageType;
}

export interface ForwardedFromMessage {
  id: string;
  sender_id: string | null;
  sender_username: string | null;
  sender_display_name: string | null;
  content: string;
  type: MessageType;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  type: MessageType;
  reply_to_id: string | null;
  reply_to?: ReplyToMessage | null;
  forwarded_from_id: string | null;
  forwarded_from?: ForwardedFromMessage | null;
  is_edited: boolean;
  edited_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  attachments?: MessageAttachment[];
  reactions?: ReactionSummary[];
}
