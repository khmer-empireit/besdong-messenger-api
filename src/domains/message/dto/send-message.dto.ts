import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Hello!' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ example: 'message-uuid' })
  @IsOptional()
  @IsUUID('4')
  reply_to_id?: string;
}
