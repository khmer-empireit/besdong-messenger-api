import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';

@Module({
  controllers: [UploadController],
  providers: [UploadService, RateLimitGuard],
})
export class UploadModule {}
