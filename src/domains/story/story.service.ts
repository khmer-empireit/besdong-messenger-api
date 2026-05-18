import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { StoryRepository } from './story.repository';
import { CreateStoryDto } from './dto/create-story.dto';
import { MessageGateway } from '../message/message.gateway';
import { StorageService } from '../../infrastructure/storage/storage.service';

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class StoryService {
  constructor(
    private repo: StoryRepository,
    private gateway: MessageGateway,
    private storage: StorageService,
  ) {}

  async create(userId: string, dto: CreateStoryDto) {
    const expires_at = new Date(Date.now() + STORY_TTL_MS);
    const story = await this.repo.create({ ...dto, user_id: userId, expires_at });
    const contactIds = await this.repo.getContactIds(userId);
    if (contactIds.length) {
      this.gateway.broadcastStory(contactIds, story);
    }
    return story;
  }

  async getFeed(userId: string) {
    return this.repo.findFeedForUser(userId);
  }

  async getMine(userId: string) {
    return this.repo.findByUserId(userId);
  }

  async view(storyId: string, viewerId: string) {
    const story = await this.repo.findById(storyId);
    if (!story || story.expires_at < new Date()) throw new NotFoundException('Story not found or expired');

    if (viewerId !== story.user_id) {
      await this.repo.addView(storyId, viewerId);
    }

    return this.repo.findByIdWithMeta(storyId, viewerId);
  }

  async delete(storyId: string, userId: string) {
    const story = await this.repo.findById(storyId);
    if (!story) throw new NotFoundException('Story not found');
    if (story.user_id !== userId) throw new ForbiddenException('Cannot delete another user\'s story');

    await this.storage.delete(story.media_key).catch(() => {});
    await this.repo.delete(storyId);
  }

  async getViews(storyId: string, userId: string) {
    const story = await this.repo.findById(storyId);
    if (!story) throw new NotFoundException('Story not found');
    if (story.user_id !== userId) throw new ForbiddenException('Only the story owner can view the viewer list');
    return this.repo.getViews(storyId);
  }
}
