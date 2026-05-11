import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ enum: ['light', 'dark', 'system'], description: 'App color theme' })
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: 'light' | 'dark' | 'system';

  @ApiPropertyOptional({ example: 'en', description: 'UI language code (e.g. en, km)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({ enum: ['everyone', 'contacts', 'nobody'], description: 'Who can see your last seen time' })
  @IsOptional()
  @IsIn(['everyone', 'contacts', 'nobody'])
  last_seen_visibility?: 'everyone' | 'contacts' | 'nobody';

  @ApiPropertyOptional({ enum: ['everyone', 'contacts', 'nobody'], description: 'Who can see your profile photo' })
  @IsOptional()
  @IsIn(['everyone', 'contacts', 'nobody'])
  profile_photo_visibility?: 'everyone' | 'contacts' | 'nobody';

  @ApiPropertyOptional({ enum: ['everyone', 'contacts', 'nobody'], description: 'Who can see your BD number' })
  @IsOptional()
  @IsIn(['everyone', 'contacts', 'nobody'])
  bd_number_visibility?: 'everyone' | 'contacts' | 'nobody';

  @ApiPropertyOptional({ enum: ['everyone', 'contacts', 'nobody'], description: 'Who can add you to groups' })
  @IsOptional()
  @IsIn(['everyone', 'contacts', 'nobody'])
  groups_add_permission?: 'everyone' | 'contacts' | 'nobody';

  @ApiPropertyOptional({ description: 'Whether others can see when you have read their messages' })
  @IsOptional()
  @IsBoolean()
  read_receipts_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Whether your online status is visible to others' })
  @IsOptional()
  @IsBoolean()
  online_status_visible?: boolean;

  @ApiPropertyOptional({ description: 'Master switch for all push notifications' })
  @IsOptional()
  @IsBoolean()
  notifications_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Show message content in notification previews' })
  @IsOptional()
  @IsBoolean()
  message_previews_enabled?: boolean;

  @ApiPropertyOptional({ enum: ['none', 'gallery', 'color'], description: 'Chat background type' })
  @IsOptional()
  @IsIn(['none', 'gallery', 'color'])
  chat_wallpaper_type?: 'none' | 'gallery' | 'color';

  @ApiPropertyOptional({ example: '#1a1a2e', description: 'Image URL (gallery) or hex color (color) for chat wallpaper' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  chat_wallpaper_value?: string;

  @ApiPropertyOptional({ enum: ['small', 'medium', 'large', 'extra_large'], description: 'Chat font size' })
  @IsOptional()
  @IsIn(['small', 'medium', 'large', 'extra_large'])
  font_size?: 'small' | 'medium' | 'large' | 'extra_large';

  @ApiPropertyOptional({ description: 'Silence all notifications when enabled' })
  @IsOptional()
  @IsBoolean()
  do_not_disturb?: boolean;

  @ApiPropertyOptional({ description: 'Notify on new direct messages' })
  @IsOptional()
  @IsBoolean()
  notify_messages?: boolean;

  @ApiPropertyOptional({ description: 'Notify on new group messages' })
  @IsOptional()
  @IsBoolean()
  notify_groups?: boolean;

  @ApiPropertyOptional({ description: 'Notify on incoming calls' })
  @IsOptional()
  @IsBoolean()
  notify_calls?: boolean;

  @ApiPropertyOptional({ description: 'Auto-download media files when on Wi-Fi' })
  @IsOptional()
  @IsBoolean()
  auto_download_wifi?: boolean;

  @ApiPropertyOptional({ description: 'Auto-download media files when on cellular data' })
  @IsOptional()
  @IsBoolean()
  auto_download_cellular?: boolean;
}
