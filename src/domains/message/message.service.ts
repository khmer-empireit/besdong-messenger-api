import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageRepository } from './message.repository';
import { ConversationRepository } from '../conversation/conversation.repository';
import { BlockRepository } from '../block/block.repository';
import { UserService } from '../user/user.service';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';
import { AppLogger } from '../../infrastructure/logger/logger.service';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { ForwardMessageDto } from './dto/forward-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { ConversationType, MessageType } from '../../shared/enums';
import { Message } from './entities/message.entity';

@Injectable()
export class MessageService {
  private readonly pendingPushes = new Map<string, NodeJS.Timeout>();

  constructor(
    private repo: MessageRepository,
    private convRepo: ConversationRepository,
    private blockRepo: BlockRepository,
    private userService: UserService,
    private firebaseService: FirebaseService,
    private logger: AppLogger,
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
    void this.scheduleOfflinePushes(conversationId, conv!.type, userId, msg);
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
    void this.scheduleOfflinePushes(dto.target_conversation_id, targetConv!.type, userId, forwarded);
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

  private async assertParticipant(conversationId: string, userId: string) {
    const p = await this.convRepo.getParticipant(conversationId, userId);
    if (!p) throw new ForbiddenException('Not a member of this conversation');
  }

  private async scheduleOfflinePushes(
    conversationId: string,
    convType: ConversationType,
    senderId: string,
    msg: Message,
  ): Promise<void> {
    try {
      const offlineIds = await this.convRepo.getOfflineParticipantIds(conversationId, senderId);
      for (const recipientId of offlineIds) {
        this.schedulePush(conversationId, convType, senderId, recipientId, msg);
      }
    } catch (err) {
      this.logger.error(`scheduleOfflinePushes failed: ${(err as Error).message}`, (err as Error).stack, 'Push');
    }
  }

  private schedulePush(
    conversationId: string,
    convType: ConversationType,
    senderId: string,
    recipientId: string,
    msg: Message,
  ): void {
    const key = `${conversationId}:${recipientId}`;
    const existing = this.pendingPushes.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.pendingPushes.delete(key);
      this.firePush(conversationId, convType, senderId, recipientId, msg).catch((err) =>
        this.logger.error(`firePush failed: ${(err as Error).message}`, (err as Error).stack, 'Push'),
      );
    }, 1000);

    this.pendingPushes.set(key, timer);
  }

  private async firePush(
    conversationId: string,
    convType: ConversationType,
    senderId: string,
    recipientId: string,
    msg: Message,
  ): Promise<void> {
    const profile = await this.userService.getProfile(recipientId);
    if (profile.is_online) return;

    const participant = await this.convRepo.getParticipant(conversationId, recipientId);
    if (participant?.last_read_at && participant.last_read_at >= msg.created_at) return;

    const settings = await this.userService.getSettings(recipientId);
    if (!settings.notifications_enabled || settings.do_not_disturb) return;
    if (convType === ConversationType.Direct && !settings.notify_messages) return;
    if (convType === ConversationType.Group && !settings.notify_groups) return;

    const tokens = await this.userService.getDeviceTokens(recipientId);
    if (tokens.length === 0) return;

    const [sender, unread] = await Promise.all([
      this.userService.getProfile(senderId),
      this.repo.getUnreadCount(conversationId, recipientId),
    ]);

    let body: string;
    switch (msg.type) {
      case MessageType.Image: body = 'Sent an image'; break;
      case MessageType.Audio: body = 'Sent an audio message'; break;
      case MessageType.File: body = 'Sent a file'; break;
      default: body = msg.content.substring(0, 100);
    }
    if (unread > 1) body = `${body} (${unread} new messages)`;

    this.logger.log(`push → userId=${recipientId} tokens=${tokens.length} unread=${unread} msg=${msg.id}`, 'Push');
    const invalid = await this.firebaseService.sendPush(tokens, sender.display_name, body, {
      conversation_id: conversationId,
    });
    for (const token of invalid) {
      await this.userService.purgeDeviceToken(token);
    }
  }
}
