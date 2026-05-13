import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { FirebaseModule } from './infrastructure/firebase/firebase.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { AuthModule } from './domains/auth/auth.module';
import { UploadModule } from './domains/upload/upload.module';
import { UserModule } from './domains/user/user.module';
import { ConversationModule } from './domains/conversation/conversation.module';
import { MessageModule } from './domains/message/message.module';
import { ContactModule } from './domains/contact/contact.module';
import { AdminModule } from './domains/admin/admin.module';
import { BlockModule } from './domains/block/block.module';
import { HealthModule } from './domains/health/health.module';
import { validate } from './infrastructure/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    DatabaseModule,
    CacheModule,
    FirebaseModule,
    StorageModule,
    AuthModule,
    UploadModule,
    UserModule,
    ConversationModule,
    MessageModule,
    ContactModule,
    AdminModule,
    BlockModule,
    HealthModule,
  ],
})
export class AppModule {}
