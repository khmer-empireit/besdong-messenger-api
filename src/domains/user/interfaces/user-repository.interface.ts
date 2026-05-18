import { UserProfile } from '../entities/user-profile.entity';
import { UserSettings } from '../entities/user-settings.entity';
import { DeviceToken } from '../entities/device-token.entity';
import { SaveDeviceTokenDto } from '../dto/save-device-token.dto';

export interface IUserRepository {
  findById(id: string): Promise<UserProfile | undefined>;
  findByUsername(username: string): Promise<UserProfile | undefined>;
  findByIdentifier(identifier: string): Promise<UserProfile[]>;
  findByName(query: string, limit?: number, offset?: number): Promise<UserProfile[]>;
  findByBdNumber(bdNumber: string): Promise<UserProfile[]>;
  updateProfile(id: string, data: Partial<Pick<UserProfile, 'username' | 'display_name' | 'avatar_url' | 'bio' | 'dob'>>): Promise<UserProfile>;
  getSharedMedia(currentUserId: string, targetUserId: string, types: string[], cursor?: string, limit?: number): Promise<{ items: any[]; next_cursor: string | null }>;
  isContact(ownerId: string, contactId: string): Promise<boolean>;
  setOnlineStatus(userId: string, isOnline: boolean, lastSeenAt?: Date): Promise<void>;
  search(query: string): Promise<UserProfile[]>;
  getSettings(userId: string): Promise<UserSettings | undefined>;
  updateSettings(userId: string, data: Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserSettings>;
  saveDeviceToken(userId: string, dto: SaveDeviceTokenDto): Promise<void>;
  getDeviceTokens(userId: string): Promise<string[]>;
  listDeviceTokens(userId: string): Promise<DeviceToken[]>;
  removeDeviceToken(userId: string, token: string): Promise<void>;
  purgeDeviceToken(token: string): Promise<void>;
}
