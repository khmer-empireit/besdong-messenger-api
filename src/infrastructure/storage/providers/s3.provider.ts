import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { IStorageProvider } from '../storage.interface';

@Injectable()
export class S3StorageProvider implements IStorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly cdnUrl: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get<string>('STORAGE_BUCKET')!;
    this.cdnUrl = this.config.get<string>('STORAGE_CDN_URL')!;

    this.client = new S3Client({
      region: this.config.get<string>('STORAGE_REGION', 'us-east-1'),
      endpoint: this.config.get<string>('STORAGE_ENDPOINT'),
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: this.config.get<string>('STORAGE_ACCESS_KEY')!,
        secretAccessKey: this.config.get<string>('STORAGE_SECRET_KEY')!,
      },
    });
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return `${this.cdnUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
