import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { DevicePlatform } from '../../shared/enums';

@Injectable()
export class UserService {
  constructor(private repo: UserRepository) {}

  async getProfile(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.repo.updateProfile(userId, dto);
  }

  async getSettings(userId: string) {
    const settings = await this.repo.getSettings(userId);
    if (!settings) throw new NotFoundException('Settings not found');
    return settings;
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const settings = await this.repo.getSettings(userId);
    if (!settings) throw new NotFoundException('Settings not found');
    return this.repo.updateSettings(userId, dto);
  }

  async findByIdentifier(identifier: string) {
    return this.repo.findByIdentifier(identifier.trim());
  }

  async findByName(query: string, limit?: number, offset?: number) {
    return this.repo.findByName(query.trim(), limit, offset);
  }

  async findByBdNumber(bdNumber: string) {
    return this.repo.findByBdNumber(bdNumber.trim().toUpperCase());
  }

  async search(query: string) {
    return this.repo.search(query.trim());
  }

  async setOnlineStatus(userId: string, isOnline: boolean, lastSeenAt?: Date): Promise<void> {
    await this.repo.setOnlineStatus(userId, isOnline, lastSeenAt);
  }

  async saveDeviceToken(userId: string, token: string, platform: DevicePlatform): Promise<void> {
    await this.repo.saveDeviceToken(userId, token, platform);
  }

  async removeDeviceToken(userId: string, token: string): Promise<void> {
    await this.repo.removeDeviceToken(userId, token);
  }

  async getDeviceTokens(userId: string): Promise<string[]> {
    return this.repo.getDeviceTokens(userId);
  }

  async purgeDeviceToken(token: string): Promise<void> {
    await this.repo.purgeDeviceToken(token);
  }

  async getPublicProfile(targetUserId: string, requesterId: string) {
    const user = await this.repo.findById(targetUserId);
    if (!user) throw new NotFoundException('User not found');

    let { is_online, last_seen_at } = user;

    if (requesterId !== targetUserId) {
      const settings = await this.repo.getSettings(targetUserId);
      const visibility = settings?.last_seen_visibility ?? 'everyone';

      if (visibility === 'nobody') {
        is_online = false;
        last_seen_at = null;
      } else if (visibility === 'contacts') {
        const isContact = await this.repo.isContact(targetUserId, requesterId);
        if (!isContact) {
          is_online = false;
          last_seen_at = null;
        }
      }
    }

    const { id, username, display_name, avatar_url, bio } = user;
    return { id, username, display_name, avatar_url, bio, is_online, last_seen_at };
  }
}
