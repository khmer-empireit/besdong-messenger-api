import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class EditMessageDto {
  @ApiProperty({ example: 'Edited message content' })
  @IsString()
  @MinLength(1)
  content: string;
}
