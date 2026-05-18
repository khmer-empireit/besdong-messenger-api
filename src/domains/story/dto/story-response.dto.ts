import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StoryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() user_id: string;
  @ApiProperty() media_url: string;
  @ApiProperty() media_key: string;
  @ApiProperty() media_type: string;
  @ApiPropertyOptional() caption: string | null;
  @ApiProperty() expires_at: Date;
  @ApiProperty() created_at: Date;
}

export class StoryWithMetaResponseDto extends StoryResponseDto {
  @ApiProperty() username: string;
  @ApiPropertyOptional() display_name: string | null;
  @ApiPropertyOptional() avatar_url: string | null;
  @ApiProperty() view_count: number;
  @ApiProperty() is_viewed: boolean;
}

export class StoryListResponseDto {
  @ApiProperty({ type: [StoryWithMetaResponseDto] }) data: StoryWithMetaResponseDto[];
}

export class StoryViewerResponseDto {
  @ApiProperty() story_id: string;
  @ApiProperty() viewer_id: string;
  @ApiProperty() viewed_at: Date;
  @ApiProperty() username: string;
  @ApiPropertyOptional() display_name: string | null;
  @ApiPropertyOptional() avatar_url: string | null;
}
