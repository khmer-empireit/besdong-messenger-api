import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UserSettingsData {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  user_id: string;

  @ApiProperty({ enum: ['light', 'dark', 'system'], example: 'system' })
  theme: string;

  @ApiProperty({ example: 'en' })
  language: string;

  @ApiProperty({ enum: ['everyone', 'contacts', 'nobody'], example: 'everyone' })
  last_seen_visibility: string;

  @ApiProperty({ enum: ['everyone', 'contacts', 'nobody'], example: 'everyone' })
  profile_photo_visibility: string;

  @ApiProperty({ enum: ['everyone', 'contacts', 'nobody'], example: 'contacts' })
  bd_number_visibility: string;

  @ApiProperty({ enum: ['everyone', 'contacts', 'nobody'], example: 'everyone' })
  groups_add_permission: string;

  @ApiProperty({ example: true })
  read_receipts_enabled: boolean;

  @ApiProperty({ example: true })
  online_status_visible: boolean;

  @ApiProperty({ example: true })
  notifications_enabled: boolean;

  @ApiProperty({ example: true })
  message_previews_enabled: boolean;

  @ApiProperty({ enum: ['none', 'gallery', 'color'], example: 'none' })
  chat_wallpaper_type: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  chat_wallpaper_value: string | null;

  @ApiProperty({ enum: ['small', 'medium', 'large', 'extra_large'], example: 'medium' })
  font_size: string;

  @ApiProperty({ example: false })
  do_not_disturb: boolean;

  @ApiProperty({ example: true })
  notify_messages: boolean;

  @ApiProperty({ example: true })
  notify_groups: boolean;

  @ApiProperty({ example: true })
  notify_calls: boolean;

  @ApiProperty({ example: true })
  auto_download_wifi: boolean;

  @ApiProperty({ example: false })
  auto_download_cellular: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class UserSettingsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UserSettingsData })
  data: UserSettingsData;
}
