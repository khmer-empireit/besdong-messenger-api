import { ParticipantRole } from '../../../shared/enums';

export { ParticipantRole };

export interface Participant {
  conversation_id: string;
  user_id: string;
  role: ParticipantRole;
  joined_at: Date;
  muted_until: Date | null;
  last_read_at: Date | null;
  is_pinned: boolean;
}
