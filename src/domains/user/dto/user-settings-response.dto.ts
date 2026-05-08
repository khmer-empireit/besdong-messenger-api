import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ example: true })
  read_receipts_enabled: boolean;

  @ApiProperty({ example: true })
  online_status_visible: boolean;

  @ApiProperty({ example: true })
  notifications_enabled: boolean;

  @ApiProperty({ example: true })
  message_previews_enabled: boolean;

  @ApiProperty({ example: '2026-05-06T08:06:32.980Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-05-06T08:06:32.980Z' })
  updated_at: Date;
}

export class UserSettingsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UserSettingsData })
  data: UserSettingsData;
}
