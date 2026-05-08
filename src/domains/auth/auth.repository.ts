import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { IAuthRepository } from './interfaces/auth-repository.interface';
import { User } from './entities/user.entity';
import { Identity } from './entities/identity.entity';
import { AuthToken } from './entities/auth-token.entity';
import { OtpCode } from './entities/otp-code.entity';

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(private db: DbService) {}

  // ── Users ──────────────────────────────────────────────────────────────

  async createUser(data: { username: string; display_name: string; phone?: string }): Promise<User> {
    const [user] = await this.db.knex('users').insert(data).returning('*');
    return user as User;
  }

  async findUserById(id: string): Promise<User | undefined> {
    return this.db.knex('users').where({ id }).first() as Promise<User | undefined>;
  }

  async findUserByUsername(username: string): Promise<User | undefined> {
    return this.db.knex('users').where({ username }).first() as Promise<User | undefined>;
  }

  async createLocalUser(data: {
    username: string;
    display_name: string;
    email: string;
    password_hash: string;
  }): Promise<User> {
    return this.db.knex.transaction(async (trx) => {
      const [user] = await trx('users')
        .insert({ username: data.username, display_name: data.display_name })
        .returning('*');

      await trx('user_identities').insert({
        user_id: user.id,
        provider: 'local',
        email: data.email,
        password_hash: data.password_hash,
      });

      await trx('user_settings').insert({ user_id: user.id });

      return user as User;
    });
  }

  // ── User Identities ────────────────────────────────────────────────────

  async createIdentity(data: {
    user_id: string;
    provider: string;
    email: string;
    password_hash?: string;
    provider_user_id?: string;
  }): Promise<Identity> {
    const [identity] = await this.db.knex('user_identities').insert(data).returning('*');
    return identity as Identity;
  }

  async findIdentityByEmail(email: string, provider: string): Promise<Identity | undefined> {
    return this.db.knex('user_identities').where({ email, provider }).first() as Promise<Identity | undefined>;
  }

  async findIdentityByProviderId(provider: string, providerUserId: string): Promise<Identity | undefined> {
    return this.db
      .knex('user_identities')
      .where({ provider, provider_user_id: providerUserId })
      .first() as Promise<Identity | undefined>;
  }

  async updateProviderUserId(identityId: string, providerUserId: string): Promise<void> {
    await this.db
      .knex('user_identities')
      .where({ id: identityId })
      .update({ provider_user_id: providerUserId });
  }

  async createOAuthUser(data: {
    username: string;
    display_name: string;
    provider: string;
    provider_user_id: string;
    email: string;
  }): Promise<User> {
    return this.db.knex.transaction(async (trx) => {
      const [user] = await trx('users')
        .insert({ username: data.username, display_name: data.display_name })
        .returning('*');

      await trx('user_identities').insert({
        user_id: user.id,
        provider: data.provider,
        provider_user_id: data.provider_user_id,
        email: data.email,
      });

      await trx('user_settings').insert({ user_id: user.id });

      return user as User;
    });
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .knex('user_identities')
      .where({ user_id: userId, provider: 'local' })
      .update({ password_hash: passwordHash });
  }

  // ── Auth Tokens ────────────────────────────────────────────────────────

  async createAuthToken(data: {
    user_id: string;
    token_hash: string;
    device_info?: string;
    expires_at: Date;
  }): Promise<AuthToken> {
    const [token] = await this.db.knex('auth_tokens').insert(data).returning('*');
    return token as AuthToken;
  }

  async findAuthToken(userId: string, tokenHash: string): Promise<AuthToken | undefined> {
    return this.db
      .knex('auth_tokens')
      .where({ user_id: userId, token_hash: tokenHash })
      .where('expires_at', '>', new Date())
      .first() as Promise<AuthToken | undefined>;
  }

  async deleteAuthToken(userId: string, tokenHash: string): Promise<void> {
    await this.db.knex('auth_tokens').where({ user_id: userId, token_hash: tokenHash }).delete();
  }

  // ── OTP Codes ──────────────────────────────────────────────────────────

  async upsertOtpCode(data: {
    user_id: string;
    code_hash: string;
    purpose: 'reset_password' | 'verify_email';
    expires_at: Date;
  }): Promise<OtpCode> {
    await this.db
      .knex('otp_codes')
      .where({ user_id: data.user_id, purpose: data.purpose })
      .whereNull('used_at')
      .delete();

    const [otp] = await this.db.knex('otp_codes').insert(data).returning('*');
    return otp as OtpCode;
  }

  async findActiveOtp(userId: string, purpose: string): Promise<OtpCode | undefined> {
    return this.db
      .knex('otp_codes')
      .where({ user_id: userId, purpose })
      .whereNull('used_at')
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first() as Promise<OtpCode | undefined>;
  }

  async markOtpUsed(id: string): Promise<void> {
    await this.db.knex('otp_codes').where({ id }).update({ used_at: new Date() });
  }

  // ── User Settings ──────────────────────────────────────────────────────

  async createUserSettings(userId: string): Promise<void> {
    await this.db.knex('user_settings').insert({ user_id: userId }).returning('*');
  }
}
