export interface Participant {
  conversation_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: Date;
  muted_until: Date | null;
  last_read_at: Date | null;
}
