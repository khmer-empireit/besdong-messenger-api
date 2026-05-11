import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactRepository } from './contact.repository';
import { UserRepository } from '../user/user.repository';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ContactController],
  providers: [ContactService, ContactRepository, UserRepository],
})
export class ContactModule {}
