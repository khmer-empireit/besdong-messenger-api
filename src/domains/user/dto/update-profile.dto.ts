import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Sreng Sokheng' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  display_name?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatar_url?: string;
}
