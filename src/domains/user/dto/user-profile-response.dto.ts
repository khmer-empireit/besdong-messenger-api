import { ApiProperty } from '@nestjs/swagger';

class UserProfileData {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'sreng_sokheng' })
  username: string;

  @ApiProperty({ example: 'Sreng Sokheng' })
  display_name: string;

  @ApiProperty({ example: null, nullable: true })
  phone: string | null;

  @ApiProperty({ example: 'https://cdn.example.com/avatar.jpg', nullable: true })
  avatar_url: string | null;

  @ApiProperty({ example: true })
  is_online: boolean;

  @ApiProperty({ example: null, nullable: true })
  last_seen_at: Date | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class UserProfileResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UserProfileData })
  data: UserProfileData;
}

export class UserProfileListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [UserProfileData] })
  data: UserProfileData[];
}

class PublicProfileData {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'sreng_sokheng' })
  username: string;

  @ApiProperty({ example: 'Sreng Sokheng' })
  display_name: string;

  @ApiProperty({ example: 'https://cdn.example.com/avatar.jpg', nullable: true })
  avatar_url: string | null;

  @ApiProperty({ example: true })
  is_online: boolean;

  @ApiProperty({ example: null, nullable: true })
  last_seen_at: Date | null;
}

export class PublicProfileResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: PublicProfileData })
  data: PublicProfileData;
}
