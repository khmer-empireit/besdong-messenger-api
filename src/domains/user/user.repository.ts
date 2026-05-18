import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { IUserRepository } from './interfaces/user-repository.interface';
import { UserProfile } from './entities/user-profile.entity';
import { UserSettings } from './entities/user-settings.entity';
import { DeviceToken } from './entities/device-token.entity';
import { SaveDeviceTokenDto } from './dto/save-device-token.dto';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private db: DbService) {}

  async findById(id: string): Promise<UserProfile | undefined> {
    return this.db.knex('users').where({ id }).first() as Promise<UserProfile | undefined>;
  }

  async findByName(query: string, limit = 20, offset = 0): Promise<UserProfile[]> {
    return this.db
      .knex('users')
      .where('username', 'ilike', `%${query}%`)
      .orWhere('display_name', 'ilike', `%${query}%`)
      .orderBy('username', 'asc')
      .limit(limit)
      .offset(offset) as Promise<UserProfile[]>;
  }

  async findByBdNumber(bdNumber: string): Promise<UserProfile[]> {
    const user = await this.db.knex('users').where({ bd_number: bdNumber }).first();
    return user ? [user as UserProfile] : [];
  }

  async findByIdentifier(identifier: string): Promise<UserProfile[]> {
    return this.findByName(identifier);
  }

  async updateProfile(
    id: string,
    data: Partial<Pick<UserProfile, 'display_name' | 'avatar_url' | 'bio' | 'dob'>>,
  ): Promise<UserProfile> {
    const [user] = await this.db.knex('users').where({ id }).update(data).returning('*');
    return user as UserProfile;
  }

  async search(query: string): Promise<UserProfile[]> {
    return this.db
      .knex('users')
      .where('username', 'ilike', `%${query}%`)
      .orWhere('display_name', 'ilike', `%${query}%`)
      .limit(20) as Promise<UserProfile[]>;
  }

  async isContact(ownerId: string, contactId: string): Promise<boolean> {
    const row = await this.db.knex('contacts').where({ owner_id: ownerId, contact_id: contactId }).first();
    return !!row;
  }

  async getSettings(userId: string): Promise<UserSettings | undefined> {
    return this.db
      .knex('user_settings')
      .where({ user_id: userId })
      .first() as Promise<UserSettings | undefined>;
  }

  async updateSettings(
    userId: string,
    data: Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>,
  ): Promise<UserSettings> {
    const [settings] = await this.db
      .knex('user_settings')
      .where({ user_id: userId })
      .update(data)
      .returning('*');
    return settings as UserSettings;
  }

  async setOnlineStatus(userId: string, isOnline: boolean, lastSeenAt?: Date): Promise<void> {
    const update: Record<string, unknown> = { is_online: isOnline };
    if (!isOnline && lastSeenAt) update.last_seen_at = lastSeenAt;
    await this.db.knex('users').where({ id: userId }).update(update);
  }

  async saveDeviceToken(userId: string, dto: SaveDeviceTokenDto): Promise<void> {
    await this.db
      .knex('device_tokens')
      .insert({
        user_id: userId,
        token: dto.token,
        platform: dto.platform,
        device_name: dto.device_name ?? null,
        os_version: dto.os_version ?? null,
        app_version: dto.app_version ?? null,
        address: dto.address ?? null,
        last_login_at: this.db.knex.fn.now(),
      })
      .onConflict('token')
      .merge({
        user_id: userId,
        device_name: dto.device_name ?? null,
        os_version: dto.os_version ?? null,
        app_version: dto.app_version ?? null,
        address: dto.address ?? null,
        last_login_at: this.db.knex.fn.now(),
      });
  }

  async getDeviceTokens(userId: string): Promise<string[]> {
    const rows = await this.db.knex('device_tokens').where({ user_id: userId }).select('token');
    return rows.map((r: { token: string }) => r.token);
  }

  async listDeviceTokens(userId: string): Promise<DeviceToken[]> {
    const rows = await this.db
      .knex('device_tokens')
      .where({ user_id: userId })
      .orderBy('last_login_at', 'desc');
    return rows.map((r: Omit<DeviceToken, 'is_active'>) => ({ ...r, is_active: true }));
  }

  async removeDeviceToken(userId: string, token: string): Promise<void> {
    await this.db.knex('device_tokens').where({ user_id: userId, token }).delete();
  }

  async purgeDeviceToken(token: string): Promise<void> {
    await this.db.knex('device_tokens').where({ token }).delete();
  }
}
