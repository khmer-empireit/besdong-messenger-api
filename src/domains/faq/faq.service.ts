import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FaqRepository } from './faq.repository';
import { CreateFaqDto } from './dto/faq.dto';
import { UpdateFaqDto } from './dto/faq.dto';

@Injectable()
export class FaqService {
  constructor(private repo: FaqRepository) {}

  async list() {
    return this.repo.findActive();
  }

  async create(dto: CreateFaqDto) {
    return this.repo.create({
      question: dto.question,
      answer: dto.answer,
      order_index: dto.order_index ?? 0,
    });
  }

  async update(id: string, dto: UpdateFaqDto) {
    if (Object.keys(dto).length === 0) throw new BadRequestException('At least one field must be provided.');
    const faq = await this.repo.findById(id);
    if (!faq) throw new NotFoundException('FAQ not found');
    return this.repo.update(id, dto);
  }

  async remove(id: string) {
    const faq = await this.repo.findById(id);
    if (!faq) throw new NotFoundException('FAQ not found');
    await this.repo.delete(id);
  }
}
