import { StickerPack } from '../entities/sticker-pack.entity';
import { Sticker } from '../entities/sticker.entity';

export interface IStickerRepository {
  findActivePacks(): Promise<StickerPack[]>;
  findPackById(id: string): Promise<StickerPack | undefined>;
  findStickersByPackId(packId: string): Promise<Sticker[]>;
  findStickerById(id: string): Promise<Sticker | undefined>;
}
