import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddContactDto {
  @ApiProperty({ example: 'a1000000-0000-0000-0000-000000000002', description: 'User ID of the person to add' })
  @IsUUID()
  user_id: string;
}
