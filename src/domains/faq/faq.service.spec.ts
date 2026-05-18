import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FaqService } from './faq.service';
import { FaqRepository } from './faq.repository';

const mockFaq = {
  id: 'faq-uuid-1',
  question: 'How do I reset my password?',
  answer: 'Go to Settings → Account → Reset Password.',
  order_index: 0,
  is_active: true,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

describe('FaqService', () => {
  let service: FaqService;
  let repo: jest.Mocked<FaqRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaqService,
        {
          provide: FaqRepository,
          useValue: {
            findActive: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(FaqService);
    repo = module.get(FaqRepository);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns active FAQs', async () => {
      repo.findActive.mockResolvedValue([mockFaq]);

      const result = await service.list();

      expect(result).toEqual([mockFaq]);
      expect(repo.findActive).toHaveBeenCalled();
    });

    it('returns empty array when no FAQs exist', async () => {
      repo.findActive.mockResolvedValue([]);

      const result = await service.list();

      expect(result).toEqual([]);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates and returns a FAQ with default order_index', async () => {
      repo.create.mockResolvedValue(mockFaq);

      const result = await service.create({ question: mockFaq.question, answer: mockFaq.answer });

      expect(repo.create).toHaveBeenCalledWith({ question: mockFaq.question, answer: mockFaq.answer, order_index: 0 });
      expect(result).toEqual(mockFaq);
    });

    it('uses provided order_index', async () => {
      repo.create.mockResolvedValue({ ...mockFaq, order_index: 5 });

      await service.create({ question: 'Q', answer: 'A', order_index: 5 });

      expect(repo.create).toHaveBeenCalledWith({ question: 'Q', answer: 'A', order_index: 5 });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates and returns the FAQ', async () => {
      const updated = { ...mockFaq, answer: 'New answer' };
      repo.findById.mockResolvedValue(mockFaq);
      repo.update.mockResolvedValue(updated);

      const result = await service.update('faq-uuid-1', { answer: 'New answer' });

      expect(result.answer).toBe('New answer');
      expect(repo.update).toHaveBeenCalledWith('faq-uuid-1', { answer: 'New answer' });
    });

    it('throws BadRequestException when no fields provided', async () => {
      await expect(service.update('faq-uuid-1', {})).rejects.toThrow(BadRequestException);
      expect(repo.findById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when FAQ does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(service.update('missing-id', { answer: 'X' })).rejects.toThrow(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes the FAQ', async () => {
      repo.findById.mockResolvedValue(mockFaq);
      repo.delete.mockResolvedValue(undefined);

      await service.remove('faq-uuid-1');

      expect(repo.delete).toHaveBeenCalledWith('faq-uuid-1');
    });

    it('throws NotFoundException when FAQ does not exist', async () => {
      repo.findById.mockResolvedValue(undefined);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
