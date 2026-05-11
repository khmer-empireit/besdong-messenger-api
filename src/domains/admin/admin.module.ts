import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { AdminGuard } from '../../shared/guards/admin.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository, AdminGuard],
  exports: [AdminRepository],
})
export class AdminModule {}
