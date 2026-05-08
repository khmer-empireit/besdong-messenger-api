import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UserProfileData {
  @ApiProperty({ example: 'a1000000-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ example: 'sreng_sokheng' })
  username: string;

  @ApiProperty({ example: 'Sreng Sokheng' })
  display_name: string;

  @ApiPropertyOptional({ example: 'sokheng@example.com', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ example: '+85512345678', nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.webp', nullable: true })
  avatar_url: string | null;

  @ApiPropertyOptional({ example: 'Hey there!', nullable: true })
  bio: string | null;

  @ApiPropertyOptional({ example: '1999-05-08', nullable: true })
  dob: string | null;

  @ApiProperty({ enum: ['user', 'admin'], example: 'user' })
  role: string;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: false })
  is_verified: boolean;

  @ApiProperty({ example: true })
  is_online: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
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
  @ApiProperty({ example: 'a1000000-0000-0000-0000-000000000001' })
  id: string;

  @ApiProperty({ example: 'sreng_sokheng' })
  username: string;

  @ApiProperty({ example: 'Sreng Sokheng' })
  display_name: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.webp', nullable: true })
  avatar_url: string | null;

  @ApiPropertyOptional({ example: 'Hey there!', nullable: true })
  bio: string | null;

  @ApiProperty({ example: true })
  is_online: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  last_seen_at: Date | null;
}

export class PublicProfileResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: PublicProfileData })
  data: PublicProfileData;
}
