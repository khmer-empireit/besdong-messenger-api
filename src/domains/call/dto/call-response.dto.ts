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

class CallOtherPartyDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() username: string;
  @ApiProperty({ nullable: true }) avatar_url: string | null;
}

export class CallLogItemDto {
  @ApiProperty() id: string;
  @ApiProperty() conversation_id: string;
  @ApiProperty({ enum: ['audio', 'video'] }) call_type: string;
  @ApiProperty({ enum: ['answered', 'missed', 'declined'] }) status: string;
  @ApiProperty({ enum: ['outgoing', 'incoming'] }) direction: string;
  @ApiProperty({ nullable: true }) duration: number | null;
  @ApiProperty() started_at: string;
  @ApiProperty({ nullable: true }) ended_at: string | null;
  @ApiProperty({ type: CallOtherPartyDto }) other_party: CallOtherPartyDto;
}

class CallLogPaginationDto {
  @ApiProperty({ nullable: true }) next_cursor: string | null;
  @ApiProperty() has_more: boolean;
}

export class CallLogListResponseDto {
  @ApiProperty({ type: [CallLogItemDto] }) data: CallLogItemDto[];
  @ApiProperty({ type: CallLogPaginationDto }) pagination: CallLogPaginationDto;
}
