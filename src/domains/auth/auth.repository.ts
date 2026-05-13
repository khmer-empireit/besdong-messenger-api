import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { AuthProvider } from '../../shared/enums';

@Injectable()
export class AuthRepository {
  constructor(private db: DbService) {}

  // ── BD Number ──────────────────────────────────────────────────────────

  async generateBdNumber(): Promise<string> {
    while (true) {
      const digits = Math.floor(10000000 + Math.random() * 90000000).toString();
      const bdNumber = `BD${digits}`;

      const takenByUser = await this.db.knex('users').where({ bd_number: bdNumber }).first();
      if (takenByUser) continue;

      const reserved = await this.db.knex('reserved_bd_numbers').where({ bd_number: bdNumber }).first();
      if (reserved) continue;

      return bdNumber;
    }
  }

  // ── Users ──────────────────────────────────────────────────────────────

  async createUser(data: { username: string; display_name: string; bd_number?: string }) {
    const [user] = await this.db.knex('users').insert(data).returning('*');
    return user;
  }

  async findUserById(id: string) {
    return this.db.knex('users').where({ id }).first();
  }

  async findUserByUsername(username: string) {
    return this.db.knex('users').where({ username }).first();
  }

  async createLocalUser(data: {
    username: string;
    display_name: string;
    email: string;
    password_hash: string;
  }) {
    const bdNumber = await this.generateBdNumber();

    return this.db.knex.transaction(async (trx) => {
      const [user] = await trx('users')
        .insert({ username: data.username, display_name: data.display_name, bd_number: bdNumber })
        .returning('*');

      await trx('user_identities').insert({
        user_id: user.id,
        provider: AuthProvider.Local,
        email: data.email,
        password_hash: data.password_hash,
      });

      await trx('user_settings').insert({ user_id: user.id });

      return user;
    });
  }

  // ── User Identities ────────────────────────────────────────────────────

  async createIdentity(data: {
    user_id: string;
    provider: string;
    email: string;
    password_hash?: string;
    provider_user_id?: string;
  }) {
    const [identity] = await this.db.knex('user_identities').insert(data).returning('*');
    return identity;
  }

  async findIdentityByEmail(email: string, provider: string) {
    return this.db.knex('user_identities').where({ email, provider }).first();
  }

  async findIdentityByProviderId(provider: string, providerUserId: string) {
    return this.db
      .knex('user_identities')
      .where({ provider, provider_user_id: providerUserId })
      .first();
  }

  async updateProviderUserId(identityId: string, providerUserId: string) {
    return this.db
      .knex('user_identities')
      .where({ id: identityId })
      .update({ provider_user_id: providerUserId });
  }

  async createOAuthUser(data: {
    username: string;
    display_name: string;
    provider: string;
    provider_user_id: string;
    email?: string | null;
    avatar_url?: string;
  }) {
    const bdNumber = await this.generateBdNumber();

    return this.db.knex.transaction(async (trx) => {
      const [user] = await trx('users')
        .insert({ username: data.username, display_name: data.display_name, avatar_url: data.avatar_url, bd_number: bdNumber })
        .returning('*');

      await trx('user_identities').insert({
        user_id: user.id,
        provider: data.provider,
        provider_user_id: data.provider_user_id,
        email: data.email ?? null,
      });

      await trx('user_settings').insert({ user_id: user.id });

      return user;
    });
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    return this.db
      .knex('user_identities')
      .where({ user_id: userId, provider: AuthProvider.Local })
      .update({ password_hash: passwordHash });
  }

  // ── Auth Tokens ────────────────────────────────────────────────────────

  async createAuthToken(data: {
    user_id: string;
    token_hash: string;
    device_info?: string;
    expires_at: Date;
  }) {
    const [token] = await this.db.knex('auth_tokens').insert(data).returning('*');
    return token;
  }

  async findAuthToken(userId: string, tokenHash: string) {
    return this.db
      .knex('auth_tokens')
      .where({ user_id: userId, token_hash: tokenHash })
      .where('expires_at', '>', new Date())
      .first();
  }

  async deleteAuthToken(userId: string, tokenHash: string) {
    return this.db.knex('auth_tokens').where({ user_id: userId, token_hash: tokenHash }).delete();
  }

  // ── OTP Codes ──────────────────────────────────────────────────────────

  async upsertOtpCode(data: {
    user_id: string;
    code_hash: string;
    purpose: 'reset_password' | 'verify_email';
    expires_at: Date;
  }) {
    // Delete any existing unused OTP for this user+purpose first
    await this.db
      .knex('otp_codes')
      .where({ user_id: data.user_id, purpose: data.purpose })
      .whereNull('used_at')
      .delete();

    const [otp] = await this.db.knex('otp_codes').insert(data).returning('*');
    return otp;
  }

  async findActiveOtp(userId: string, purpose: string) {
    return this.db
      .knex('otp_codes')
      .where({ user_id: userId, purpose })
      .whereNull('used_at')
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();
  }

  async markOtpUsed(id: string) {
    return this.db.knex('otp_codes').where({ id }).update({ used_at: new Date() });
  }

  // ── User Settings ──────────────────────────────────────────────────────

  async createUserSettings(userId: string) {
    const [settings] = await this.db
      .knex('user_settings')
      .insert({ user_id: userId })
      .returning('*');
    return settings;
  }

  // ── Auth Config ────────────────────────────────────────────────────────

  async isAuthMethodEnabled(method: string): Promise<boolean> {
    const config = await this.db.knex('auth_config').where({ method }).first();
    return config?.is_enabled ?? true;
  }
}
