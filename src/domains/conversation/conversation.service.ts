import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationRepository } from './conversation.repository';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { MuteConversationDto } from './dto/mute-conversation.dto';

@Injectable()
export class ConversationService {
  constructor(private repo: ConversationRepository) {}

  async create(userId: string, dto: CreateConversationDto) {
    if (dto.type === 'direct') {
      if (dto.member_ids.length !== 1) {
        throw new BadRequestException('Direct conversation requires exactly one other user');
      }
      const otherId = dto.member_ids[0];
      const existing = await this.repo.findDirectBetween(userId, otherId);
      if (existing) return existing;

      const conv = await this.repo.create({ type: 'direct', created_by: userId });
      await Promise.all([
        this.repo.addParticipant({ conversation_id: conv.id, user_id: userId, role: 'owner' }),
        this.repo.addParticipant({ conversation_id: conv.id, user_id: otherId, role: 'member' }),
      ]);
      return conv;
    }

    if (!dto.name) throw new BadRequestException('Group conversations require a name');

    const conv = await this.repo.create({ type: 'group', name: dto.name, created_by: userId });
    const memberInserts = [
      this.repo.addParticipant({ conversation_id: conv.id, user_id: userId, role: 'owner' }),
      ...dto.member_ids.map((id) =>
        this.repo.addParticipant({ conversation_id: conv.id, user_id: id, role: 'member' }),
      ),
    ];
    await Promise.all(memberInserts);
    return conv;
  }

  async list(userId: string) {
    return this.repo.listForUser(userId);
  }

  async get(conversationId: string, userId: string) {
    const conv = await this.repo.findById(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');
    await this.assertParticipant(conversationId, userId);
    const participants = await this.repo.getParticipants(conversationId);
    return { ...conv, participants };
  }

  async update(conversationId: string, userId: string, dto: UpdateConversationDto) {
    const conv = await this.repo.findById(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.type !== 'group') throw new BadRequestException('Only group conversations can be updated');
    await this.assertRole(conversationId, userId, ['owner', 'admin']);
    return this.repo.update(conversationId, { ...dto, updated_at: new Date() });
  }

  async addMembers(conversationId: string, userId: string, dto: AddMembersDto) {
    const conv = await this.repo.findById(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.type !== 'group') throw new BadRequestException('Cannot add members to a direct conversation');
    await this.assertRole(conversationId, userId, ['owner', 'admin']);
    await Promise.all(
      dto.user_ids.map((id) =>
        this.repo.addParticipant({ conversation_id: conversationId, user_id: id, role: 'member' }),
      ),
    );
    return { message: 'Members added' };
  }

  async removeMember(conversationId: string, requesterId: string, targetUserId: string) {
    const conv = await this.repo.findById(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.type !== 'group') throw new BadRequestException('Cannot remove members from a direct conversation');

    if (requesterId !== targetUserId) {
      await this.assertRole(conversationId, requesterId, ['owner', 'admin']);
    }
    await this.repo.removeParticipant(conversationId, targetUserId);
    return { message: 'Member removed' };
  }

  async mute(conversationId: string, userId: string, dto: MuteConversationDto) {
    await this.assertParticipant(conversationId, userId);
    const mutedUntil = this.resolveMutedUntil(dto.duration);
    await this.repo.setMute(conversationId, userId, mutedUntil);
    return { message: 'Conversation muted' };
  }

  async unmute(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    await this.repo.setMute(conversationId, userId, null);
    return { message: 'Conversation unmuted' };
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const p = await this.repo.getParticipant(conversationId, userId);
    if (!p) throw new ForbiddenException('Not a member of this conversation');
  }

  private async assertRole(conversationId: string, userId: string, roles: string[]) {
    const p = await this.repo.getParticipant(conversationId, userId);
    if (!p || !roles.includes(p.role)) throw new ForbiddenException('Insufficient permissions');
  }

  private resolveMutedUntil(duration: '30m' | '1h' | '8h' | 'forever'): Date | null {
    const now = Date.now();
    const map = { '30m': 30 * 60 * 1000, '1h': 60 * 60 * 1000, '8h': 8 * 60 * 60 * 1000 };
    if (duration === 'forever') return new Date('9999-12-31');
    return new Date(now + map[duration]);
  }
}
