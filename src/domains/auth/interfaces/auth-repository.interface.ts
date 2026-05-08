import { User } from '../entities/user.entity';
import { Identity } from '../entities/identity.entity';
import { AuthToken } from '../entities/auth-token.entity';
import { OtpCode } from '../entities/otp-code.entity';

export interface IAuthRepository {
  // Users
  createUser(data: { username: string; display_name: string; phone?: string }): Promise<User>;
  findUserById(id: string): Promise<User | undefined>;
  findUserByUsername(username: string): Promise<User | undefined>;
  createLocalUser(data: {
    username: string;
    display_name: string;
    email: string;
    password_hash: string;
  }): Promise<User>;
  createOAuthUser(data: {
    username: string;
    display_name: string;
    provider: string;
    provider_user_id: string;
    email: string;
  }): Promise<User>;

  // Identities
  createIdentity(data: {
    user_id: string;
    provider: string;
    email: string;
    password_hash?: string;
    provider_user_id?: string;
  }): Promise<Identity>;
  findIdentityByEmail(email: string, provider: string): Promise<Identity | undefined>;
  findIdentityByProviderId(provider: string, providerUserId: string): Promise<Identity | undefined>;
  updateProviderUserId(identityId: string, providerUserId: string): Promise<void>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;

  // Auth Tokens
  createAuthToken(data: {
    user_id: string;
    token_hash: string;
    device_info?: string;
    expires_at: Date;
  }): Promise<AuthToken>;
  findAuthToken(userId: string, tokenHash: string): Promise<AuthToken | undefined>;
  deleteAuthToken(userId: string, tokenHash: string): Promise<void>;

  // OTP Codes
  upsertOtpCode(data: {
    user_id: string;
    code_hash: string;
    purpose: 'reset_password' | 'verify_email';
    expires_at: Date;
  }): Promise<OtpCode>;
  findActiveOtp(userId: string, purpose: string): Promise<OtpCode | undefined>;
  markOtpUsed(id: string): Promise<void>;

  // User Settings
  createUserSettings(userId: string): Promise<void>;
}
