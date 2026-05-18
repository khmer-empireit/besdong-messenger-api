import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { MessageRepository } from './message.repository';
import { MessageGateway } from './message.gateway';
import { ConversationModule } from '../conversation/conversation.module';
import { BlockModule } from '../block/block.module';
import { UserModule } from '../user/user.module';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';

@Module({
  imports: [
    ConversationModule,
    BlockModule,
    UserModule,
    JwtModule,
  ],
  controllers: [MessageController],
  providers: [MessageService, MessageRepository, MessageGateway, RateLimitGuard],
  exports: [MessageService, MessageGateway],
})
export class MessageModule {}
