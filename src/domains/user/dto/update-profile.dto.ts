import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'rose_besdong', description: 'Must be unique, letters/numbers/underscores only' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers, and underscores' })
  username?: string;

  @ApiPropertyOptional({ example: 'Sreng Sokheng' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  display_name?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.webp' })
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  @MaxLength(500)
  avatar_url?: string;

  @ApiPropertyOptional({ example: 'Hey there! I am using Besdong.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: '1999-05-08', description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dob?: string;
}
