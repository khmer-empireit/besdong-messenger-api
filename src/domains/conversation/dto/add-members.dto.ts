import { ApiProperty } from '@nestjs/swagger';
import { IsArray, Matches } from 'class-validator';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AddMembersDto {
  @ApiProperty({ example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  @Matches(UUID_PATTERN, { each: true, message: 'each value in user_ids must be a valid UUID' })
  user_ids: string[];
}
