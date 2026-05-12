import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ enum: ['direct', 'group'] })
  @IsIn(['direct', 'group'])
  type: 'direct' | 'group';

  @ApiProperty({ 
    example: ['uuid-1'], 
    description: 'User IDs to add (excluding yourself). For direct conversations: exactly one ID. For group conversations: one or more IDs.' 
  })
  @IsArray()
  @IsUUID('4', { each: true })
  member_ids: string[];

  @ApiPropertyOptional({ example: 'Dev Team', description: 'Required for group conversations' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;
}
