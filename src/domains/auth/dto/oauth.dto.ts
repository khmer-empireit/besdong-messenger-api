import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class OAuthDto {
  @IsIn(['google', 'facebook', 'apple'])
  provider: 'google' | 'facebook' | 'apple';

  @IsString()
  @IsNotEmpty()
  token: string;
}
