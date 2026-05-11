export type AuthMethod = 'local' | 'google' | 'facebook' | 'apple' | 'telegram';

export interface AuthConfig {
  id: string;
  method: AuthMethod;
  is_enabled: boolean;
  updated_at: Date;
}
