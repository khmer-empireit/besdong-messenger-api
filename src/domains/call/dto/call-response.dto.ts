import { ApiProperty } from '@nestjs/swagger';

class IceServerDto {
  @ApiProperty({ example: 'stun:stun.example.com:3478' })
  urls: string | string[];

  @ApiProperty({ required: false })
  username?: string;

  @ApiProperty({ required: false })
  credential?: string;
}

export class TurnCredentialsResponseDto {
  @ApiProperty({ type: [IceServerDto] })
  ice_servers: IceServerDto[];
}
