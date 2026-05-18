export interface StoryView {
  story_id: string;
  viewer_id: string;
  viewed_at: Date;
}

export interface StoryViewWithProfile extends StoryView {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}
