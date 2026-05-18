import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactRepository } from './contact.repository';
import { UserModule } from '../user/user.module';
import { ConversationModule } from '../conversation/conversation.module';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';

@Module({
  imports: [JwtModule.register({}), UserModule, ConversationModule],
  controllers: [ContactController],
  providers: [ContactService, ContactRepository, RateLimitGuard],
})
export class ContactModule {}
