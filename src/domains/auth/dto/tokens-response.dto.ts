import { ApiProperty } from '@nestjs/swagger';

class TokensData {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refresh_token: string;
}

export class TokensResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: TokensData })
  data: TokensData;
}
