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
      credentials: {
        accessKeyId: this.config.get<string>('STORAGE_ACCESS_KEY')!,
        secretAccessKey: this.config.get<string>('STORAGE_SECRET_KEY')!,
      },
    });

    // MinIO rejects AWS SDK v3 flexible checksum headers (CRC64NVME etc).
    // Strip them in the build step so they are never included in the signature.
    this.client.middlewareStack.add(
      (next) => async (args: any) => {
        const headers = (args.request as { headers: Record<string, string> }).headers;
        delete headers['x-amz-checksum-crc32'];
        delete headers['x-amz-checksum-crc32c'];
        delete headers['x-amz-checksum-crc64nvme'];
        delete headers['x-amz-checksum-sha1'];
        delete headers['x-amz-checksum-sha256'];
        delete headers['x-amz-sdk-checksum-algorithm'];
        return next(args);
      },
      { step: 'build', name: 'stripChecksumHeaders', priority: 'low' },
    );
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentLength: buffer.length,
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
