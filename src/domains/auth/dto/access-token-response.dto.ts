import { ApiProperty } from '@nestjs/swagger';

class AccessTokenData {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;
}

export class AccessTokenResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: AccessTokenData })
  data: AccessTokenData;
}
