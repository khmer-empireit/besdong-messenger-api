import { ApiProperty } from '@nestjs/swagger';

class ParticipantData {
  @ApiProperty({ example: 'uuid' })
  conversation_id: string;

  @ApiProperty({ example: 'uuid' })
  user_id: string;

  @ApiProperty({ enum: ['owner', 'admin', 'member'], example: 'member' })
  role: string;

  @ApiProperty()
  joined_at: Date;

  @ApiProperty({ nullable: true })
  muted_until: Date | null;

  @ApiProperty({ nullable: true })
  last_read_at: Date | null;
}

class ConversationData {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ enum: ['direct', 'group'], example: 'direct' })
  type: string;

  @ApiProperty({ example: null, nullable: true })
  name: string | null;

  @ApiProperty({ example: null, nullable: true })
  avatar_url: string | null;

  @ApiProperty({ example: 'uuid', nullable: true })
  created_by: string | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

class ConversationDetailData extends ConversationData {
  @ApiProperty({ type: [ParticipantData] })
  participants: ParticipantData[];
}

export class ConversationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ConversationData })
  data: ConversationData;
}

export class ConversationDetailResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ConversationDetailData })
  data: ConversationDetailData;
}

export class ConversationListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [ConversationData] })
  data: ConversationData[];
}
