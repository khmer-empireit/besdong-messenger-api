import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IStorageProvider } from '../storage.interface';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly basePath: string;
  private readonly publicUrl: string;

  constructor(private config: ConfigService) {
    this.basePath = path.resolve(
      this.config.get<string>('STORAGE_LOCAL_PATH', './uploads'),
    );
    this.publicUrl = this.config.get<string>('STORAGE_PUBLIC_URL', 'http://localhost:3000');
  }

  async upload(buffer: Buffer, key: string, _mimeType: string): Promise<string> {
    const fullPath = path.join(this.basePath, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return `${this.publicUrl}/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key);
    await fs.unlink(fullPath).catch(() => {});
  }
}
