import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ContactUserData {
  @ApiProperty({ example: 'a1000000-0000-0000-0000-000000000002' })
  id: string;

  @ApiProperty({ example: 'chan_dara' })
  username: string;

  @ApiProperty({ example: 'Chan Dara' })
  display_name: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.webp', nullable: true })
  avatar_url: string | null;

  @ApiPropertyOptional({ example: 'Hey!', nullable: true })
  bio: string | null;

  @ApiProperty({ example: false })
  is_online: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  last_seen_at: Date | null;
}

class ContactData {
  @ApiProperty({ example: 'c1000000-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ type: ContactUserData })
  contact: ContactUserData;

  @ApiProperty()
  created_at: Date;
}

export class ContactResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ContactData })
  data: ContactData;
}

export class ContactListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [ContactData] })
  data: ContactData[];
}

class FoundUserData {
  @ApiProperty({ example: 'a1000000-0000-0000-0000-000000000002' })
  id: string;

  @ApiProperty({ example: 'chan_dara' })
  username: string;

  @ApiProperty({ example: 'Chan Dara' })
  display_name: string;

  @ApiPropertyOptional({ example: 'BD0001234', nullable: true })
  bd_number: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.webp', nullable: true })
  avatar_url: string | null;

  @ApiPropertyOptional({ example: 'Hey!', nullable: true })
  bio: string | null;

  @ApiProperty({ example: false })
  is_online: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  last_seen_at: Date | null;
}

export class FindUserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [FoundUserData] })
  data: FoundUserData[];
}
