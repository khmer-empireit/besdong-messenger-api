import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { IStoryRepository } from './interfaces/story-repository.interface';
import { Story, StoryWithMeta } from './entities/story.entity';
import { StoryViewWithProfile } from './entities/story-view.entity';
import { StoryMediaType } from '../../shared/enums';

@Injectable()
export class StoryRepository implements IStoryRepository {
  constructor(private db: DbService) {}

  async create(data: {
    user_id: string;
    media_url: string;
    media_key: string;
    media_type: StoryMediaType;
    caption?: string;
    expires_at: Date;
  }): Promise<Story> {
    const [story] = await this.db.knex('stories').insert(data).returning('*');
    return story as Story;
  }

  async findById(id: string): Promise<Story | undefined> {
    return this.db.knex('stories').where({ id }).first() as Promise<Story | undefined>;
  }

  async findByIdWithMeta(id: string, viewerId: string): Promise<StoryWithMeta | undefined> {
    const row = await this.db.knex
      .select(
        's.*',
        'u.username',
        'u.display_name',
        'u.avatar_url',
        this.db.knex.raw('COUNT(sv.viewer_id)::int AS view_count'),
        this.db.knex.raw('BOOL_OR(sv.viewer_id = ?) AS is_viewed', [viewerId]),
      )
      .from('stories as s')
      .join('users as u', 'u.id', 's.user_id')
      .leftJoin('story_views as sv', 'sv.story_id', 's.id')
      .where('s.id', id)
      .groupBy('s.id', 'u.username', 'u.display_name', 'u.avatar_url')
      .first();
    return row as StoryWithMeta | undefined;
  }

  async findByUserId(userId: string): Promise<Story[]> {
    return this.db.knex('stories').where({ user_id: userId }).orderBy('created_at', 'desc') as Promise<Story[]>;
  }

  async findFeedForUser(userId: string): Promise<StoryWithMeta[]> {
    return this.db.knex
      .select(
        's.*',
        'u.username',
        'u.display_name',
        'u.avatar_url',
        this.db.knex.raw('COUNT(sv.viewer_id)::int AS view_count'),
        this.db.knex.raw('BOOL_OR(sv.viewer_id = ?) AS is_viewed', [userId]),
      )
      .from('stories as s')
      .join('users as u', 'u.id', 's.user_id')
      .join('contacts as c', function () {
        this.on('c.contact_id', 's.user_id').andOnVal('c.owner_id', userId);
      })
      .leftJoin('story_views as sv', 'sv.story_id', 's.id')
      .where('s.expires_at', '>', this.db.knex.fn.now())
      .groupBy('s.id', 'u.username', 'u.display_name', 'u.avatar_url')
      .orderBy('s.created_at', 'desc') as Promise<StoryWithMeta[]>;
  }

  async getContactIds(userId: string): Promise<string[]> {
    const rows = await this.db.knex('contacts').where({ owner_id: userId }).select('contact_id');
    return rows.map((r: { contact_id: string }) => r.contact_id);
  }

  async addView(storyId: string, viewerId: string): Promise<void> {
    await this.db.knex('story_views')
      .insert({ story_id: storyId, viewer_id: viewerId })
      .onConflict(['story_id', 'viewer_id'])
      .ignore();
  }

  async getViews(storyId: string): Promise<StoryViewWithProfile[]> {
    return this.db.knex('story_views as sv')
      .join('users as u', 'u.id', 'sv.viewer_id')
      .where('sv.story_id', storyId)
      .select('sv.story_id', 'sv.viewer_id', 'sv.viewed_at', 'u.username', 'u.display_name', 'u.avatar_url')
      .orderBy('sv.viewed_at', 'desc') as Promise<StoryViewWithProfile[]>;
  }

  async delete(id: string): Promise<void> {
    await this.db.knex('stories').where({ id }).delete();
  }
}
