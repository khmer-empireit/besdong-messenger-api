export interface StickerPack {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string;
  is_active: boolean;
  created_at: Date;
}
