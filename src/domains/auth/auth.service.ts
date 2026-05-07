import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import * as appleSignin from 'apple-signin-auth';
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OAuthDto } from './dto/oauth.dto';

@Injectable()
export class AuthService {
  constructor(
    private repo: AuthRepository,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ── Register ───────────────────────────────────────────────────────────

  async register(dto: RegisterDto, deviceInfo?: string) {
    const existing = await this.repo.findIdentityByEmail(dto.email, 'local');
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const username = await this.generateUsername(dto.email);

    const user = await this.repo.createLocalUser({
      username,
      display_name: dto.display_name,
      email: dto.email,
      password_hash: passwordHash,
    });

    return this.issueTokens(user.id, deviceInfo);
  }

  // ── Login ──────────────────────────────────────────────────────────────

  async login(dto: LoginDto, deviceInfo?: string) {
    const identity = await this.repo.findIdentityByEmail(dto.email, 'local');
    if (!identity) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, identity.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(identity.user_id, deviceInfo);
  }

  // ── Refresh ────────────────────────────────────────────────────────────

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.repo.findAuthToken(payload.sub, tokenHash);
    if (!stored) throw new UnauthorizedException('Refresh token revoked');

    const accessToken = await this.jwt.signAsync(
      { sub: payload.sub },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m') as any,
      },
    );

