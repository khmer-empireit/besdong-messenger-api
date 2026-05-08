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
}
