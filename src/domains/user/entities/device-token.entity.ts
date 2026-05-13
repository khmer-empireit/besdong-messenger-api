import { DevicePlatform } from '../../../shared/enums';

export interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: DevicePlatform;
  created_at: Date;
}
