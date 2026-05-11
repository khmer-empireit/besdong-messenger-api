import { ApiProperty } from '@nestjs/swagger';

export class AuthConfigItemDto {
  @ApiProperty({ example: 'google' })
  method: string;

  @ApiProperty({ example: true })
  is_enabled: boolean;

  @ApiProperty()
  updated_at: Date;
}

export class AuthConfigListResponseDto {
  @ApiProperty({ type: [AuthConfigItemDto] })
  data: AuthConfigItemDto[];
}
