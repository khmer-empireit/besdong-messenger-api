import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { ConversationModule } from '../conversation/conversation.module';
import { MessageModule } from '../message/message.module';
import { PushProcessor } from './push.processor';

@Module({
  imports: [UserModule, ConversationModule, MessageModule],
  providers: [PushProcessor],
})
export class NotificationModule {}
