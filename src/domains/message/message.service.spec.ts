import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageRepository } from './message.repository';
import { ConversationRepository } from '../conversation/conversation.repository';
import { BlockRepository } from '../block/block.repository';

const mockParticipant = {
  conversation_id: 'conv-uuid-1',
  user_id: 'user-uuid-1',
  role: 'member' as const,
  joined_at: new Date('2026-01-01'),
  muted_until: null,
  last_read_at: null,
};

const mockMessage = {
  id: 'msg-uuid-1',
  conversation_id: 'conv-uuid-1',
  sender_id: 'user-uuid-1',
  content: 'Hello!',
  type: 'text' as const,
  reply_to_id: null,
  is_edited: false,
  edited_at: null,
  deleted_at: null,
  created_at: new Date('2026-01-01'),
};

const mockConversation = {
  id: 'conv-uuid-1',
  type: 'direct' as const,
  name: null,
  avatar_url: null,
  created_by: 'user-uuid-1',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

describe('MessageService', () => {
  let service: MessageService;
  let repo: jest.Mocked<MessageRepository>;
  let convRepo: jest.Mocked<ConversationRepository>;
  let blockRepo: jest.Mocked<BlockRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: MessageRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            list: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            updateLastRead: jest.fn(),
          },
        },
        {
          provide: ConversationRepository,
          useValue: {
            getParticipant: jest.fn(),
            getParticipants: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: BlockRepository,
          useValue: {
            isBlockedEither: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MessageService);
    repo = module.get(MessageRepository);
    convRepo = module.get(ConversationRepository);
    blockRepo = module.get(BlockRepository);

    repo.softDelete.mockResolvedValue(undefined);
    repo.updateLastRead.mockResolvedValue(undefined);
    convRepo.update.mockResolvedValue({} as any);
    convRepo.findById.mockResolvedValue(mockConversation);
    convRepo.getParticipants.mockResolvedValue([
      { conversation_id: 'conv-uuid-1', user_id: 'user-uuid-1', role: 'member', joined_at: new Date(), muted_until: null, last_read_at: null },
      { conversation_id: 'conv-uuid-1', user_id: 'user-uuid-2', role: 'member', joined_at: new Date(), muted_until: null, last_read_at: null },
    ]);
    blockRepo.isBlockedEither.mockResolvedValue(false);
  });

  // ── send ──────────────────────────────────────────────────────────────────

  describe('send', () => {
    it('creates message and updates conversation timestamp', async () => {
      convRepo.getParticipant.mockResolvedValue(mockParticipant);
      repo.create.mockResolvedValue(mockMessage);

      const result = await service.send('conv-uuid-1', 'user-uuid-1', { content: 'Hello!' });

      expect(result).toEqual(mockMessage);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ conversation_id: 'conv-uuid-1', sender_id: 'user-uuid-1', content: 'Hello!' }),
      );
      expect(convRepo.update).toHaveBeenCalledWith('conv-uuid-1', expect.objectContaining({ updated_at: expect.any(Date) }));
    });

    it('passes reply_to_id when sending a reply', async () => {
      convRepo.getParticipant.mockResolvedValue(mockParticipant);
      repo.create.mockResolvedValue({ ...mockMessage, reply_to_id: 'msg-uuid-0' });

      await service.send('conv-uuid-1', 'user-uuid-1', { content: 'Reply!', reply_to_id: 'msg-uuid-0' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ reply_to_id: 'msg-uuid-0' }),
      );
    });

    it('throws ForbiddenException when user is not a member', async () => {
      convRepo.getParticipant.mockResolvedValue(undefined);

      await expect(service.send('conv-uuid-1', 'stranger-id', { content: 'Hi' })).rejects.toThrow(ForbiddenException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when either party has blocked the other in a direct conversation', async () => {
      convRepo.getParticipant.mockResolvedValue(mockParticipant);
      blockRepo.isBlockedEither.mockResolvedValue(true);

      await expect(service.send('conv-uuid-1', 'user-uuid-1', { content: 'Hi' })).rejects.toThrow(ForbiddenException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated messages', async () => {
      convRepo.getParticipant.mockResolvedValue(mockParticipant);
      repo.list.mockResolvedValue([mockMessage]);

      const result = await service.list('conv-uuid-1', 'user-uuid-1');

      expect(result).toHaveLength(1);
      expect(repo.list).toHaveBeenCalledWith('conv-uuid-1', undefined, 'user-uuid-1');
    });

    it('passes cursor for pagination', async () => {
      convRepo.getParticipant.mockResolvedValue(mockParticipant);
      repo.list.mockResolvedValue([]);

      await service.list('conv-uuid-1', 'user-uuid-1', 'msg-uuid-1');

      expect(repo.list).toHaveBeenCalledWith('conv-uuid-1', 'msg-uuid-1', 'user-uuid-1');
    });

    it('throws ForbiddenException when user is not a member', async () => {
      convRepo.getParticipant.mockResolvedValue(undefined);

      await expect(service.list('conv-uuid-1', 'stranger-id')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── edit ──────────────────────────────────────────────────────────────────

  describe('edit', () => {
    it('edits own message', async () => {
      const edited = { ...mockMessage, content: 'Edited!', is_edited: true };
      convRepo.getParticipant.mockResolvedValue(mockParticipant);
      repo.findById.mockResolvedValue(mockMessage);
      repo.update.mockResolvedValue(edited);

      const result = await service.edit('conv-uuid-1', 'msg-uuid-1', 'user-uuid-1', { content: 'Edited!' });

      expect(result.is_edited).toBe(true);
      expect(result.content).toBe('Edited!');
      expect(repo.update).toHaveBeenCalledWith('msg-uuid-1', expect.objectContaining({ content: 'Edited!', is_edited: true }));
    });

    it('throws NotFoundException when message does not exist', async () => {
      convRepo.getParticipant.mockResolvedValue(mockParticipant);
      repo.findById.mockResolvedValue(undefined);

      await expect(service.edit('conv-uuid-1', 'missing-id', 'user-uuid-1', { content: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when message belongs to different conversation', async () => {
      convRepo.getParticipant.mockResolvedValue(mockParticipant);
      repo.findById.mockResolvedValue({ ...mockMessage, conversation_id: 'other-conv' });

      await expect(service.edit('conv-uuid-1', 'msg-uuid-1', 'user-uuid-1', { content: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when trying to edit another user\'s message', async () => {
      convRepo.getParticipant.mockResolvedValue({ ...mockParticipant, user_id: 'user-uuid-2' });
      repo.findById.mockResolvedValue(mockMessage); // sender_id is user-uuid-1

      await expect(service.edit('conv-uuid-1', 'msg-uuid-1', 'user-uuid-2', { content: 'X' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('soft-deletes own message', async () => {
      convRepo.getParticipant.mockResolvedValue(mockParticipant);
      repo.findById.mockResolvedValue(mockMessage);

      const result = await service.delete('conv-uuid-1', 'msg-uuid-1', 'user-uuid-1');

      expect(result).toEqual({ message: 'Message deleted' });
      expect(repo.softDelete).toHaveBeenCalledWith('msg-uuid-1');
    });

    it('throws NotFoundException when message does not exist', async () => {
      convRepo.getParticipant.mockResolvedValue(mockParticipant);
      repo.findById.mockResolvedValue(undefined);

      await expect(service.delete('conv-uuid-1', 'missing-id', 'user-uuid-1')).rejects.toThrow(NotFoundException);
      expect(repo.softDelete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when trying to delete another user\'s message', async () => {
      convRepo.getParticipant.mockResolvedValue({ ...mockParticipant, user_id: 'user-uuid-2' });
      repo.findById.mockResolvedValue(mockMessage); // sender_id is user-uuid-1

      await expect(service.delete('conv-uuid-1', 'msg-uuid-1', 'user-uuid-2')).rejects.toThrow(ForbiddenException);
      expect(repo.softDelete).not.toHaveBeenCalled();
    });
  });

  // ── markRead ──────────────────────────────────────────────────────────────

  describe('markRead', () => {
    it('updates last_read_at for member', async () => {
      convRepo.getParticipant.mockResolvedValue(mockParticipant);

      const result = await service.markRead('conv-uuid-1', 'user-uuid-1');

      expect(result).toEqual({ message: 'Marked as read' });
      expect(repo.updateLastRead).toHaveBeenCalledWith('conv-uuid-1', 'user-uuid-1');
    });

    it('throws ForbiddenException when user is not a member', async () => {
      convRepo.getParticipant.mockResolvedValue(undefined);

      await expect(service.markRead('conv-uuid-1', 'stranger-id')).rejects.toThrow(ForbiddenException);
      expect(repo.updateLastRead).not.toHaveBeenCalled();
    });
  });
});
