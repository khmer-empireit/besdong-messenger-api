import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { AuthModule } from './domains/auth/auth.module';
import { UserModule } from './domains/user/user.module';
import { ConversationModule } from './domains/conversation/conversation.module';
import { MessageModule } from './domains/message/message.module';
import { validate } from './infrastructure/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    DatabaseModule,
    CacheModule,
    AuthModule,
    UserModule,
    ConversationModule,
    MessageModule,
  ],
})
export class AppModule {}
