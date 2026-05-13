import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageRepository } from './message.repository';
import { ConversationRepository } from '../conversation/conversation.repository';
import { BlockRepository } from '../block/block.repository';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { ForwardMessageDto } from './dto/forward-message.dto';

@Injectable()
export class MessageService {
  constructor(
    private repo: MessageRepository,
    private convRepo: ConversationRepository,
    private blockRepo: BlockRepository,
  ) {}

  async send(conversationId: string, userId: string, dto: SendMessageDto) {
    await this.assertParticipant(conversationId, userId);

    const conv = await this.convRepo.findById(conversationId);
    if (conv?.type === 'direct') {
      const participants = await this.convRepo.getParticipants(conversationId);
      const otherId = participants.find((p) => p.user_id !== userId)?.user_id;
      if (otherId && await this.blockRepo.isBlockedEither(userId, otherId)) {
        throw new ForbiddenException('You cannot send messages to this user');
      }
    }

    const type = dto.type ?? 'text';

    if (type === 'text') {
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
    return msg;
  }

  async list(conversationId: string, userId: string, cursor?: string) {
    await this.assertParticipant(conversationId, userId);
    return this.repo.list(conversationId, cursor);
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
    return forwarded;
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
}
