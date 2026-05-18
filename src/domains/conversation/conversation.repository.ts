import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { IConversationRepository } from './interfaces/conversation-repository.interface';
import { Conversation } from './entities/conversation.entity';
import { ConversationListItem } from './entities/conversation-list-item.entity';
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

  async listForUser(userId: string, cursor?: string, limit = 20): Promise<ConversationListItem[]> {
    const rows = await this.db.knex.raw<{ rows: any[] }>(
      `
      SELECT
        c.id, c.type, c.name, c.avatar_url, c.description,
        c.created_by, c.created_at, c.updated_at,
        p.last_read_at,
        p.is_pinned,
        (p.muted_until IS NOT NULL AND p.muted_until > NOW()) AS is_muted,
        (
          SELECT COUNT(*)::int FROM messages m
          WHERE m.conversation_id = c.id
            AND m.deleted_at IS NULL
            AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)
        ) AS unread_count,
        CASE WHEN c.type = 'direct' THEN (
          SELECT u.is_online FROM participants p2
          JOIN users u ON u.id = p2.user_id
          WHERE p2.conversation_id = c.id AND p2.user_id != ?
          LIMIT 1
        ) ELSE false END AS is_online,
        (
          SELECT json_build_object(
            'id', m.id,
            'sender_id', m.sender_id,
            'sender_name', COALESCE(u2.display_name, 'Deleted User'),
            'message', CASE WHEN m.deleted_at IS NOT NULL THEN '' ELSE m.content END,
            'type', m.type,
            'is_edited', m.is_edited,
            'is_deleted', m.deleted_at IS NOT NULL,
            'created_at', m.created_at,
            'status', CASE
              WHEN p.last_read_at IS NOT NULL AND p.last_read_at >= m.created_at THEN 'seen'
              ELSE 'delivered'
            END,
            'attachments', COALESCE((
              SELECT json_agg(json_build_object('url', a.url, 'type', a.type))
              FROM message_attachments a WHERE a.message_id = m.id
            ), '[]'::json)
          )
          FROM messages m
          LEFT JOIN users u2 ON u2.id = m.sender_id
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message,
        (SELECT COUNT(*)::int FROM participants p3 WHERE p3.conversation_id = c.id) AS participants_count,
        (
          SELECT json_agg(json_build_object('id', u3.id, 'name', u3.display_name, 'avatar_url', u3.avatar_url))
          FROM (
            SELECT u3.id, u3.display_name, u3.avatar_url
            FROM participants p4
            JOIN users u3 ON u3.id = p4.user_id
            WHERE p4.conversation_id = c.id
            ORDER BY p4.joined_at ASC
            LIMIT 5
          ) u3
        ) AS participants
      FROM conversations c
      JOIN participants p ON p.conversation_id = c.id AND p.user_id = ?
      WHERE (?::timestamptz IS NULL OR (p.is_pinned = false AND c.updated_at < ?))
      ORDER BY p.is_pinned DESC, c.updated_at DESC
      LIMIT ?
      `,
      [userId, userId, cursor ?? null, cursor ?? null, limit],
    );
    return rows.rows as ConversationListItem[];
  }

  async searchForUser(userId: string, query: string): Promise<ConversationListItem[]> {
    const like = `%${query}%`;
    const rows = await this.db.knex.raw<{ rows: any[] }>(
      `
      SELECT
        c.id, c.type, c.name, c.avatar_url, c.description,
        c.created_by, c.created_at, c.updated_at,
        p.last_read_at,
        p.is_pinned,
        (p.muted_until IS NOT NULL AND p.muted_until > NOW()) AS is_muted,
        (
          SELECT COUNT(*)::int FROM messages m
          WHERE m.conversation_id = c.id
            AND m.deleted_at IS NULL
            AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)
        ) AS unread_count,
        CASE WHEN c.type = 'direct' THEN (
          SELECT u.is_online FROM participants p2
          JOIN users u ON u.id = p2.user_id
          WHERE p2.conversation_id = c.id AND p2.user_id != ?
          LIMIT 1
        ) ELSE false END AS is_online,
        (
          SELECT json_build_object(
            'id', m.id,
            'sender_id', m.sender_id,
            'sender_name', COALESCE(u2.display_name, 'Deleted User'),
            'message', CASE WHEN m.deleted_at IS NOT NULL THEN '' ELSE m.content END,
            'type', m.type,
            'is_edited', m.is_edited,
            'is_deleted', m.deleted_at IS NOT NULL,
            'created_at', m.created_at,
            'status', CASE
              WHEN p.last_read_at IS NOT NULL AND p.last_read_at >= m.created_at THEN 'seen'
              ELSE 'delivered'
            END,
            'attachments', COALESCE((
              SELECT json_agg(json_build_object('url', a.url, 'type', a.type))
              FROM message_attachments a WHERE a.message_id = m.id
            ), '[]'::json)
          )
          FROM messages m
          LEFT JOIN users u2 ON u2.id = m.sender_id
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message,
        (SELECT COUNT(*)::int FROM participants p3 WHERE p3.conversation_id = c.id) AS participants_count,
        (
          SELECT json_agg(json_build_object('id', u3.id, 'name', u3.display_name, 'avatar_url', u3.avatar_url))
          FROM (
            SELECT u3.id, u3.display_name, u3.avatar_url
            FROM participants p4
            JOIN users u3 ON u3.id = p4.user_id
            WHERE p4.conversation_id = c.id
            ORDER BY p4.joined_at ASC
            LIMIT 5
          ) u3
        ) AS participants
      FROM conversations c
      JOIN participants p ON p.conversation_id = c.id AND p.user_id = ?
      LEFT JOIN participants p_other ON p_other.conversation_id = c.id AND p_other.user_id != ? AND c.type = 'direct'
      LEFT JOIN users u_other ON u_other.id = p_other.user_id
      WHERE (
        (c.type = 'direct' AND (u_other.username ILIKE ? OR u_other.display_name ILIKE ?))
        OR (c.type = 'group' AND c.name ILIKE ?)
      )
      ORDER BY p.is_pinned DESC, c.updated_at DESC
      `,
      [userId, userId, userId, like, like, like],
    );
    return rows.rows as ConversationListItem[];
  }

  async pinConversation(conversationId: string, userId: string, pin: boolean): Promise<void> {
    await this.db.knex('participants')
      .where({ conversation_id: conversationId, user_id: userId })
      .update({ is_pinned: pin });
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

  async getOfflineParticipantIds(conversationId: string, excludeUserId: string): Promise<string[]> {
    const rows = await this.db
      .knex('participants as p')
      .join('users as u', 'u.id', 'p.user_id')
      .where('p.conversation_id', conversationId)
      .andWhere('p.user_id', '!=', excludeUserId)
      .andWhere('u.is_online', false)
      .select('p.user_id');
    return rows.map((r: { user_id: string }) => r.user_id);
  }

  async setMute(conversationId: string, userId: string, mutedUntil: Date | null): Promise<void> {
    await this.db
      .knex('participants')
      .where({ conversation_id: conversationId, user_id: userId })
      .update({ muted_until: mutedUntil });
  }
}
