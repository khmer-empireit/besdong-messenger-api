import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class TelegramAuthDto {
  @ApiProperty({ example: 123456789 })
  @IsInt()
  id: number;

  @ApiProperty({ example: 'Sokheng' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiPropertyOptional({ example: 'Sreng' })
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiPropertyOptional({ example: 'sokheng' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ example: 'https://t.me/i/userpic/320/abc.jpg' })
  @IsUrl()
  @IsOptional()
  photo_url?: string;

  @ApiProperty({ example: 1746700000 })
  @IsInt()
  auth_date: number;

  @ApiProperty({ example: 'abc123def456...' })
  @IsString()
  @IsNotEmpty()
  hash: string;
}
