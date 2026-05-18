import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';
import { StoryRepository } from './story.repository';
import { MessageModule } from '../message/message.module';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';

@Module({
  imports: [JwtModule.register({}), MessageModule],
  controllers: [StoryController],
  providers: [StoryService, StoryRepository, RateLimitGuard],
})
export class StoryModule {}
