import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [UploadController],
  providers: [UploadService, RateLimitGuard],
})
export class UploadModule {}
