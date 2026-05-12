import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateConversationDto {
  @ApiProperty({ enum: ['direct', 'group'] })
  @IsIn(['direct', 'group'])
  type: 'direct' | 'group';

  @ApiProperty({
    example: ['uuid-1'],
    description: 'User IDs to add (excluding yourself). For direct: exactly one ID. For group: one or more IDs.',
  })
  @IsArray()
  @Matches(UUID_PATTERN, { each: true, message: 'each value in member_ids must be a valid UUID' })
  member_ids: string[];

  @ApiPropertyOptional({ example: 'Dev Team', description: 'Required for group conversations' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;
}
