import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ enum: ['light', 'dark', 'system'] })
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: 'light' | 'dark' | 'system';

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({ enum: ['everyone', 'contacts', 'nobody'] })
  @IsOptional()
  @IsIn(['everyone', 'contacts', 'nobody'])
  last_seen_visibility?: 'everyone' | 'contacts' | 'nobody';

  @ApiPropertyOptional({ enum: ['everyone', 'contacts', 'nobody'] })
  @IsOptional()
  @IsIn(['everyone', 'contacts', 'nobody'])
  profile_photo_visibility?: 'everyone' | 'contacts' | 'nobody';

  @ApiPropertyOptional({ enum: ['everyone', 'contacts', 'nobody'] })
  @IsOptional()
  @IsIn(['everyone', 'contacts', 'nobody'])
  phone_number_visibility?: 'everyone' | 'contacts' | 'nobody';

  @ApiPropertyOptional({ enum: ['everyone', 'contacts', 'nobody'] })
  @IsOptional()
  @IsIn(['everyone', 'contacts', 'nobody'])
  groups_add_permission?: 'everyone' | 'contacts' | 'nobody';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  read_receipts_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  online_status_visible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifications_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  message_previews_enabled?: boolean;

  @ApiPropertyOptional({ enum: ['none', 'gallery', 'color'] })
  @IsOptional()
  @IsIn(['none', 'gallery', 'color'])
  chat_wallpaper_type?: 'none' | 'gallery' | 'color';

  @ApiPropertyOptional({ example: '#1a1a2e', description: 'URL for gallery wallpaper or hex color for color wallpaper' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  chat_wallpaper_value?: string;

  @ApiPropertyOptional({ enum: ['small', 'medium', 'large', 'extra_large'] })
  @IsOptional()
  @IsIn(['small', 'medium', 'large', 'extra_large'])
  font_size?: 'small' | 'medium' | 'large' | 'extra_large';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  do_not_disturb?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notify_messages?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notify_groups?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notify_calls?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  auto_download_wifi?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  auto_download_cellular?: boolean;
}
