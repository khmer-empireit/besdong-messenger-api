import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './providers/local.provider';
import { S3StorageProvider } from './providers/s3.provider';
import { IStorageProvider } from './storage.interface';

@Injectable()
export class StorageService implements IStorageProvider {
  private readonly provider: IStorageProvider;

  constructor(private config: ConfigService) {
    const driver = this.config.get<string>('STORAGE_DRIVER', 'local');
    this.provider =
      driver === 's3'
        ? new S3StorageProvider(config)
        : new LocalStorageProvider(config);
  }

  upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    return this.provider.upload(buffer, key, mimeType);
  }

  delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }
}
