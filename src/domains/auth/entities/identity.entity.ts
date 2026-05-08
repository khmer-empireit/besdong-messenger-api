export interface Identity {
  id: string;
  user_id: string;
  provider: 'local' | 'google' | 'facebook' | 'apple';
  provider_user_id: string | null;
  email: string;
  password_hash: string | null;
  created_at: Date;
}
