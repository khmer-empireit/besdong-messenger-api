export interface UserSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  last_seen_visibility: 'everyone' | 'contacts' | 'nobody';
  read_receipts_enabled: boolean;
  online_status_visible: boolean;
  profile_photo_visibility: 'everyone' | 'contacts' | 'nobody';
  notifications_enabled: boolean;
  message_previews_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}
