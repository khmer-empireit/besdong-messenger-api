import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

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

  async search(query: string) {
    return this.repo.search(query.trim());
  }

  async getPublicProfile(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const { id, username, display_name, avatar_url, bio, is_online, last_seen_at } = user;
    return { id, username, display_name, avatar_url, bio, is_online, last_seen_at };
  }
}
