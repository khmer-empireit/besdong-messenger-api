import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DevicePlatform } from '../../../shared/enums';

export class SaveDeviceTokenDto {
  @ApiProperty({ example: 'fcm-token-string' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ enum: DevicePlatform })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;
}
