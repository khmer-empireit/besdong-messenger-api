import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoryMediaType } from '../../../shared/enums';

export class CreateStoryDto {
  @ApiProperty({ example: 'https://cdn.example.com/stories/user-id/file.webp' })
  @IsString()
  @IsNotEmpty()
  media_url: string;

  @ApiProperty({ example: 'stories/user-id/1234567890-abc.webp' })
  @IsString()
  @IsNotEmpty()
  media_key: string;

  @ApiProperty({ enum: StoryMediaType })
  @IsEnum(StoryMediaType)
  media_type: StoryMediaType;

  @ApiPropertyOptional({ example: 'Good morning 🌅' })
  @IsOptional()
  @IsString()
  caption?: string;
}