    return { access_token: accessToken };
  }

  // ── Logout ─────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.repo.deleteAuthToken(userId, tokenHash);
    return { message: 'You have been logged out successfully.' };
  }

  // ── Forgot Password ────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const identity = await this.repo.findIdentityByEmail(dto.email, 'local');
    if (!identity) return { message: 'OTP has been sent to your email' };

    const otp = this.generateOtp();
    const codeHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.repo.upsertOtpCode({
      user_id: identity.user_id,
      code_hash: codeHash,
      purpose: 'reset_password',
      expires_at: expiresAt,
    });

    const devReturnOtp = this.config.get<string>('DEV_RETURN_OTP');
    if (devReturnOtp === 'true') {
      return { message: 'A verification code has been sent to your email.', otp };
    }

    try {
      await this.sendOtpEmail(dto.email, otp);
    } catch {
      throw new BadRequestException('Failed to send OTP email — please try again');
    }

    return { message: 'A verification code has been sent to your email.' };
  }

  // ── Verify OTP ─────────────────────────────────────────────────────────

  async verifyOtp(email: string, otpCode: string) {
    const identity = await this.repo.findIdentityByEmail(email, 'local');
    if (!identity) throw new BadRequestException('Invalid request');

    const otp = await this.repo.findActiveOtp(identity.user_id, 'reset_password');
    if (!otp) throw new BadRequestException('OTP expired or not found');

    const codeHash = this.hashOtp(otpCode);
    if (codeHash !== otp.code_hash) throw new BadRequestException('Invalid OTP');

    return { message: 'Code verified. Please enter your new password.' };
  }

  // ── Reset Password ─────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const identity = await this.repo.findIdentityByEmail(dto.email, 'local');
    if (!identity) throw new BadRequestException('Invalid request');

    const otp = await this.repo.findActiveOtp(identity.user_id, 'reset_password');
    if (!otp) throw new BadRequestException('OTP expired or not found');

    const codeHash = this.hashOtp(dto.otp_code);
    if (codeHash !== otp.code_hash) throw new BadRequestException('Invalid OTP');

    await this.repo.markOtpUsed(otp.id);

    const passwordHash = await bcrypt.hash(dto.new_password, 12);
    await this.repo.updatePasswordHash(identity.user_id, passwordHash);

    return { message: 'Your password has been reset. You can now log in.' };
  }

  // ── OAuth ──────────────────────────────────────────────────────────────

  async oauthLogin(dto: OAuthDto, deviceInfo?: string) {
    const profile = await this.verifyProviderToken(dto.provider, dto.token);

    const byProviderId = await this.repo.findIdentityByProviderId(
      dto.provider,
      profile.provider_user_id,
    );
    if (byProviderId) return this.issueTokens(byProviderId.user_id, deviceInfo);

    const byEmail = await this.repo.findIdentityByEmail(profile.email, dto.provider);
    if (byEmail) {
      await this.repo.updateProviderUserId(byEmail.id, profile.provider_user_id);
      return this.issueTokens(byEmail.user_id, deviceInfo);
    }

    const username = await this.generateUsername(profile.email);
    const user = await this.repo.createOAuthUser({
      username,
      display_name: profile.display_name ?? username,
      provider: dto.provider,
      provider_user_id: profile.provider_user_id,
      email: profile.email,
    });

    return this.issueTokens(user.id, deviceInfo);
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private async issueTokens(userId: string, deviceInfo?: string) {
    const accessExpiresIn = this.config.get('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '30d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId },
        {
          secret: this.config.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: accessExpiresIn as any,
        },
      ),
      this.jwt.signAsync(
        { sub: userId },
        {
          secret: this.config.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshExpiresIn as any,
        },
      ),
    ]);

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.repo.createAuthToken({
      user_id: userId,
      token_hash: tokenHash,
      device_info: deviceInfo,
      expires_at: expiresAt,
    });

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  private async generateUsername(email: string): Promise<string> {
    const base = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 40);

    let candidate = base;
    let exists = await this.repo.findUserByUsername(candidate);
    while (exists) {
      candidate = `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
      exists = await this.repo.findUserByUsername(candidate);
    }
    return candidate;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async verifyProviderToken(
    provider: string,
    token: string,
  ): Promise<{ provider_user_id: string; email: string; display_name?: string }> {
    switch (provider) {
      case 'google':
        return this.verifyGoogleToken(token);
      case 'facebook':
        return this.verifyFacebookToken(token);
      case 'apple':
        return this.verifyAppleToken(token);
      default:
        throw new UnauthorizedException('Unsupported provider');
    }
  }

  private async verifyGoogleToken(token: string) {
    try {
      const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({ idToken: token, audience: clientId });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) throw new Error('Missing fields');
      return { provider_user_id: payload.sub, email: payload.email, display_name: payload.name };
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private async verifyFacebookToken(token: string) {
    try {
      const [meRes, appRes] = await Promise.all([
        fetch(`https://graph.facebook.com/me?fields=id,email,name&access_token=${token}`),
        fetch(`https://graph.facebook.com/app?access_token=${token}`),
      ]);
      const me = (await meRes.json()) as any;
      const app = (await appRes.json()) as any;
      if (me.error || app.error) throw new Error('Facebook API error');
      const expectedAppId = this.config.get<string>('FACEBOOK_APP_ID');
      if (app.id !== expectedAppId) throw new Error('Token issued for a different app');
      if (!me.email) throw new Error('Email permission not granted');
      return {
        provider_user_id: me.id as string,
        email: me.email as string,
        display_name: me.name as string,
      };
    } catch {
      throw new UnauthorizedException('Invalid Facebook token');
    }
  }

  private async verifyAppleToken(token: string) {
    try {
      const clientId = this.config.get<string>('APPLE_CLIENT_ID');
      const payload = await (appleSignin as any).verifyIdToken(token, {
        audience: clientId,
        ignoreExpiration: false,
      });
      if (!payload?.sub || !payload.email) throw new Error('Missing fields');
      return {
        provider_user_id: payload.sub as string,
        email: payload.email as string,
        display_name: undefined,
      };
    } catch {
      throw new UnauthorizedException('Invalid Apple token');
    }
  }

  private async sendOtpEmail(email: string, otp: string) {
    const transporter = nodemailer.createTransport({
      host: this.config.get<string>('MAIL_HOST', 'smtp.gmail.com'),
      port: this.config.get<number>('MAIL_PORT', 587),
      auth: {
        user: this.config.get<string>('MAIL_USER'),
        pass: this.config.get<string>('MAIL_PASS'),
      },
    });

    await transporter.sendMail({
      from: this.config.get<string>('MAIL_USER'),
      to: email,
      subject: 'Your Besdong password reset code',
      text: `Your OTP is: ${otp}\n\nThis code expires in 15 minutes.`,
    });
  }
}
