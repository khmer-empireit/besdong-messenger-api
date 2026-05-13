import { ConversationType } from '../../../shared/enums';

export { ConversationType };

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}
