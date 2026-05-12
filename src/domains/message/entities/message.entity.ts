export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'call_log' | 'system';
export type AttachmentType = 'image' | 'file' | 'audio' | 'video';

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
  content: string;
  type: MessageType;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  type: MessageType;
  reply_to_id: string | null;
  reply_to?: ReplyToMessage | null;
  is_edited: boolean;
  edited_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  attachments?: MessageAttachment[];
}
