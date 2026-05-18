import { Module } from '@nestjs/common';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { FaqRepository } from './faq.repository';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({})],
  controllers: [FaqController],
  providers: [FaqService, FaqRepository],
})
export class FaqModule {}
