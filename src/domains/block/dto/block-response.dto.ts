import { ApiProperty } from '@nestjs/swagger';

class BlockedUserData {
  @ApiProperty({ example: '4ccf14dc-d2b7-42e6-8859-4f524113c8c8' })
  id: string;

  @ApiProperty({ example: 'silverblack' })
  username: string;

  @ApiProperty({ example: 'Silver Black' })
  display_name: string;

  @ApiProperty({ example: null, nullable: true })
  avatar_url: string | null;
}

class BlockActionData {
  @ApiProperty({ example: 'User blocked' })
  message: string;
}

export class BlockedUserListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [BlockedUserData] })
  data: BlockedUserData[];
}

export class BlockActionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: BlockActionData })
  data: BlockActionData;
}
