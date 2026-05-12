import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { IMessageRepository } from './interfaces/message-repository.interface';
import { Message } from './entities/message.entity';
import { AttachmentInputDto } from './dto/send-message.dto';

const DEFAULT_LIMIT = 30;

@Injectable()
export class MessageRepository implements IMessageRepository {
  constructor(private db: DbService) {}

  async create(data: {
    conversation_id: string;
    sender_id: string;
    content: string;
    type: string;
    reply_to_id?: string;
    attachments?: AttachmentInputDto[];
  }): Promise<Message> {
    const { attachments, ...msgData } = data;

    return this.db.knex.transaction(async (trx) => {
      const [msg] = await trx('messages').insert(msgData).returning('*');

      if (attachments && attachments.length > 0) {
        const rows = attachments.map((a) => ({
          message_id: msg.id,
          url: a.url,
          key: a.key,
          type: a.type,
          mime_type: a.mime_type,
          size: a.size,
          width: a.width ?? null,
          height: a.height ?? null,
          file_name: a.file_name ?? null,
        }));
        const inserted = await trx('message_attachments').insert(rows).returning('*');
        msg.attachments = inserted;
      } else {
        msg.attachments = [];
      }

      return msg as Message;
    });
  }

  async findById(id: string): Promise<Message | undefined> {
    const msg = await this.db.knex('messages').where({ id }).first();
    if (!msg) return undefined;
    msg.attachments = await this.db.knex('message_attachments').where({ message_id: id }).orderBy('created_at', 'asc');
    return msg as Message;
  }

  async list(conversationId: string, cursor?: string, limit = DEFAULT_LIMIT): Promise<Message[]> {
    let query = this.db
      .knex('messages')
      .where({ conversation_id: conversationId })
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (cursor) {
      const cursorMsg = await this.db.knex('messages').where({ id: cursor }).first();
      if (cursorMsg) {
        query = query.where('created_at', '<', cursorMsg.created_at);
      }
    }

    const messages = await query;

    if (messages.length === 0) return [];

    const messageIds = messages.map((m) => m.id);
    const attachments = await this.db
      .knex('message_attachments')
      .whereIn('message_id', messageIds)
      .orderBy('created_at', 'asc');

    const attachmentsByMessageId = attachments.reduce(
      (acc, a) => {
        if (!acc[a.message_id]) acc[a.message_id] = [];
        acc[a.message_id].push(a);
        return acc;
      },
      {} as Record<string, typeof attachments>,
    );

    return messages.map((m) => ({
      ...m,
      attachments: attachmentsByMessageId[m.id] ?? [],
    })) as Message[];
  }

  async update(
    id: string,
    data: { content: string; is_edited: boolean; edited_at: Date },
  ): Promise<Message> {
    const [msg] = await this.db.knex('messages').where({ id }).update(data).returning('*');
    msg.attachments = await this.db.knex('message_attachments').where({ message_id: id }).orderBy('created_at', 'asc');
    return msg as Message;
  }

  async softDelete(id: string): Promise<void> {
    await this.db.knex('messages').where({ id }).update({ deleted_at: new Date() });
  }

  async updateLastRead(conversationId: string, userId: string): Promise<void> {
    await this.db
      .knex('participants')
      .where({ conversation_id: conversationId, user_id: userId })
      .update({ last_read_at: new Date() });
  }
}
