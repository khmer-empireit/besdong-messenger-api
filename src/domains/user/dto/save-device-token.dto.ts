import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DevicePlatform } from '../../../shared/enums';

export class SaveDeviceTokenDto {
  @ApiProperty({ example: 'fcm-token-string' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ enum: DevicePlatform })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @ApiPropertyOptional({ example: 'Samsung S24 Ultra' })
  @IsOptional()
  @IsString()
  device_name?: string;

  @ApiPropertyOptional({ example: 'Android 14' })
  @IsOptional()
  @IsString()
  os_version?: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  app_version?: string;

  @ApiPropertyOptional({ example: 'Phnom Penh, Cambodia' })
  @IsOptional()
  @IsString()
  address?: string;
}
