import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { IFaqRepository } from './interfaces/faq-repository.interface';
import { Faq } from './entities/faq.entity';

@Injectable()
export class FaqRepository implements IFaqRepository {
  constructor(private db: DbService) {}

  async findActive(): Promise<Faq[]> {
    return this.db.knex('faqs').where({ is_active: true }).orderBy('order_index', 'asc') as Promise<Faq[]>;
  }

  async findById(id: string): Promise<Faq | undefined> {
    return this.db.knex('faqs').where({ id }).first() as Promise<Faq | undefined>;
  }

  async create(data: Pick<Faq, 'question' | 'answer' | 'order_index'>): Promise<Faq> {
    const [faq] = await this.db.knex('faqs').insert(data).returning('*');
    return faq as Faq;
  }

  async update(id: string, data: Partial<Pick<Faq, 'question' | 'answer' | 'order_index' | 'is_active'>>): Promise<Faq> {
    const [faq] = await this.db.knex('faqs').where({ id }).update({ ...data, updated_at: this.db.knex.fn.now() }).returning('*');
    return faq as Faq;
  }

  async delete(id: string): Promise<void> {
    await this.db.knex('faqs').where({ id }).delete();
  }
}
