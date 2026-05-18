import { Module } from '@nestjs/common';
import { StickerController } from './sticker.controller';
import { StickerService } from './sticker.service';
import { StickerRepository } from './sticker.repository';

@Module({
  controllers: [StickerController],
  providers: [StickerService, StickerRepository],
  exports: [StickerService],
})
export class StickerModule {}
