import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

const mockUser = {
  id: 'user-uuid-1',
  username: 'testuser',
  display_name: 'Test User',
  email: null,
  bd_number: null,
  avatar_url: null,
  bio: null,
  dob: null,
  role: 'user' as const,
  is_active: true,
  is_verified: false,
  is_online: false,
  last_seen_at: null,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const mockSettings = {
  id: 'settings-uuid-1',
  user_id: 'user-uuid-1',
  theme: 'system' as const,
  language: 'en',
  last_seen_visibility: 'everyone' as const,
  profile_photo_visibility: 'everyone' as const,
  bd_number_visibility: 'contacts' as const,
  read_receipts_enabled: true,
  online_status_visible: true,
  notifications_enabled: true,
  message_previews_enabled: true,
  groups_add_permission: 'everyone' as const,
  chat_wallpaper_type: 'none' as const,
  chat_wallpaper_value: null,
  font_size: 'medium' as const,
  do_not_disturb: false,
  notify_messages: true,
  notify_groups: true,
  notify_calls: true,
  auto_download_wifi: true,
  auto_download_cellular: false,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

describe('UserService', () => {
  let service: UserService;
  let repo: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
            findByIdentifier: jest.fn(),
            updateProfile: jest.fn(),
            search: jest.fn(),
            getSettings: jest.fn(),
            updateSettings: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(UserService);
    repo = module.get(UserRepository);
  });

  // ── getProfile ────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('returns user when found', async () => {
      repo.findById.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-uuid-1');

      expect(result).toEqual(mockUser);
      expect(repo.findById).toHaveBeenCalledWith('user-uuid-1');
    });

    it('throws NotFoundException when user does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(service.getProfile('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateProfile ─────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('updates and returns user', async () => {
      const updated = { ...mockUser, display_name: 'Updated Name' };
      repo.findById.mockResolvedValue(mockUser);
      repo.updateProfile.mockResolvedValue(updated);

      const result = await service.updateProfile('user-uuid-1', { display_name: 'Updated Name' });

      expect(result.display_name).toBe('Updated Name');
      expect(repo.updateProfile).toHaveBeenCalledWith('user-uuid-1', { display_name: 'Updated Name' });
    });

    it('throws NotFoundException when user does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(service.updateProfile('missing-id', { display_name: 'X' })).rejects.toThrow(NotFoundException);
      expect(repo.updateProfile).not.toHaveBeenCalled();
    });
  });

  // ── getSettings ───────────────────────────────────────────────────────────

  describe('getSettings', () => {
    it('returns settings when found', async () => {
      repo.getSettings.mockResolvedValue(mockSettings);

      const result = await service.getSettings('user-uuid-1');

      expect(result).toEqual(mockSettings);
    });

    it('throws NotFoundException when settings do not exist', async () => {
      repo.getSettings.mockResolvedValue(undefined);

      await expect(service.getSettings('user-uuid-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateSettings ────────────────────────────────────────────────────────

  describe('updateSettings', () => {
    it('updates and returns settings', async () => {
      const updated = { ...mockSettings, theme: 'dark' as const };
      repo.getSettings.mockResolvedValue(mockSettings);
      repo.updateSettings.mockResolvedValue(updated);

      const result = await service.updateSettings('user-uuid-1', { theme: 'dark' });

      expect(result.theme).toBe('dark');
      expect(repo.updateSettings).toHaveBeenCalledWith('user-uuid-1', { theme: 'dark' });
    });

    it('throws NotFoundException when settings do not exist', async () => {
      repo.getSettings.mockResolvedValue(undefined);

      await expect(service.updateSettings('user-uuid-1', { theme: 'dark' })).rejects.toThrow(NotFoundException);
      expect(repo.updateSettings).not.toHaveBeenCalled();
    });
  });

  // ── search ────────────────────────────────────────────────────────────────

  describe('search', () => {
    it('trims query and returns results', async () => {
      repo.search.mockResolvedValue([mockUser]);

      const result = await service.search('  test  ');

      expect(repo.search).toHaveBeenCalledWith('test');
      expect(result).toHaveLength(1);
    });

    it('returns empty array when no results', async () => {
      repo.search.mockResolvedValue([]);

      const result = await service.search('nobody');

      expect(result).toEqual([]);
    });
  });

  // ── getPublicProfile ──────────────────────────────────────────────────────

  describe('getPublicProfile', () => {
    it('returns only public fields', async () => {
      repo.findById.mockResolvedValue(mockUser);

      const result = await service.getPublicProfile('user-uuid-1', 'requester-uuid');

      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        display_name: mockUser.display_name,
        avatar_url: mockUser.avatar_url,
        bio: mockUser.bio,
        is_online: mockUser.is_online,
        last_seen_at: mockUser.last_seen_at,
      });
      expect(result).not.toHaveProperty('bd_number');
    });

    it('throws NotFoundException when user does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(service.getPublicProfile('missing-id', 'requester-uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
