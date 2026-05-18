import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StoryService } from './story.service';
import { StoryRepository } from './story.repository';
import { MessageGateway } from '../message/message.gateway';
import { StorageService } from '../../infrastructure/storage/storage.service';
import { StoryMediaType } from '../../shared/enums';

const mockStory = {
  id: 'story-uuid-1',
  user_id: 'user-uuid-1',
  media_url: 'https://cdn.example.com/stories/file.webp',
  media_key: 'stories/user-uuid-1/file.webp',
  media_type: StoryMediaType.Image,
  caption: null,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
  created_at: new Date(),
};

const mockExpiredStory = {
  ...mockStory,
  id: 'story-uuid-2',
  expires_at: new Date(Date.now() - 1000),
};

const mockStoryWithMeta = {
  ...mockStory,
  username: 'user1',
  display_name: 'User One',
  avatar_url: null,
  view_count: 3,
  is_viewed: true,
};

describe('StoryService', () => {
  let service: StoryService;
  let repo: jest.Mocked<StoryRepository>;
  let gateway: jest.Mocked<MessageGateway>;
  let storage: jest.Mocked<StorageService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoryService,
        {
          provide: StoryRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByIdWithMeta: jest.fn(),
            findByUserId: jest.fn(),
            findFeedForUser: jest.fn(),
            getContactIds: jest.fn(),
            addView: jest.fn(),
            getViews: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: MessageGateway,
          useValue: { broadcastStory: jest.fn() },
        },
        {
          provide: StorageService,
          useValue: { delete: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(StoryService);
    repo = module.get(StoryRepository);
    gateway = module.get(MessageGateway);
    storage = module.get(StorageService);
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates story and broadcasts to contacts', async () => {
      repo.create.mockResolvedValue(mockStory);
      repo.getContactIds.mockResolvedValue(['user-uuid-2', 'user-uuid-3']);

      const dto = { media_url: mockStory.media_url, media_key: mockStory.media_key, media_type: StoryMediaType.Image };
      const result = await service.create('user-uuid-1', dto);

      expect(result).toEqual(mockStory);
      expect(gateway.broadcastStory).toHaveBeenCalledWith(['user-uuid-2', 'user-uuid-3'], mockStory);
    });

    it('does not broadcast when user has no contacts', async () => {
      repo.create.mockResolvedValue(mockStory);
      repo.getContactIds.mockResolvedValue([]);

      await service.create('user-uuid-1', { media_url: mockStory.media_url, media_key: mockStory.media_key, media_type: StoryMediaType.Image });

      expect(gateway.broadcastStory).not.toHaveBeenCalled();
    });
  });

  // ── getFeed ───────────────────────────────────────────────────────────────

  describe('getFeed', () => {
    it('returns feed from repository', async () => {
      repo.findFeedForUser.mockResolvedValue([mockStoryWithMeta]);

      const result = await service.getFeed('user-uuid-1');

      expect(result).toEqual([mockStoryWithMeta]);
      expect(repo.findFeedForUser).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  // ── getMine ───────────────────────────────────────────────────────────────

  describe('getMine', () => {
    it('returns own stories', async () => {
      repo.findByUserId.mockResolvedValue([mockStory]);

      const result = await service.getMine('user-uuid-1');

      expect(result).toEqual([mockStory]);
      expect(repo.findByUserId).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  // ── view ──────────────────────────────────────────────────────────────────

  describe('view', () => {
    it('records view and returns story with meta', async () => {
      repo.findById.mockResolvedValue(mockStory);
      repo.addView.mockResolvedValue(undefined);
      repo.findByIdWithMeta.mockResolvedValue(mockStoryWithMeta);

      const result = await service.view('story-uuid-1', 'user-uuid-2');

      expect(repo.addView).toHaveBeenCalledWith('story-uuid-1', 'user-uuid-2');
      expect(result).toEqual(mockStoryWithMeta);
    });

    it('does not record view when owner views own story', async () => {
      repo.findById.mockResolvedValue(mockStory);
      repo.findByIdWithMeta.mockResolvedValue(mockStoryWithMeta);

      await service.view('story-uuid-1', 'user-uuid-1');

      expect(repo.addView).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when story does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(service.view('missing-id', 'user-uuid-2')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when story is expired', async () => {
      repo.findById.mockResolvedValue(mockExpiredStory);

      await expect(service.view('story-uuid-2', 'user-uuid-2')).rejects.toThrow(NotFoundException);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes story and removes file from storage', async () => {
      repo.findById.mockResolvedValue(mockStory);
      storage.delete.mockResolvedValue(undefined);
      repo.delete.mockResolvedValue(undefined);

      await service.delete('story-uuid-1', 'user-uuid-1');

      expect(storage.delete).toHaveBeenCalledWith(mockStory.media_key);
      expect(repo.delete).toHaveBeenCalledWith('story-uuid-1');
    });

    it('throws NotFoundException when story does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(service.delete('missing-id', 'user-uuid-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user does not own the story', async () => {
      repo.findById.mockResolvedValue(mockStory);

      await expect(service.delete('story-uuid-1', 'user-uuid-2')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── getViews ──────────────────────────────────────────────────────────────

  describe('getViews', () => {
    it('returns viewers list for owner', async () => {
      repo.findById.mockResolvedValue(mockStory);
      repo.getViews.mockResolvedValue([]);

      const result = await service.getViews('story-uuid-1', 'user-uuid-1');

      expect(result).toEqual([]);
      expect(repo.getViews).toHaveBeenCalledWith('story-uuid-1');
    });

    it('throws ForbiddenException for non-owner', async () => {
      repo.findById.mockResolvedValue(mockStory);

      await expect(service.getViews('story-uuid-1', 'user-uuid-2')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when story does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(service.getViews('missing-id', 'user-uuid-1')).rejects.toThrow(NotFoundException);
    });
  });
});
