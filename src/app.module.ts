import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { PushQueueModule } from './infrastructure/queue/push-queue.module';
import { FirebaseModule } from './infrastructure/firebase/firebase.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { CorrelationMiddleware } from './infrastructure/logger/correlation.middleware';
import { AuthModule } from './domains/auth/auth.module';
import { UploadModule } from './domains/upload/upload.module';
import { UserModule } from './domains/user/user.module';
import { ConversationModule } from './domains/conversation/conversation.module';
import { MessageModule } from './domains/message/message.module';
import { ContactModule } from './domains/contact/contact.module';
import { AdminModule } from './domains/admin/admin.module';
import { BlockModule } from './domains/block/block.module';
import { HealthModule } from './domains/health/health.module';
import { NotificationModule } from './domains/notification/notification.module';
import { StoryModule } from './domains/story/story.module';
import { CallModule } from './domains/call/call.module';
import { StickerModule } from './domains/sticker/sticker.module';
import { FaqModule } from './domains/faq/faq.module';
import { validate } from './infrastructure/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    LoggerModule,
    DatabaseModule,
    CacheModule,
    PushQueueModule,
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
    NotificationModule,
    StoryModule,
    CallModule,
    StickerModule,
    FaqModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
