import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [UserController],
  providers: [UserService, UserRepository, RateLimitGuard],
  exports: [UserService, UserRepository],
})
export class UserModule {}
