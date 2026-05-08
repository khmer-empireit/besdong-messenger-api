export interface AuthToken {
  id: string;
  user_id: string;
  token_hash: string;
  device_info: string | null;
  expires_at: Date;
  created_at: Date;
}
