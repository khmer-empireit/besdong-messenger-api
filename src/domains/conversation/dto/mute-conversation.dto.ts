import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class MuteConversationDto {
  @ApiProperty({ enum: ['30m', '1h', '8h', 'forever'], example: '1h' })
  @IsIn(['30m', '1h', '8h', 'forever'])
  duration: '30m' | '1h' | '8h' | 'forever';
}
