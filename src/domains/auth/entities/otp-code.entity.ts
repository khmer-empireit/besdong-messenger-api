export interface OtpCode {
  id: string;
  user_id: string;
  code_hash: string;
  purpose: 'reset_password' | 'verify_email';
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}
