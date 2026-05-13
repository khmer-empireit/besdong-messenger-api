import { AuthProvider } from '../../../shared/enums';

export { AuthProvider };

export type AuthMethod = AuthProvider;

export interface AuthConfig {
  id: string;
  method: AuthMethod;
  is_enabled: boolean;
  updated_at: Date;
}
