import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { IMessageRepository } from './interfaces/message-repository.interface';
import { Message, ReactionSummary } from './entities/message.entity';
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

      msg.reply_to = msg.reply_to_id
        ? await trx('messages').where({ id: msg.reply_to_id }).select('id', 'sender_id', 'content', 'type', 'deleted_at').first().then((r) =>
            r ? { id: r.id, sender_id: r.sender_id, content: r.deleted_at ? '' : r.content, type: r.type } : null,
          )
        : null;

      return msg as Message;
    });
  }

  async findById(id: string): Promise<Message | undefined> {
    const msg = await this.db.knex('messages').where({ id }).first();
    if (!msg) return undefined;
    msg.attachments = await this.db.knex('message_attachments').where({ message_id: id }).orderBy('created_at', 'asc');
    msg.reply_to = msg.reply_to_id
      ? await this.db.knex('messages').where({ id: msg.reply_to_id }).select('id', 'sender_id', 'content', 'type', 'deleted_at').first().then((r) =>
          r ? { id: r.id, sender_id: r.sender_id, content: r.deleted_at ? '' : r.content, type: r.type } : null,
        )
      : null;
    return msg as Message;
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.db.knex('message_reactions')
      .insert({ message_id: messageId, user_id: userId, emoji })
      .onConflict(['message_id', 'user_id', 'emoji'])
      .ignore();
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.db.knex('message_reactions').where({ message_id: messageId, user_id: userId, emoji }).delete();
  }

  async getReactionSummary(messageId: string, userId: string): Promise<ReactionSummary[]> {
    const rows = await this.db.knex('message_reactions').where({ message_id: messageId }).select('emoji', 'user_id');
    return this.aggregateReactions(rows, userId);
  }

  private aggregateReactions(rows: { emoji: string; user_id: string }[], userId: string): ReactionSummary[] {
    const map: Record<string, { count: number; reacted_by_me: boolean }> = {};
    for (const r of rows) {
      if (!map[r.emoji]) map[r.emoji] = { count: 0, reacted_by_me: false };
      map[r.emoji].count++;
      if (r.user_id === userId) map[r.emoji].reacted_by_me = true;
    }
    return Object.entries(map).map(([emoji, v]) => ({ emoji, ...v }));
  }

  async list(conversationId: string, cursor?: string, userId?: string, limit = DEFAULT_LIMIT): Promise<Message[]> {
    let query = this.db
      .knex('messages')
      .where({ conversation_id: conversationId })
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

    const replyToIds = [...new Set(messages.map((m) => m.reply_to_id).filter(Boolean))];
    const replyToMap: Record<string, any> = {};
    if (replyToIds.length > 0) {
      const replies = await this.db.knex('messages').whereIn('id', replyToIds).select('id', 'sender_id', 'content', 'type', 'deleted_at');
      for (const r of replies) {
        replyToMap[r.id] = { id: r.id, sender_id: r.sender_id, content: r.deleted_at ? '' : r.content, type: r.type };
      }
    }

    const reactionRows = await this.db.knex('message_reactions').whereIn('message_id', messageIds).select('message_id', 'emoji', 'user_id');
    const reactionsByMessageId: Record<string, { emoji: string; user_id: string }[]> = {};
    for (const r of reactionRows) {
      if (!reactionsByMessageId[r.message_id]) reactionsByMessageId[r.message_id] = [];
      reactionsByMessageId[r.message_id].push(r);
    }

    return messages.map((m) => ({
      ...m,
      content: m.deleted_at ? '' : m.content,
      attachments: m.deleted_at ? [] : (attachmentsByMessageId[m.id] ?? []),
      reply_to: m.reply_to_id ? (replyToMap[m.reply_to_id] ?? null) : null,
      reactions: this.aggregateReactions(reactionsByMessageId[m.id] ?? [], userId ?? ''),
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
