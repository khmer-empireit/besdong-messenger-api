import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { IMessageRepository } from './interfaces/message-repository.interface';
import { Message } from './entities/message.entity';
import { AttachmentInputDto } from './dto/send-message.dto';

function pickForwardedFrom(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    sender_id: r.sender_id,
    sender_username: r.sender_username ?? null,
    sender_display_name: r.sender_display_name ?? null,
    content: r.deleted_at ? '' : r.content,
    type: r.type,
  };
}

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
        ? await trx('messages as m').leftJoin('users as u', 'u.id', 'm.sender_id').where('m.id', msg.reply_to_id)
            .select('m.id', 'm.sender_id', 'm.content', 'm.type', 'm.deleted_at', 'u.username as sender_username', 'u.display_name as sender_display_name').first().then(pickForwardedFrom)
        : null;

      msg.forwarded_from = msg.forwarded_from_id
        ? await trx('messages as m').leftJoin('users as u', 'u.id', 'm.sender_id').where('m.id', msg.forwarded_from_id)
            .select('m.id', 'm.sender_id', 'm.content', 'm.type', 'm.deleted_at', 'u.username as sender_username', 'u.display_name as sender_display_name').first().then(pickForwardedFrom)
        : null;

      return msg as Message;
    });
  }

  async findById(id: string): Promise<Message | undefined> {
    const msg = await this.db.knex('messages').where({ id }).first();
    if (!msg) return undefined;
    msg.attachments = await this.db.knex('message_attachments').where({ message_id: id }).orderBy('created_at', 'asc');
    msg.reply_to = msg.reply_to_id
      ? await this.db.knex('messages as m').leftJoin('users as u', 'u.id', 'm.sender_id').where('m.id', msg.reply_to_id)
          .select('m.id', 'm.sender_id', 'm.content', 'm.type', 'm.deleted_at', 'u.username as sender_username', 'u.display_name as sender_display_name').first().then(pickForwardedFrom)
      : null;
    msg.forwarded_from = msg.forwarded_from_id
      ? await this.db.knex('messages as m').leftJoin('users as u', 'u.id', 'm.sender_id').where('m.id', msg.forwarded_from_id)
          .select('m.id', 'm.sender_id', 'm.content', 'm.type', 'm.deleted_at', 'u.username as sender_username', 'u.display_name as sender_display_name').first().then(pickForwardedFrom)
      : null;
    return msg as Message;
  }

  async list(conversationId: string, cursor?: string, limit = DEFAULT_LIMIT): Promise<Message[]> {
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

    const relatedIds = [...new Set([
      ...messages.map((m) => m.reply_to_id),
      ...messages.map((m) => m.forwarded_from_id),
    ].filter(Boolean))];
    const relatedMap: Record<string, any> = {};
    if (relatedIds.length > 0) {
      const related = await this.db.knex('messages as m')
        .leftJoin('users as u', 'u.id', 'm.sender_id')
        .whereIn('m.id', relatedIds)
        .select('m.id', 'm.sender_id', 'm.content', 'm.type', 'm.deleted_at', 'u.username as sender_username', 'u.display_name as sender_display_name');
      for (const r of related) {
        relatedMap[r.id] = pickForwardedFrom(r);
      }
    }

    return messages.map((m) => ({
      ...m,
      content: m.deleted_at ? '' : m.content,
      attachments: m.deleted_at ? [] : (attachmentsByMessageId[m.id] ?? []),
      reply_to: m.reply_to_id ? (relatedMap[m.reply_to_id] ?? null) : null,
      forwarded_from: m.forwarded_from_id ? (relatedMap[m.forwarded_from_id] ?? null) : null,
    })) as Message[];
  }

  async forward(originalId: string, targetConversationId: string, senderId: string): Promise<Message> {
    return this.db.knex.transaction(async (trx) => {
      const original = await trx('messages').where({ id: originalId }).first();
      const originalAttachments = await trx('message_attachments').where({ message_id: originalId });

      const [msg] = await trx('messages').insert({
        conversation_id: targetConversationId,
        sender_id: senderId,
        content: original.content,
        type: original.type,
        forwarded_from_id: originalId,
      }).returning('*');

      if (originalAttachments.length > 0) {
        const rows = originalAttachments.map(({ message_id: _mid, id: _id, created_at: _ca, ...rest }) => ({
          ...rest,
          message_id: msg.id,
        }));
        msg.attachments = await trx('message_attachments').insert(rows).returning('*');
      } else {
        msg.attachments = [];
      }

      const originalSender = original.sender_id
        ? await trx('users').where({ id: original.sender_id }).select('username', 'display_name').first()
        : null;
      msg.reply_to = null;
      msg.forwarded_from = pickForwardedFrom({ ...original, sender_username: originalSender?.username ?? null, sender_display_name: originalSender?.display_name ?? null });

      return msg as Message;
    });
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
