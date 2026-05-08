import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ example: 'https://cdn.example.com/avatars/user123/1234567890.webp' })
  url: string;

  @ApiProperty({ example: 204800, description: 'File size in bytes after processing' })
  size: number;

  @ApiProperty({ example: 500 })
  width: number;

  @ApiProperty({ example: 500 })
  height: number;

  @ApiProperty({ example: 'webp' })
  format: string;
}
