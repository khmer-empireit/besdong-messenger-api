import { BadRequestException, Injectable, PayloadTooLargeException } from '@nestjs/common';
import sharp from 'sharp';
import * as crypto from 'crypto';
import * as path from 'path';
import { StorageService } from '../../infrastructure/storage/storage.service';

export type UploadType = 'avatar' | 'group_avatar' | 'attachment' | 'story';
export type UploadMode = 'compressed' | 'original';
type FileCategory = 'image' | 'video' | 'document';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
];

export const ALL_ALLOWED_MIME_TYPES = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES, ...DOCUMENT_MIME_TYPES];

const TYPE_ALLOWED_CATEGORIES: Record<UploadType, FileCategory[]> = {
  avatar:       ['image'],
  group_avatar: ['image'],
  attachment:   ['image', 'video', 'document'],
  story:        ['image', 'video'],
};

const MAX_SIZE: Record<FileCategory, number> = {
  image:    10 * 1024 * 1024,  // 10 MB
  video:   200 * 1024 * 1024,  // 200 MB
  document: 50 * 1024 * 1024,  // 50 MB
};

const MAX_SIZE_IMAGE_ORIGINAL = 5 * 1024 * 1024; // 5 MB for uncompressed images

const IMAGE_DIMENSIONS: Record<UploadType, { width: number; height: number; fit: 'cover' | 'inside' }> = {
  avatar:       { width: 500,  height: 500,  fit: 'cover'  },
  group_avatar: { width: 500,  height: 500,  fit: 'cover'  },
  attachment:   { width: 2048, height: 2048, fit: 'inside' },
  story:        { width: 1080, height: 1920, fit: 'cover'  },
};

const MIME_TO_EXT: Record<string, string> = {
  'video/mp4':        'mp4',
  'video/quicktime':  'mov',
  'video/x-msvideo':  'avi',
  'video/x-matroska': 'mkv',
  'video/webm':       'webm',
  'application/pdf':  'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
};

@Injectable()
export class UploadService {
  constructor(private storage: StorageService) {}

  async upload(
    file: Express.Multer.File,
    userId: string,
    type: UploadType,
    mode: UploadMode,
  ) {
    const category = this.getCategory(file.mimetype);
    this.validateTypeCategory(type, category, file.mimetype);
    this.validateSize(file, category, mode);

    if (category === 'image') {
      return this.processImage(file, userId, type, mode);
    }

    const ext = MIME_TO_EXT[file.mimetype] ?? (path.extname(file.originalname).slice(1) || 'bin');
    const key = this.buildKey(type, userId, ext);
    const url = await this.storage.upload(file.buffer, key, file.mimetype);
    return { key, url, size: file.buffer.length, mimeType: file.mimetype };
  }

  async deleteFile(key: string, userId: string): Promise<void> {
    // Key format: {folder}/{userId}/{filename} — verify ownership
    const parts = key.split('/');
    if (parts.length < 3 || parts[1] !== userId) {
      throw new BadRequestException('You can only delete your own files.');
    }
    await this.storage.delete(key);
  }

  private getCategory(mimetype: string): FileCategory {
    if (IMAGE_MIME_TYPES.includes(mimetype)) return 'image';
    if (VIDEO_MIME_TYPES.includes(mimetype)) return 'video';
    if (DOCUMENT_MIME_TYPES.includes(mimetype)) return 'document';
    throw new BadRequestException(`Unsupported file type "${mimetype}".`);
  }

  private validateTypeCategory(type: UploadType, category: FileCategory, mimetype: string) {
    if (!TYPE_ALLOWED_CATEGORIES[type].includes(category)) {
      const allowed = TYPE_ALLOWED_CATEGORIES[type].join(', ');
      throw new BadRequestException(
        `Upload type "${type}" only accepts ${allowed} files, but got "${mimetype}".`,
      );
    }
  }

  private validateSize(file: Express.Multer.File, category: FileCategory, mode: UploadMode) {
    const limit =
      category === 'image' && mode === 'original'
        ? MAX_SIZE_IMAGE_ORIGINAL
        : MAX_SIZE[category];

    if (file.size > limit) {
      const mb = limit / 1024 / 1024;
      throw new PayloadTooLargeException(
        `File is too large. Maximum allowed size is ${mb} MB.`,
      );
    }
  }

  private async processImage(
    file: Express.Multer.File,
    userId: string,
    type: UploadType,
    mode: UploadMode,
  ) {
    const { width, height, fit } = IMAGE_DIMENSIONS[type];

    let result: { data: Buffer; info: sharp.OutputInfo };
    if (mode === 'compressed') {
      result = await sharp(file.buffer)
        .resize(width, height, { fit, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
    } else {
      result = await sharp(file.buffer).toBuffer({ resolveWithObject: true });
    }

    const { data, info } = result;
    const ext = info.format ?? 'webp';
    const key = this.buildKey(type, userId, ext);
    const mimeType = `image/${ext}`;
    const url = await this.storage.upload(data, key, mimeType);

    return { key, url, size: data.length, mimeType, width: info.width!, height: info.height! };
  }

  private buildKey(type: UploadType, userId: string, ext: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(6).toString('hex');
    const folder = type === 'story' ? 'stories' : `${type}s`;
    return `${folder}/${userId}/${timestamp}-${random}.${ext}`;
  }
}
