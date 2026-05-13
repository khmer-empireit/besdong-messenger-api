import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationRepository } from './conversation.repository';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { MuteConversationDto } from './dto/mute-conversation.dto';
import { UserRepository } from '../user/user.repository';
import { ConversationType, ParticipantRole } from '../../shared/enums';

@Injectable()
export class ConversationService {
  constructor(private repo: ConversationRepository, private userRepo: UserRepository) {}

  async create(userId: string, dto: CreateConversationDto) {
    // Validate that all member_ids are existing users and not the current user
    const allUserIds = [userId, ...dto.member_ids];
    const uniqueUserIds = [...new Set(allUserIds)];
    if (uniqueUserIds.length !== allUserIds.length) {
      throw new BadRequestException('Cannot add yourself to the conversation');
    }
    const existingUsers = await Promise.all(uniqueUserIds.map(id => this.userRepo.findById(id)));
    const missingUsers = uniqueUserIds.filter((id, index) => !existingUsers[index]);
    if (missingUsers.length > 0) {
      throw new BadRequestException(`User(s) not found: ${missingUsers.join(', ')}`);
    }

    if (dto.type === ConversationType.Direct) {
      if (dto.member_ids.length !== 1) {
        throw new BadRequestException('Direct conversation requires exactly one other user');
      }
      const otherId = dto.member_ids[0];
      const existing = await this.repo.findDirectBetween(userId, otherId);
      if (existing) return existing;

      const conv = await this.repo.create({ type: ConversationType.Direct, created_by: userId });
      await Promise.all([
        this.repo.addParticipant({ conversation_id: conv.id, user_id: userId, role: ParticipantRole.Owner }),
        this.repo.addParticipant({ conversation_id: conv.id, user_id: otherId, role: ParticipantRole.Member }),
      ]);
      return conv;
    }

    if (!dto.name) throw new BadRequestException('Group conversations require a name');

    const conv = await this.repo.create({ type: ConversationType.Group, name: dto.name, created_by: userId });
    const memberInserts = [
      this.repo.addParticipant({ conversation_id: conv.id, user_id: userId, role: ParticipantRole.Owner }),
      ...dto.member_ids.map((id) =>
        this.repo.addParticipant({ conversation_id: conv.id, user_id: id, role: ParticipantRole.Member }),
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
    if (conv.type !== ConversationType.Group) throw new BadRequestException('Only group conversations can be updated');
    await this.assertRole(conversationId, userId, [ParticipantRole.Owner, ParticipantRole.Admin]);
    return this.repo.update(conversationId, { ...dto, updated_at: new Date() });
  }

  async addMembers(conversationId: string, userId: string, dto: AddMembersDto) {
    const conv = await this.repo.findById(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.type !== ConversationType.Group) throw new BadRequestException('Cannot add members to a direct conversation');
    await this.assertRole(conversationId, userId, [ParticipantRole.Owner, ParticipantRole.Admin]);
    await Promise.all(
      dto.user_ids.map((id) =>
        this.repo.addParticipant({ conversation_id: conversationId, user_id: id, role: ParticipantRole.Member }),
      ),
    );
    return { message: 'Members added' };
  }

  async updateMemberRole(conversationId: string, requesterId: string, targetUserId: string, dto: UpdateMemberRoleDto) {
    const conv = await this.repo.findById(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.type !== ConversationType.Group) throw new BadRequestException('Only group conversations have roles');

    await this.assertRole(conversationId, requesterId, [ParticipantRole.Owner]);

    const target = await this.repo.getParticipant(conversationId, targetUserId);
    if (!target) throw new NotFoundException('Member not found in this conversation');
    if (target.role === ParticipantRole.Owner) throw new ForbiddenException('Cannot change the owner\'s role');

    await this.repo.updateParticipantRole(conversationId, targetUserId, dto.role);
    return { message: 'Role updated' };
  }

  async removeMember(conversationId: string, requesterId: string, targetUserId: string) {
    const conv = await this.repo.findById(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.type !== ConversationType.Group) throw new BadRequestException('Cannot remove members from a direct conversation');

    if (requesterId !== targetUserId) {
      const requester = await this.repo.getParticipant(conversationId, requesterId);
      if (!requester || ![ParticipantRole.Owner, ParticipantRole.Admin].includes(requester.role)) throw new ForbiddenException('Insufficient permissions');

      const target = await this.repo.getParticipant(conversationId, targetUserId);
      if (!target) throw new NotFoundException('Member not found in this conversation');
      if (target.role === ParticipantRole.Owner) throw new ForbiddenException('Cannot remove the owner');
      if (target.role === ParticipantRole.Admin && requester.role !== ParticipantRole.Owner) throw new ForbiddenException('Only the owner can remove an admin');
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

  private async assertRole(conversationId: string, userId: string, roles: ParticipantRole[]) {
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
