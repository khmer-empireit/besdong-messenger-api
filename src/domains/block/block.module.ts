import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BlockController } from './block.controller';
import { BlockService } from './block.service';
import { BlockRepository } from './block.repository';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [BlockController],
  providers: [BlockService, BlockRepository, RateLimitGuard],
  exports: [BlockRepository],
})
export class BlockModule {}
