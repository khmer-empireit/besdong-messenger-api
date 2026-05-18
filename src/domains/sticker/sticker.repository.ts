import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { IStickerRepository } from './interfaces/sticker-repository.interface';
import { StickerPack } from './entities/sticker-pack.entity';
import { Sticker } from './entities/sticker.entity';

@Injectable()
export class StickerRepository implements IStickerRepository {
  constructor(private db: DbService) {}

  async findActivePacks(): Promise<StickerPack[]> {
    return this.db.knex('sticker_packs').where({ is_active: true }).orderBy('created_at', 'asc') as Promise<StickerPack[]>;
  }

  async findPackById(id: string): Promise<StickerPack | undefined> {
    return this.db.knex('sticker_packs').where({ id }).first() as Promise<StickerPack | undefined>;
  }

  async findStickersByPackId(packId: string): Promise<Sticker[]> {
    return this.db.knex('stickers').where({ pack_id: packId }).orderBy('order_index', 'asc') as Promise<Sticker[]>;
  }

  async findStickerById(id: string): Promise<Sticker | undefined> {
    return this.db.knex('stickers').where({ id }).first() as Promise<Sticker | undefined>;
  }
}
