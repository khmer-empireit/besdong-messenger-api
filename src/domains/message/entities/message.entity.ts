export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  type: 'text';
  reply_to_id: string | null;
  is_edited: boolean;
  edited_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
}
