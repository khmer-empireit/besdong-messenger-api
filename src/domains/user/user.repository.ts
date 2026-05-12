import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { IUserRepository } from './interfaces/user-repository.interface';
import { UserProfile } from './entities/user-profile.entity';
import { UserSettings } from './entities/user-settings.entity';

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
    data: Partial<Pick<UserProfile, 'bd_number' | 'display_name' | 'avatar_url' | 'bio' | 'dob'>>,
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
}
