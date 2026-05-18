import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class StoryData {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  user_id: string;

  @ApiProperty({ example: 'https://cdn.example.com/stories/video.mp4' })
  media_url: string;

  @ApiProperty({ example: 'stories/uuid/video.mp4' })
  media_key: string;

  @ApiProperty({ example: 'video' })
  media_type: string;

  @ApiPropertyOptional({ example: 'My trip!', nullable: true })
  caption: string | null;

  @ApiProperty()
  expires_at: Date;

  @ApiProperty()
  created_at: Date;
}

class StoryWithMetaData extends StoryData {
  @ApiProperty({ example: 'srengsokheng' })
  username: string;

  @ApiPropertyOptional({ example: 'Sokheng Updated', nullable: true })
  display_name: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.webp', nullable: true })
  avatar_url: string | null;

  @ApiProperty({ example: 12 })
  view_count: number;

  @ApiProperty({ example: false })
  is_viewed: boolean;
}

class StoryViewerData {
  @ApiProperty({ example: 'uuid' })
  story_id: string;

  @ApiProperty({ example: 'uuid' })
  viewer_id: string;

  @ApiProperty()
  viewed_at: Date;

  @ApiProperty({ example: 'silverblack' })
  username: string;

  @ApiPropertyOptional({ example: 'Silver Black', nullable: true })
  display_name: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  avatar_url: string | null;
}

class StoryActionData {
  @ApiProperty({ example: 'Story deleted' })
  message: string;
}

export class StoryResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: StoryData })
  data: StoryData;
}

export class StoryListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [StoryWithMetaData] })
  data: StoryWithMetaData[];
}

export class StoryWithMetaResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: StoryWithMetaData })
  data: StoryWithMetaData;
}

export class StoryViewerListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [StoryViewerData] })
  data: StoryViewerData[];
}

export class StoryActionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: StoryActionData })
  data: StoryActionData;
}
