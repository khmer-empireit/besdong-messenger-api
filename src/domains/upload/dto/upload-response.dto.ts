import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({
    example: 'avatars/user123/1746700000000-abc123.webp',
    description: 'Storage key — pass this to DELETE /upload to remove the file',
  })
  key: string;

  @ApiProperty({ example: 'https://cdn.example.com/avatars/user123/1746700000000-abc123.webp' })
  url: string;

  @ApiProperty({ example: 204800, description: 'File size in bytes after processing' })
  size: number;

  @ApiProperty({ example: 'image/webp' })
  mimeType: string;

  @ApiPropertyOptional({ example: 500, description: 'Images only' })
  width?: number;

  @ApiPropertyOptional({ example: 500, description: 'Images only' })
  height?: number;
}
