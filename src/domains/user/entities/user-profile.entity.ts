import { UserRole } from '../../../shared/enums';

export { UserRole };

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  bd_number: string | null;
  avatar_url: string | null;
  bio: string | null;
  dob: string | null;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  is_online: boolean;
  last_seen_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
