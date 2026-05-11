import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { ConversationRepository } from './conversation.repository';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ConversationController],
  providers: [ConversationService, ConversationRepository],
  exports: [ConversationService, ConversationRepository],
})
export class ConversationModule {}
