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
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OAuthDto } from './dto/oauth.dto';
import { TelegramAuthDto } from './dto/telegram-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private repo: AuthRepository,
    private jwt: JwtService,
    private config: ConfigService,
    private firebase: FirebaseService,
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
    const profile = await this.verifyFirebaseToken(dto.token);

    const byProviderId = await this.repo.findIdentityByProviderId(
      profile.provider,
      profile.provider_user_id,
    );
    if (byProviderId) return this.issueTokens(byProviderId.user_id, deviceInfo);

    const byEmail = await this.repo.findIdentityByEmail(profile.email, profile.provider);
    if (byEmail) {
      await this.repo.updateProviderUserId(byEmail.id, profile.provider_user_id);
      return this.issueTokens(byEmail.user_id, deviceInfo);
    }

    const username = await this.generateUsername(profile.email);
    const user = await this.repo.createOAuthUser({
      username,
      display_name: profile.display_name ?? username,
      provider: profile.provider,
      provider_user_id: profile.provider_user_id,
      email: profile.email,
    });

    return this.issueTokens(user.id, deviceInfo);
  }

  // ── Telegram ───────────────────────────────────────────────────────────

  async telegramLogin(dto: TelegramAuthDto, deviceInfo?: string) {
    this.verifyTelegramAuth(dto);

    const providerUserId = String(dto.id);
    const existing = await this.repo.findIdentityByProviderId('telegram', providerUserId);
    if (existing) return this.issueTokens(existing.user_id, deviceInfo);

    const base = (dto.username ?? `telegram${dto.id}`)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 40);
    const username = await this.generateUniqueUsername(base);
    const displayName = [dto.first_name, dto.last_name].filter(Boolean).join(' ');

    const user = await this.repo.createOAuthUser({
      username,
      display_name: displayName,
      provider: 'telegram',
      provider_user_id: providerUserId,
      email: null,
      avatar_url: dto.photo_url,
    });

    return this.issueTokens(user.id, deviceInfo);
  }

  private verifyTelegramAuth(dto: TelegramAuthDto): void {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');

    const now = Math.floor(Date.now() / 1000);
    if (now - dto.auth_date > 86400) {
      throw new UnauthorizedException('Telegram auth data expired');
    }

    const { hash, ...fields } = dto;
    const dataCheckString = Object.keys(fields)
      .sort()
      .map((key) => `${key}=${(fields as any)[key]}`)
      .join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken!).digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram auth data');
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private async issueTokens(userId: string, deviceInfo?: string) {
    const accessExpiresIn = this.config.get('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '30d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, jti: crypto.randomUUID() },
        {
          secret: this.config.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: accessExpiresIn as any,
        },
      ),
      this.jwt.signAsync(
        { sub: userId, jti: crypto.randomUUID() },
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
    return this.generateUniqueUsername(base);
  }

  private async generateUniqueUsername(base: string): Promise<string> {
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

  private async verifyFirebaseToken(token: string): Promise<{
    provider_user_id: string;
    provider: 'google' | 'facebook' | 'apple';
    email: string;
    display_name?: string;
  }> {
    try {
      const decoded = await this.firebase.auth.verifyIdToken(token);
      const providerMap: Record<string, 'google' | 'facebook' | 'apple'> = {
        'google.com': 'google',
        'facebook.com': 'facebook',
        'apple.com': 'apple',
      };
      const provider = providerMap[decoded.firebase?.sign_in_provider];
      if (!provider) throw new UnauthorizedException('Unsupported sign-in provider');
      if (!decoded.email) throw new UnauthorizedException('Email not available from provider');
      return {
        provider_user_id: decoded.uid,
        provider,
        email: decoded.email,
        display_name: decoded.name,
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Invalid Firebase token');
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
