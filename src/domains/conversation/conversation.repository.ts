import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { IConversationRepository } from './interfaces/conversation-repository.interface';
import { Conversation } from './entities/conversation.entity';
import { Participant } from './entities/participant.entity';
import { ConversationType, ParticipantRole } from '../../shared/enums';

@Injectable()
export class ConversationRepository implements IConversationRepository {
  constructor(private db: DbService) {}

  async create(data: {
    type: ConversationType;
    name?: string;
    avatar_url?: string;
    created_by: string;
  }): Promise<Conversation> {
    const [conv] = await this.db.knex('conversations').insert(data).returning('*');
    return conv as Conversation;
  }

  async findById(id: string): Promise<Conversation | undefined> {
    return this.db.knex('conversations').where({ id }).first() as Promise<Conversation | undefined>;
  }

  async findDirectBetween(userA: string, userB: string): Promise<Conversation | undefined> {
    return this.db
      .knex('conversations as c')
      .join('participants as p1', function () {
        this.on('p1.conversation_id', 'c.id').andOnVal('p1.user_id', userA);
      })
      .join('participants as p2', function () {
        this.on('p2.conversation_id', 'c.id').andOnVal('p2.user_id', userB);
      })
      .where('c.type', ConversationType.Direct)
      .select('c.*')
      .first() as Promise<Conversation | undefined>;
  }

  async listForUser(userId: string): Promise<Conversation[]> {
    return this.db
      .knex('conversations as c')
      .join('participants as p', 'p.conversation_id', 'c.id')
      .where('p.user_id', userId)
      .select(
        'c.*',
        'p.last_read_at',
        this.db.knex.raw(`(
          SELECT COUNT(*)::int FROM messages m
          WHERE m.conversation_id = c.id
            AND m.deleted_at IS NULL
            AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)
        ) AS unread_count`),
      )
      .orderBy('c.updated_at', 'desc') as Promise<Conversation[]>;
  }

  async update(
    id: string,
    data: Partial<Pick<Conversation, 'name' | 'avatar_url' | 'updated_at'>>,
  ): Promise<Conversation> {
    const [conv] = await this.db.knex('conversations').where({ id }).update(data).returning('*');
    return conv as Conversation;
  }

  async addParticipant(data: {
    conversation_id: string;
    user_id: string;
    role?: ParticipantRole;
  }): Promise<void> {
    await this.db.knex('participants').insert(data);
  }

  async updateParticipantRole(conversationId: string, userId: string, role: ParticipantRole.Admin | ParticipantRole.Member): Promise<void> {
    await this.db.knex('participants').where({ conversation_id: conversationId, user_id: userId }).update({ role });
  }

  async removeParticipant(conversationId: string, userId: string): Promise<void> {
    await this.db
      .knex('participants')
      .where({ conversation_id: conversationId, user_id: userId })
      .delete();
  }

  async getParticipant(conversationId: string, userId: string): Promise<Participant | undefined> {
    return this.db
      .knex('participants')
      .where({ conversation_id: conversationId, user_id: userId })
      .first() as Promise<Participant | undefined>;
  }

  async getParticipants(conversationId: string): Promise<Participant[]> {
    return this.db
      .knex('participants')
      .where({ conversation_id: conversationId }) as Promise<Participant[]>;
  }

  async setMute(conversationId: string, userId: string, mutedUntil: Date | null): Promise<void> {
    await this.db
      .knex('participants')
      .where({ conversation_id: conversationId, user_id: userId })
      .update({ muted_until: mutedUntil });
  }
}
