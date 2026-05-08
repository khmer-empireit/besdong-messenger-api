import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { IMessageRepository } from './interfaces/message-repository.interface';
import { Message } from './entities/message.entity';

const DEFAULT_LIMIT = 30;

@Injectable()
export class MessageRepository implements IMessageRepository {
  constructor(private db: DbService) {}

  async create(data: {
    conversation_id: string;
    sender_id: string;
    content: string;
    reply_to_id?: string;
  }): Promise<Message> {
    const [msg] = await this.db.knex('messages').insert(data).returning('*');
    return msg as Message;
  }

  async findById(id: string): Promise<Message | undefined> {
    return this.db.knex('messages').where({ id }).first() as Promise<Message | undefined>;
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

    return query as Promise<Message[]>;
  }

  async update(
    id: string,
    data: { content: string; is_edited: boolean; edited_at: Date },
  ): Promise<Message> {
    const [msg] = await this.db.knex('messages').where({ id }).update(data).returning('*');
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
