import { ApiProperty } from '@nestjs/swagger';

class MessageData {
  @ApiProperty({ example: 'Operation completed successfully.' })
  message: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MessageData })
  data: MessageData;
}
