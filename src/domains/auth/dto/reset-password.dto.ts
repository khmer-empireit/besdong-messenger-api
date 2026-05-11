import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'you@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  otp_code: string;

  @ApiProperty({ example: 'newpassword123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  new_password: string;
}
