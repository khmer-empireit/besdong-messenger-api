import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteUploadDto {
  @ApiProperty({
    example: 'avatars/a1000000-0000-0000-0000-000000000002/1778236134705-317a37e1c6fa.webp',
    description: 'Storage key returned by the upload endpoint',
  })
  @IsString()
  @IsNotEmpty()
  key: string;
}
