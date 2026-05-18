import { ApiProperty } from '@nestjs/swagger';
import { DevicePlatform } from '../../../shared/enums';

class DeviceTokenData {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  user_id: string;

  @ApiProperty({ example: 'fcm-token-string' })
  token: string;

  @ApiProperty({ enum: DevicePlatform, example: DevicePlatform.Android })
  platform: DevicePlatform;

  @ApiProperty({ example: 'Pixel 7', nullable: true })
  device_name: string | null;

  @ApiProperty({ example: 'Android 14', nullable: true })
  os_version: string | null;

  @ApiProperty({ example: '1.2.3', nullable: true })
  app_version: string | null;

  @ApiProperty({ example: '192.168.1.1', nullable: true })
  address: string | null;

  @ApiProperty()
  last_login_at: Date;

  @ApiProperty()
  created_at: Date;

  @ApiProperty({ example: true })
  is_active: boolean;
}

class DeviceTokenActionData {
  @ApiProperty({ example: 'Token saved' })
  message: string;
}

export class DeviceTokenListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [DeviceTokenData] })
  data: DeviceTokenData[];
}

export class DeviceTokenActionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: DeviceTokenActionData })
  data: DeviceTokenActionData;
}
