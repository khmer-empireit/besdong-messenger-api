import { UserProfile } from '../entities/user-profile.entity';
import { UserSettings } from '../entities/user-settings.entity';

export interface IUserRepository {
  findById(id: string): Promise<UserProfile | undefined>;
  findByIdentifier(identifier: string): Promise<UserProfile[]>;
  findByName(query: string, limit?: number, offset?: number): Promise<UserProfile[]>;
  findByBdNumber(bdNumber: string): Promise<UserProfile[]>;
  updateProfile(id: string, data: Partial<Pick<UserProfile, 'bd_number' | 'display_name' | 'avatar_url' | 'bio' | 'dob'>>): Promise<UserProfile>;
  search(query: string): Promise<UserProfile[]>;
  getSettings(userId: string): Promise<UserSettings | undefined>;
  updateSettings(userId: string, data: Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserSettings>;
}
