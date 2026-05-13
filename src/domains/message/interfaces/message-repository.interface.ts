import { Message, MessageAttachment } from '../entities/message.entity';
import { AttachmentInputDto } from '../dto/send-message.dto';

export interface IMessageRepository {
  create(data: {
    conversation_id: string;
    sender_id: string;
    content: string;
    type: string;
    reply_to_id?: string;
    attachments?: AttachmentInputDto[];
  }): Promise<Message>;
  findById(id: string): Promise<Message | undefined>;
  list(conversationId: string, cursor?: string, userId?: string, limit?: number): Promise<Message[]>;
  update(id: string, data: { content: string; is_edited: boolean; edited_at: Date }): Promise<Message>;
  softDelete(id: string): Promise<void>;
  updateLastRead(conversationId: string, userId: string): Promise<void>;
}
