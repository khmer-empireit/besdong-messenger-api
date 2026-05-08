import { BadRequestException, Injectable, PayloadTooLargeException } from '@nestjs/common';
import sharp from 'sharp';
import * as crypto from 'crypto';
import { StorageService } from '../../infrastructure/storage/storage.service';

export type UploadType = 'avatar' | 'group_avatar' | 'attachment' | 'story';
export type UploadMode = 'compressed' | 'original';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// Max input size per mode
const MAX_SIZE_COMPRESSED = 10 * 1024 * 1024; // 10 MB
const MAX_SIZE_ORIGINAL   =  5 * 1024 * 1024; //  5 MB

// Output dimensions per type (compressed mode only)
const DIMENSIONS: Record<UploadType, { width: number; height: number }> = {
  avatar:       { width: 500,  height: 500  },
  group_avatar: { width: 500,  height: 500  },
  attachment:   { width: 1920, height: 1920 },
  story:        { width: 1080, height: 1920 },
};

@Injectable()
export class UploadService {
  constructor(private storage: StorageService) {}

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
    type: UploadType,
    mode: UploadMode,
  ) {
    this.validateMimeType(file);
    this.validateSize(file, mode);

    const { data, info } = await this.process(file.buffer, type, mode);
    const key = this.buildKey(type, userId, info.format ?? 'webp');
    const mimeType = `image/${info.format ?? 'webp'}`;

    const url = await this.storage.upload(data, key, mimeType);

    return { url, size: data.length, width: info.width!, height: info.height!, format: info.format! };
  }

  private validateMimeType(file: Express.Multer.File) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, WebP, and HEIC images are allowed.',
      );
    }
  }

  private validateSize(file: Express.Multer.File, mode: UploadMode) {
    const limit = mode === 'compressed' ? MAX_SIZE_COMPRESSED : MAX_SIZE_ORIGINAL;
    if (file.size > limit) {
      const limitMb = limit / 1024 / 1024;
      throw new PayloadTooLargeException(
        `File is too large. Maximum size is ${limitMb} MB for ${mode} mode.`,
      );
    }
  }

  private async process(buffer: Buffer, type: UploadType, mode: UploadMode) {
    const { width, height } = DIMENSIONS[type];

    if (mode === 'compressed') {
      const result = await sharp(buffer)
        .resize(width, height, { fit: 'cover', position: 'center', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
      return result;
    }

    // Original mode — just decode to validate it's a real image, keep format
    const result = await sharp(buffer)
      .toBuffer({ resolveWithObject: true });
    return result;
  }

  private buildKey(type: UploadType, userId: string, ext: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(6).toString('hex');
    const folder = type === 'story' ? 'stories' : `${type}s`;
    return `${folder}/${userId}/${timestamp}-${random}.${ext}`;
  }
}
