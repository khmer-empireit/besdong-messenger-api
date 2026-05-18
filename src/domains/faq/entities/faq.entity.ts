export interface Faq {
  id: string;
  question: string;
  answer: string;
  order_index: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
