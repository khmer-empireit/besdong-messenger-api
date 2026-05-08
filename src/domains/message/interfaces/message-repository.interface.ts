import { Message } from '../entities/message.entity';

export interface IMessageRepository {
  create(data: { conversation_id: string; sender_id: string; content: string; reply_to_id?: string }): Promise<Message>;
  findById(id: string): Promise<Message | undefined>;
  list(conversationId: string, cursor?: string, limit?: number): Promise<Message[]>;
  update(id: string, data: { content: string; is_edited: boolean; edited_at: Date }): Promise<Message>;
  softDelete(id: string): Promise<void>;
  updateLastRead(conversationId: string, userId: string): Promise<void>;
}
