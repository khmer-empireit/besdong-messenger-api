import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AddContactDto {
  @ApiProperty({ example: 'a1000000-0000-0000-0000-000000000002', description: 'User ID of the person to add' })
  @Matches(UUID_PATTERN, { message: 'user_id must be a valid UUID' })
  user_id: string;
}
