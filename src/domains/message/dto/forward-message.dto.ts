import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ForwardMessageDto {
  @ApiProperty({ example: 'uuid', description: 'Target conversation to forward into' })
  @IsUUID()
  target_conversation_id: string;
}
