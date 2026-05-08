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

  async updateProfile(
    id: string,
    data: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>,
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
