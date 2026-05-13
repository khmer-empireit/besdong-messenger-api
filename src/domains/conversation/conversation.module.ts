import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { ConversationRepository } from './conversation.repository';
import { UserModule } from '../user/user.module';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';

@Module({
  imports: [JwtModule.register({}), UserModule],
  controllers: [ConversationController],
  providers: [ConversationService, ConversationRepository, RateLimitGuard],
  exports: [ConversationService, ConversationRepository],
})
export class ConversationModule {}
