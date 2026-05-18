import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageRepository } from './message.repository';
import { ConversationRepository } from '../conversation/conversation.repository';
import { BlockRepository } from '../block/block.repository';
import { PushQueueService, PushJobData } from '../../infrastructure/queue/push-queue.service';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { ForwardMessageDto } from './dto/forward-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { ConversationType, MessageType } from '../../shared/enums';
import { Message } from './entities/message.entity';

@Injectable()
export class MessageService {
  constructor(
    private repo: MessageRepository,
    private convRepo: ConversationRepository,
    private blockRepo: BlockRepository,
    private pushQueue: PushQueueService,
  ) {}

  async send(conversationId: string, userId: string, dto: SendMessageDto) {
    await this.assertParticipant(conversationId, userId);

    const conv = await this.convRepo.findById(conversationId);
    if (conv?.type === ConversationType.Direct) {
      const participants = await this.convRepo.getParticipants(conversationId);
      const otherId = participants.find((p) => p.user_id !== userId)?.user_id;
      if (otherId && await this.blockRepo.isBlockedEither(userId, otherId)) {
        throw new ForbiddenException('You cannot send messages to this user');
      }
    }

    const type = dto.type ?? MessageType.Text;

    if (type === MessageType.Text) {
      if (!dto.content || dto.content.trim().length === 0) {
        throw new BadRequestException('content is required for text messages');
      }
      if (dto.attachments && dto.attachments.length > 0) {
        throw new BadRequestException('attachments are not allowed for text messages');
      }
    } else {
      if (!dto.attachments || dto.attachments.length === 0) {
        throw new BadRequestException(`attachments are required for ${type} messages`);
      }
    }

    const msg = await this.repo.create({
      conversation_id: conversationId,
      sender_id: userId,
      content: dto.content ?? '',
      type,
      reply_to_id: dto.reply_to_id,
      attachments: dto.attachments,
    });
    await this.convRepo.update(conversationId, { updated_at: new Date() });
    void this.queueOfflinePushes(conversationId, conv!.type, userId, msg);
    return msg;
  }

  async list(conversationId: string, userId: string, cursor?: string) {
    await this.assertParticipant(conversationId, userId);
    return this.repo.list(conversationId, cursor, userId);
  }

  async edit(conversationId: string, messageId: string, userId: string, dto: EditMessageDto) {
    await this.assertParticipant(conversationId, userId);
    const msg = await this.repo.findById(messageId);
    if (!msg || msg.conversation_id !== conversationId) throw new NotFoundException('Message not found');
    if (msg.sender_id !== userId) throw new ForbiddenException('Cannot edit another user\'s message');
    return this.repo.update(messageId, { content: dto.content, is_edited: true, edited_at: new Date() });
  }

  async delete(conversationId: string, messageId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    const msg = await this.repo.findById(messageId);
    if (!msg || msg.conversation_id !== conversationId) throw new NotFoundException('Message not found');
    if (msg.sender_id !== userId) throw new ForbiddenException('Cannot delete another user\'s message');
    await this.repo.softDelete(messageId);
    return { message: 'Message deleted' };
  }

  async forward(conversationId: string, messageId: string, userId: string, dto: ForwardMessageDto) {
    await this.assertParticipant(conversationId, userId);
    const msg = await this.repo.findById(messageId);
    if (!msg || msg.conversation_id !== conversationId) throw new NotFoundException('Message not found');
    if (msg.deleted_at) throw new BadRequestException('Cannot forward a deleted message');

    await this.assertParticipant(dto.target_conversation_id, userId);

    const forwarded = await this.repo.forward(messageId, dto.target_conversation_id, userId);
    await this.convRepo.update(dto.target_conversation_id, { updated_at: new Date() });
    const targetConv = await this.convRepo.findById(dto.target_conversation_id);
    void this.queueOfflinePushes(dto.target_conversation_id, targetConv!.type, userId, forwarded);
    return forwarded;
  }

  async addReaction(conversationId: string, messageId: string, userId: string, dto: AddReactionDto) {
    await this.assertParticipant(conversationId, userId);
    const msg = await this.repo.findById(messageId);
    if (!msg || msg.conversation_id !== conversationId) throw new NotFoundException('Message not found');
    await this.repo.addReaction(messageId, userId, dto.emoji);
    return this.repo.getReactionSummary(messageId, userId);
  }

  async removeReaction(conversationId: string, messageId: string, userId: string, emoji: string) {
    await this.assertParticipant(conversationId, userId);
    const msg = await this.repo.findById(messageId);
    if (!msg || msg.conversation_id !== conversationId) throw new NotFoundException('Message not found');
    await this.repo.removeReaction(messageId, userId, emoji);
    return this.repo.getReactionSummary(messageId, userId);
  }

  async markRead(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    await this.repo.updateLastRead(conversationId, userId);
    return { message: 'Marked as read' };
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    return this.repo.getUnreadCount(conversationId, userId);
  }

  async createCallLog(conversationId: string, senderId: string, content: string): Promise<void> {
    await this.repo.create({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      type: MessageType.CallLog,
    });
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const p = await this.convRepo.getParticipant(conversationId, userId);
    if (!p) throw new ForbiddenException('Not a member of this conversation');
  }

  private async queueOfflinePushes(
    conversationId: string,
    convType: ConversationType,
    senderId: string,
    msg: Message,
  ): Promise<void> {
    try {
      const offlineIds = await this.convRepo.getOfflineParticipantIds(conversationId, senderId);
      for (const recipientId of offlineIds) {
        await this.pushQueue.schedulePush({
          conversationId,
          convType,
          senderId,
          recipientId,
          messageId: msg.id,
          messageType: msg.type,
          messageContent: msg.content,
          messageCreatedAt: msg.created_at.toISOString(),
        } satisfies PushJobData);
      }
    } catch {
      // fire-and-forget — do not break the send response
    }
  }
}
