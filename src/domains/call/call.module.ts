import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConversationModule } from '../conversation/conversation.module';
import { MessageModule } from '../message/message.module';
import { CallService } from './call.service';
import { CallGateway } from './call.gateway';
import { CallController } from './call.controller';
import { CallRepository } from './call.repository';
import { ICallRepository } from './interfaces/i-call.repository';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';

@Module({
  imports: [JwtModule.register({}), ConversationModule, MessageModule],
  providers: [
    CallService,
    CallGateway,
    RateLimitGuard,
    { provide: ICallRepository, useClass: CallRepository },
  ],
  controllers: [CallController],
})
export class CallModule {}
