import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SharedAttachmentDto {
  @ApiProperty() id: string;
  @ApiProperty() message_id: string;
  @ApiProperty() url: string;
  @ApiProperty() key: string;
  @ApiProperty({ enum: ['image', 'video', 'file', 'audio'] }) type: string;
  @ApiProperty() mime_type: string;
  @ApiProperty() size: number;
  @ApiPropertyOptional({ nullable: true }) width: number | null;
  @ApiPropertyOptional({ nullable: true }) height: number | null;
  @ApiPropertyOptional({ nullable: true }) file_name: string | null;
  @ApiProperty() created_at: Date;
}

export class SharedMediaResponseDto {
  @ApiProperty({ type: [SharedAttachmentDto] }) items: SharedAttachmentDto[];
  @ApiPropertyOptional({ nullable: true }) next_cursor: string | null;
}
