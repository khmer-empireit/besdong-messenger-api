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
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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
    const user = await this.repo.createUser({
      username,
      display_name: dto.display_name,
    });

    await this.repo.createIdentity({
      user_id: user.id,
      provider: 'local',
      email: dto.email,
      password_hash: passwordHash,
    });

    await this.repo.createUserSettings(user.id);

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
  }

  // ── Forgot Password ────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const identity = await this.repo.findIdentityByEmail(dto.email, 'local');
    // Return success even if email not found — prevents user enumeration
    if (!identity) return;

    const otp = this.generateOtp();
    const codeHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.repo.upsertOtpCode({
      user_id: identity.user_id,
      code_hash: codeHash,
      purpose: 'reset_password',
      expires_at: expiresAt,
    });

    // Dev-only escape hatch: when SMTP isn't reachable (local testing),
    // return the OTP directly so you can test `reset-password`.
    const devReturnOtp = this.config.get<string>('DEV_RETURN_OTP');
    if (devReturnOtp === 'true') {
      return { otp };
    }

    await this.sendOtpEmail(dto.email, otp);
  }

  // ── Reset Password ─────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const identity = await this.repo.findIdentityByEmail(dto.email, 'local');
    if (!identity) throw new BadRequestException('Invalid request');

    const otp = await this.repo.findActiveOtp(
      identity.user_id,
      'reset_password',
    );
    if (!otp) throw new BadRequestException('OTP expired or not found');

    const codeHash = this.hashOtp(dto.otp_code);
    if (codeHash !== otp.code_hash)
      throw new BadRequestException('Invalid OTP');

    await this.repo.markOtpUsed(otp.id);

    const passwordHash = await bcrypt.hash(dto.new_password, 12);
    await this.repo.updatePasswordHash(identity.user_id, passwordHash);
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
