import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { MessageRepository } from './message.repository';
import { MessageGateway } from './message.gateway';
import { ConversationModule } from '../conversation/conversation.module';
import { BlockModule } from '../block/block.module';

@Module({
  imports: [
    ConversationModule,
    BlockModule,
    JwtModule,
  ],
  controllers: [MessageController],
  providers: [MessageService, MessageRepository, MessageGateway],
})
export class MessageModule {}
