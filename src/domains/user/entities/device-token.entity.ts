import { DevicePlatform } from '../../../shared/enums';

export interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: DevicePlatform;
  device_name: string | null;
  os_version: string | null;
  app_version: string | null;
  address: string | null;
  last_login_at: Date;
  created_at: Date;
  is_active: boolean;
}
