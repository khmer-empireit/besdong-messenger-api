import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateConversationDto {
  @ApiPropertyOptional({ example: 'New Group Name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/group-avatar.jpg' })
  @IsOptional()
  @IsUrl()
  avatar_url?: string;
}
