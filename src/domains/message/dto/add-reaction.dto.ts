import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class AddReactionDto {
  @ApiProperty({ example: '👍' })
  @IsString()
  @Length(1, 10)
  emoji: string;
}
