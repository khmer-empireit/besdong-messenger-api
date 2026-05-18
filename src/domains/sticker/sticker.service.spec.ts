import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StickerService } from './sticker.service';
import { StickerRepository } from './sticker.repository';

const mockPack = {
  id: 'pack-uuid-1',
  name: 'Cute Animals',
  description: 'Adorable animal stickers',
  thumbnail_url: 'https://cdn.example.com/packs/animals/thumb.webp',
  is_active: true,
  created_at: new Date('2026-01-01'),
};

const mockSticker = {
  id: 'sticker-uuid-1',
  pack_id: 'pack-uuid-1',
  name: 'Happy Cat',
  media_url: 'https://cdn.example.com/stickers/happy-cat.webp',
  media_key: 'stickers/happy-cat.webp',
  order_index: 0,
  created_at: new Date('2026-01-01'),
};

describe('StickerService', () => {
  let service: StickerService;
  let repo: jest.Mocked<StickerRepository>;
  let config: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StickerService,
        {
          provide: StickerRepository,
          useValue: {
            findActivePacks: jest.fn(),
            findPackById: jest.fn(),
            findStickersByPackId: jest.fn(),
            findStickerById: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(StickerService);
    repo = module.get(StickerRepository);
    config = module.get(ConfigService);
  });

  // ── getPacks ──────────────────────────────────────────────────────────────

  describe('getPacks', () => {
    it('returns all active packs', async () => {
      repo.findActivePacks.mockResolvedValue([mockPack]);

      const result = await service.getPacks();

      expect(result).toEqual([mockPack]);
      expect(repo.findActivePacks).toHaveBeenCalled();
    });

    it('returns empty array when no packs', async () => {
      repo.findActivePacks.mockResolvedValue([]);

      const result = await service.getPacks();

      expect(result).toEqual([]);
    });
  });

  // ── getPackWithStickers ───────────────────────────────────────────────────

  describe('getPackWithStickers', () => {
    it('returns pack with stickers', async () => {
      repo.findPackById.mockResolvedValue(mockPack);
      repo.findStickersByPackId.mockResolvedValue([mockSticker]);

      const result = await service.getPackWithStickers('pack-uuid-1');

      expect(result).toEqual({ ...mockPack, stickers: [mockSticker] });
      expect(repo.findStickersByPackId).toHaveBeenCalledWith('pack-uuid-1');
    });

    it('throws NotFoundException when pack not found', async () => {
      repo.findPackById.mockResolvedValue(undefined);

      await expect(service.getPackWithStickers('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when pack is inactive', async () => {
      repo.findPackById.mockResolvedValue({ ...mockPack, is_active: false });

      await expect(service.getPackWithStickers('pack-uuid-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── searchGifs ────────────────────────────────────────────────────────────

  describe('searchGifs', () => {
    it('throws BadRequestException when TENOR_API_KEY is not set', async () => {
      config.get.mockReturnValue(undefined);

      await expect(service.searchGifs('cats')).rejects.toThrow(BadRequestException);
    });
  });

  // ── getTrendingGifs ───────────────────────────────────────────────────────

  describe('getTrendingGifs', () => {
    it('throws BadRequestException when TENOR_API_KEY is not set', async () => {
      config.get.mockReturnValue(undefined);

      await expect(service.getTrendingGifs()).rejects.toThrow(BadRequestException);
    });
  });
});
