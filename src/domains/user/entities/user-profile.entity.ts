export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  dob: string | null;
  role: 'user' | 'admin';
  is_active: boolean;
  is_verified: boolean;
  is_online: boolean;
  last_seen_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
