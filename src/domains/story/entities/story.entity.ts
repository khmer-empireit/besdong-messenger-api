import { StoryMediaType } from '../../../shared/enums';

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_key: string;
  media_type: StoryMediaType;
  caption: string | null;
  expires_at: Date;
  created_at: Date;
}

export interface StoryWithMeta extends Story {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  view_count: number;
  is_viewed: boolean;
}
