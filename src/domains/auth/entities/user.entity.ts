export interface User {
  id: string;
  username: string;
  display_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_online: boolean;
  last_seen_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
