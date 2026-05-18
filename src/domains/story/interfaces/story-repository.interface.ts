import { Story, StoryWithMeta } from '../entities/story.entity';
import { StoryViewWithProfile } from '../entities/story-view.entity';
import { StoryMediaType } from '../../../shared/enums';

export interface IStoryRepository {
  create(data: {
    user_id: string;
    media_url: string;
    media_key: string;
    media_type: StoryMediaType;
    caption?: string;
    expires_at: Date;
  }): Promise<Story>;
  findById(id: string): Promise<Story | undefined>;
  findByIdWithMeta(id: string, viewerId: string): Promise<StoryWithMeta | undefined>;
  findByUserId(userId: string): Promise<Story[]>;
  findFeedForUser(userId: string): Promise<StoryWithMeta[]>;
  getContactIds(userId: string): Promise<string[]>;
  addView(storyId: string, viewerId: string): Promise<void>;
  getViews(storyId: string): Promise<StoryViewWithProfile[]>;
  delete(id: string): Promise<void>;
}
