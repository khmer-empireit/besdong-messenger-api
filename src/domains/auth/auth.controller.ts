import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OAuthDto } from './dto/oauth.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { TokensResponseDto } from './dto/tokens-response.dto';
import { AccessTokenResponseDto } from './dto/access-token-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { JwtGuard } from '../../shared/guards/jwt.guard';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';
import { RateLimit } from '../../shared/decorators/rate-limit.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60 * 60)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'Returns access and refresh tokens', type: TokensResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 429, description: 'Too many registrations — wait 1 hour' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.headers['user-agent']);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 15 * 60)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Returns access and refresh tokens', type: TokensResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many attempts — wait 15 minutes' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.headers['user-agent']);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 15 * 60)
  @ApiOperation({ summary: 'Issue a new access token using a refresh token' })
  @ApiResponse({ status: 200, description: 'Returns a new access token', type: AccessTokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or revoked refresh token' })
  @ApiResponse({ status: 429, description: 'Too many attempts — wait 15 minutes' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke the refresh token for this device' })
  @ApiResponse({ status: 200, description: 'Logged out successfully', type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  logout(@CurrentUser() user: { sub: string }, @Body() dto: RefreshDto) {
    return this.authService.logout(user.sub, dto.refresh_token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 15 * 60)
  @ApiOperation({ summary: 'Send or resend a 6-digit OTP to the email for password reset' })
  @ApiResponse({ status: 200, description: 'OTP sent — also use this to resend. Any previous unused OTP for this email is invalidated.', type: MessageResponseDto })
  @ApiResponse({ status: 429, description: 'Too many attempts — wait 15 minutes' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 15 * 60)
  @ApiOperation({ summary: 'Verify the OTP before resetting password' })
  @ApiResponse({ status: 200, description: 'OTP is valid — proceed to reset password', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 429, description: 'Too many attempts — wait 15 minutes' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp_code);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(5, 15 * 60)
  @ApiOperation({ summary: 'Reset password using the OTP received by email' })
  @ApiResponse({ status: 200, description: 'Password updated successfully', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 429, description: 'Too many attempts — wait 15 minutes' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('oauth')
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 15 * 60)
  @ApiOperation({ summary: 'Social login — Google, Facebook, or Apple' })
  @ApiResponse({ status: 201, description: 'Returns access and refresh tokens', type: TokensResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error or unsupported provider' })
  @ApiResponse({ status: 401, description: 'Invalid or expired provider token' })
  @ApiResponse({ status: 429, description: 'Too many attempts — wait 15 minutes' })
  oauthLogin(@Body() dto: OAuthDto, @Req() req: Request) {
    return this.authService.oauthLogin(dto, req.headers['user-agent'] as string);
  }
}
