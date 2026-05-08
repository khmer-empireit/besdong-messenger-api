import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { FirebaseModule } from './infrastructure/firebase/firebase.module';
import { AuthModule } from './domains/auth/auth.module';
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
    AuthModule,
  ],
})
export class AppModule {}
