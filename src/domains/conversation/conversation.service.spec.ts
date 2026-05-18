import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationRepository } from './conversation.repository';
import { UserRepository } from '../user/user.repository';
import { ConversationType, ParticipantRole } from '../../shared/enums';

const mockConvDirect = {
  id: 'conv-uuid-1',
  type: ConversationType.Direct,
  name: null,
  avatar_url: null,
  created_by: 'user-uuid-1',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const mockConvGroup = {
  id: 'conv-uuid-2',
  type: ConversationType.Group,
  name: 'Test Group',
  avatar_url: null,
  created_by: 'user-uuid-1',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const mockParticipantOwner = {
  conversation_id: 'conv-uuid-1',
  user_id: 'user-uuid-1',
  role: ParticipantRole.Owner,
  joined_at: new Date('2026-01-01'),
  muted_until: null,
  last_read_at: null,
  is_pinned: false,
};

const mockParticipantMember = {
  conversation_id: 'conv-uuid-1',
  user_id: 'user-uuid-2',
  role: ParticipantRole.Member,
  joined_at: new Date('2026-01-01'),
  muted_until: null,
  last_read_at: null,
  is_pinned: false,
};

const mockUser = { id: 'user-uuid-1', username: 'user1' };

describe('ConversationService', () => {
  let service: ConversationService;
  let repo: jest.Mocked<ConversationRepository>;
  let userRepo: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: ConversationRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findDirectBetween: jest.fn(),
            listForUser: jest.fn(),
            searchForUser: jest.fn(),
            update: jest.fn(),
            pinConversation: jest.fn(),
            addParticipant: jest.fn(),
            removeParticipant: jest.fn(),
            getParticipant: jest.fn(),
            getParticipants: jest.fn(),
            updateParticipantRole: jest.fn(),
            setMute: jest.fn(),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ConversationService);
    repo = module.get(ConversationRepository);
    userRepo = module.get(UserRepository);

    repo.addParticipant.mockResolvedValue(undefined);
    repo.removeParticipant.mockResolvedValue(undefined);
    repo.setMute.mockResolvedValue(undefined);
    userRepo.findById.mockResolvedValue(mockUser as any);
  });

  // ── create (direct) ───────────────────────────────────────────────────────

  describe('create — direct', () => {
    it('creates new direct conversation', async () => {
      repo.findDirectBetween.mockResolvedValue(undefined);
      repo.create.mockResolvedValue(mockConvDirect);

      const result = await service.create('user-uuid-1', {
        type: ConversationType.Direct,
        member_ids: ['user-uuid-2'],
      });

      expect(result).toEqual(mockConvDirect);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ type: ConversationType.Direct }));
      expect(repo.addParticipant).toHaveBeenCalledTimes(2);
    });

    it('returns existing direct conversation if already exists', async () => {
      repo.findDirectBetween.mockResolvedValue(mockConvDirect);

      const result = await service.create('user-uuid-1', {
        type: ConversationType.Direct,
        member_ids: ['user-uuid-2'],
      });

      expect(result).toEqual(mockConvDirect);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException if member_ids is not exactly one user', async () => {
      await expect(
        service.create('user-uuid-1', { type: ConversationType.Direct, member_ids: ['user-2', 'user-3'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── create (group) ────────────────────────────────────────────────────────

  describe('create — group', () => {
    it('creates group conversation with owner and members', async () => {
      repo.create.mockResolvedValue(mockConvGroup);

      const result = await service.create('user-uuid-1', {
        type: ConversationType.Group,
        name: 'Test Group',
        member_ids: ['user-uuid-2'],
      });

      expect(result).toEqual(mockConvGroup);
      expect(repo.addParticipant).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-uuid-1', role: ParticipantRole.Owner }),
      );
      expect(repo.addParticipant).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-uuid-2', role: ParticipantRole.Member }),
      );
    });

    it('throws BadRequestException if name is missing', async () => {
      await expect(
        service.create('user-uuid-1', { type: ConversationType.Group, member_ids: ['user-uuid-2'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated conversations for user', async () => {
      repo.listForUser.mockResolvedValue([mockConvDirect] as any);

      const result = await service.list('user-uuid-1');

      expect(result.data).toHaveLength(1);
      expect(result.pagination.has_more).toBe(false);
      expect(repo.listForUser).toHaveBeenCalledWith('user-uuid-1', undefined, 21);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns conversation with participants', async () => {
      repo.findById.mockResolvedValue(mockConvDirect);
      repo.getParticipant.mockResolvedValue(mockParticipantOwner);
      repo.getParticipants.mockResolvedValue([mockParticipantOwner, mockParticipantMember]);

      const result = await service.get('conv-uuid-1', 'user-uuid-1');

      expect(result.participants).toHaveLength(2);
    });

    it('throws NotFoundException when conversation does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(service.get('missing-id', 'user-uuid-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not a member', async () => {
      repo.findById.mockResolvedValue(mockConvDirect);
      repo.getParticipant.mockResolvedValue(undefined);

      await expect(service.get('conv-uuid-1', 'stranger-id')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates group conversation name', async () => {
      const updated = { ...mockConvGroup, name: 'Renamed' };
      repo.findById.mockResolvedValue(mockConvGroup);
      repo.getParticipant.mockResolvedValue(mockParticipantOwner);
      repo.update.mockResolvedValue(updated);

      const result = await service.update('conv-uuid-2', 'user-uuid-1', { name: 'Renamed' });

      expect(result.name).toBe('Renamed');
    });

    it('throws NotFoundException when conversation does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(service.update('missing-id', 'user-uuid-1', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when trying to update a direct conversation', async () => {
      repo.findById.mockResolvedValue(mockConvDirect);

      await expect(service.update('conv-uuid-1', 'user-uuid-1', { name: 'X' })).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when requester is just a member', async () => {
      repo.findById.mockResolvedValue(mockConvGroup);
      repo.getParticipant.mockResolvedValue(mockParticipantMember);

      await expect(service.update('conv-uuid-2', 'user-uuid-2', { name: 'X' })).rejects.toThrow(ForbiddenException);
    });
  });

  // ── addMembers ────────────────────────────────────────────────────────────

  describe('addMembers', () => {
    it('adds members to group', async () => {
      repo.findById.mockResolvedValue(mockConvGroup);
      repo.getParticipant.mockResolvedValue(mockParticipantOwner);

      const result = await service.addMembers('conv-uuid-2', 'user-uuid-1', { user_ids: ['user-uuid-3'] });

      expect(result).toEqual({ message: 'Members added' });
      expect(repo.addParticipant).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-uuid-3', role: ParticipantRole.Member }),
      );
    });

    it('throws BadRequestException for direct conversation', async () => {
      repo.findById.mockResolvedValue(mockConvDirect);

      await expect(service.addMembers('conv-uuid-1', 'user-uuid-1', { user_ids: ['user-3'] })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── updateMemberRole ──────────────────────────────────────────────────────

  describe('updateMemberRole', () => {
    it('allows owner to promote a member to admin', async () => {
      repo.findById.mockResolvedValue(mockConvGroup);
      repo.getParticipant
        .mockResolvedValueOnce(mockParticipantOwner)  // requester = owner
        .mockResolvedValueOnce(mockParticipantMember); // target = member

      const result = await service.updateMemberRole('conv-uuid-2', 'user-uuid-1', 'user-uuid-2', { role: ParticipantRole.Admin });

      expect(result).toEqual({ message: 'Role updated' });
      expect(repo.updateParticipantRole).toHaveBeenCalledWith('conv-uuid-2', 'user-uuid-2', ParticipantRole.Admin);
    });

    it('throws ForbiddenException when non-owner tries to change role', async () => {
      repo.findById.mockResolvedValue(mockConvGroup);
      repo.getParticipant.mockResolvedValue(mockParticipantMember); // requester = member

      await expect(service.updateMemberRole('conv-uuid-2', 'user-uuid-2', 'user-uuid-1', { role: ParticipantRole.Member })).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when trying to change owner role', async () => {
      repo.findById.mockResolvedValue(mockConvGroup);
      repo.getParticipant
        .mockResolvedValueOnce(mockParticipantOwner)  // requester = owner
        .mockResolvedValueOnce(mockParticipantOwner); // target = also owner

      await expect(service.updateMemberRole('conv-uuid-2', 'user-uuid-1', 'user-uuid-1', { role: ParticipantRole.Member })).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException for direct conversation', async () => {
      repo.findById.mockResolvedValue(mockConvDirect);

      await expect(service.updateMemberRole('conv-uuid-1', 'user-uuid-1', 'user-uuid-2', { role: ParticipantRole.Admin })).rejects.toThrow(BadRequestException);
    });
  });

  // ── removeMember ──────────────────────────────────────────────────────────

  describe('removeMember', () => {
    it('allows owner to remove a member', async () => {
      repo.findById.mockResolvedValue(mockConvGroup);
      repo.getParticipant
        .mockResolvedValueOnce(mockParticipantOwner)  // requester = owner
        .mockResolvedValueOnce(mockParticipantMember); // target = member

      const result = await service.removeMember('conv-uuid-2', 'user-uuid-1', 'user-uuid-2');

      expect(result).toEqual({ message: 'Member removed' });
      expect(repo.removeParticipant).toHaveBeenCalledWith('conv-uuid-2', 'user-uuid-2');
    });

    it('allows user to remove themselves without role check', async () => {
      repo.findById.mockResolvedValue(mockConvGroup);

      const result = await service.removeMember('conv-uuid-2', 'user-uuid-2', 'user-uuid-2');

      expect(result).toEqual({ message: 'Member removed' });
      expect(repo.getParticipant).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when admin tries to kick another admin', async () => {
      const mockParticipantAdmin = { ...mockParticipantMember, role: ParticipantRole.Admin };
      repo.findById.mockResolvedValue(mockConvGroup);
      repo.getParticipant
        .mockResolvedValueOnce(mockParticipantAdmin)  // requester = admin
        .mockResolvedValueOnce(mockParticipantAdmin); // target = also admin

      await expect(service.removeMember('conv-uuid-2', 'user-uuid-2', 'user-uuid-3')).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when admin tries to kick the owner', async () => {
      const mockParticipantAdmin = { ...mockParticipantMember, role: ParticipantRole.Admin };
      repo.findById.mockResolvedValue(mockConvGroup);
      repo.getParticipant
        .mockResolvedValueOnce(mockParticipantAdmin)  // requester = admin
        .mockResolvedValueOnce(mockParticipantOwner); // target = owner

      await expect(service.removeMember('conv-uuid-2', 'user-uuid-2', 'user-uuid-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException for direct conversation', async () => {
      repo.findById.mockResolvedValue(mockConvDirect);

      await expect(service.removeMember('conv-uuid-1', 'user-uuid-1', 'user-uuid-2')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── mute / unmute ─────────────────────────────────────────────────────────

  describe('mute', () => {
    it('mutes conversation for user', async () => {
      repo.getParticipant.mockResolvedValue(mockParticipantOwner);

      const result = await service.mute('conv-uuid-1', 'user-uuid-1', { duration: '1h' });

      expect(result).toEqual({ message: 'Conversation muted' });
      expect(repo.setMute).toHaveBeenCalledWith('conv-uuid-1', 'user-uuid-1', expect.any(Date));
    });

    it('sets muted_until to far future for "forever"', async () => {
      repo.getParticipant.mockResolvedValue(mockParticipantOwner);

      await service.mute('conv-uuid-1', 'user-uuid-1', { duration: 'forever' });

      const call = repo.setMute.mock.calls[0];
      expect(call[2]?.getFullYear()).toBe(9999);
    });

    it('throws ForbiddenException when user is not a member', async () => {
      repo.getParticipant.mockResolvedValue(undefined);

      await expect(service.mute('conv-uuid-1', 'stranger-id', { duration: '30m' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('unmute', () => {
    it('unmutes conversation', async () => {
      repo.getParticipant.mockResolvedValue(mockParticipantOwner);

      const result = await service.unmute('conv-uuid-1', 'user-uuid-1');

      expect(result).toEqual({ message: 'Conversation unmuted' });
      expect(repo.setMute).toHaveBeenCalledWith('conv-uuid-1', 'user-uuid-1', null);
    });
  });

  // ── search ────────────────────────────────────────────────────────────────

  describe('search', () => {
    it('returns matching conversations', async () => {
      repo.searchForUser.mockResolvedValue([mockConvGroup] as any);

      const result = await service.search('user-uuid-1', 'Test');

      expect(result).toEqual([mockConvGroup]);
      expect(repo.searchForUser).toHaveBeenCalledWith('user-uuid-1', 'Test');
    });

    it('returns empty array when no matches', async () => {
      repo.searchForUser.mockResolvedValue([]);

      const result = await service.search('user-uuid-1', 'noresult');

      expect(result).toEqual([]);
    });

    it('throws BadRequestException when query is empty', async () => {
      await expect(service.search('user-uuid-1', '')).rejects.toThrow(BadRequestException);
    });
  });

  // ── findOrCreateDirect ────────────────────────────────────────────────────

  describe('findOrCreateDirect', () => {
    it('returns existing conversation if found', async () => {
      repo.findDirectBetween.mockResolvedValue(mockConvDirect);

      const result = await service.findOrCreateDirect('user-uuid-1', 'user-uuid-2');

      expect(result).toEqual(mockConvDirect);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('creates new direct conversation when none exists', async () => {
      repo.findDirectBetween.mockResolvedValue(undefined);
      repo.create.mockResolvedValue(mockConvDirect);

      const result = await service.findOrCreateDirect('user-uuid-1', 'user-uuid-2');

      expect(result).toEqual(mockConvDirect);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: ConversationType.Direct, created_by: 'user-uuid-1' }),
      );
      expect(repo.addParticipant).toHaveBeenCalledTimes(2);
    });
  });
});
