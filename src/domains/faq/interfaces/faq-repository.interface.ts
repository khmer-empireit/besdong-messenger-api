import { Faq } from '../entities/faq.entity';

export interface IFaqRepository {
  findActive(): Promise<Faq[]>;
  findById(id: string): Promise<Faq | undefined>;
  create(data: Pick<Faq, 'question' | 'answer' | 'order_index'>): Promise<Faq>;
  update(id: string, data: Partial<Pick<Faq, 'question' | 'answer' | 'order_index' | 'is_active'>>): Promise<Faq>;
  delete(id: string): Promise<void>;
}
