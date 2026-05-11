export interface UserSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  last_seen_visibility: 'everyone' | 'contacts' | 'nobody';
  profile_photo_visibility: 'everyone' | 'contacts' | 'nobody';
  bd_number_visibility: 'everyone' | 'contacts' | 'nobody';
  read_receipts_enabled: boolean;
  online_status_visible: boolean;
  notifications_enabled: boolean;
  message_previews_enabled: boolean;
  groups_add_permission: 'everyone' | 'contacts' | 'nobody';
  chat_wallpaper_type: 'none' | 'gallery' | 'color';
  chat_wallpaper_value: string | null;
  font_size: 'small' | 'medium' | 'large' | 'extra_large';
  do_not_disturb: boolean;
  notify_messages: boolean;
  notify_groups: boolean;
  notify_calls: boolean;
  auto_download_wifi: boolean;
  auto_download_cellular: boolean;
  created_at: Date;
  updated_at: Date;
}
