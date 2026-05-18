import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StickerDto {
  @ApiProperty() id: string;
  @ApiProperty() pack_id: string;
  @ApiProperty() name: string;
  @ApiProperty() media_url: string;
  @ApiProperty() order_index: number;
  @ApiProperty() created_at: Date;
}

export class StickerPackDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() thumbnail_url: string;
  @ApiProperty() created_at: Date;
}

export class StickerPackWithStickersDto extends StickerPackDto {
  @ApiProperty({ type: [StickerDto] }) stickers: StickerDto[];
}

export class StickerPackListResponseDto {
  @ApiProperty({ type: [StickerPackDto] }) packs: StickerPackDto[];
}

export class GifItemDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() url: string;
  @ApiProperty() preview_url: string;
  @ApiProperty() width: number;
  @ApiProperty() height: number;
}

export class GifSearchResponseDto {
  @ApiProperty({ type: [GifItemDto] }) results: GifItemDto[];
  @ApiPropertyOptional({ nullable: true, description: 'Cursor for next page' }) next: string | null;
}
