import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StickerRepository } from './sticker.repository';

@Injectable()
export class StickerService {
  constructor(
    private repo: StickerRepository,
    private config: ConfigService,
  ) {}

  async getPacks() {
    return this.repo.findActivePacks();
  }

  async getPackWithStickers(packId: string) {
    const pack = await this.repo.findPackById(packId);
    if (!pack || !pack.is_active) throw new NotFoundException('Sticker pack not found');
    const stickers = await this.repo.findStickersByPackId(packId);
    return { ...pack, stickers };
  }

  async searchGifs(q: string, limit = 20, next?: string) {
    const key = this.config.get<string>('TENOR_API_KEY');
    if (!key) throw new BadRequestException('GIF search is not available');

    const params = new URLSearchParams({ q, key, limit: String(Math.min(limit, 50)) });
    if (next) params.set('pos', next);

    const res = await fetch(`https://tenor.googleapis.com/v2/search?${params}`);
    if (!res.ok) throw new BadRequestException('GIF search failed');

    const data = await res.json() as TenorResponse;
    return this.normalizeTenorResponse(data);
  }

  async getTrendingGifs(limit = 20, next?: string) {
    const key = this.config.get<string>('TENOR_API_KEY');
    if (!key) throw new BadRequestException('GIF search is not available');

    const params = new URLSearchParams({ key, limit: String(Math.min(limit, 50)) });
    if (next) params.set('pos', next);

    const res = await fetch(`https://tenor.googleapis.com/v2/featured?${params}`);
    if (!res.ok) throw new BadRequestException('Failed to fetch trending GIFs');

    const data = await res.json() as TenorResponse;
    return this.normalizeTenorResponse(data);
  }

  private normalizeTenorResponse(data: TenorResponse) {
    const results = (data.results ?? []).map((item) => {
      const gif = item.media_formats?.gif;
      const tinygif = item.media_formats?.tinygif ?? item.media_formats?.gif;
      return {
        id: item.id,
        title: item.title,
        url: gif?.url ?? '',
        preview_url: tinygif?.url ?? '',
        width: gif?.dims?.[0] ?? 0,
        height: gif?.dims?.[1] ?? 0,
      };
    });

    return { results, next: data.next ?? null };
  }
}

interface TenorMediaFormat {
  url: string;
  dims: [number, number];
}

interface TenorResult {
  id: string;
  title: string;
  media_formats: {
    gif?: TenorMediaFormat;
    tinygif?: TenorMediaFormat;
  };
}

interface TenorResponse {
  results: TenorResult[];
  next?: string;
}
