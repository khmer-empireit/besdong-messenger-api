import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

const mockUser = {
  id: 'user-uuid-1',
  username: 'testuser',
  display_name: 'Test User',
  phone: null,
};

const mockIdentity = {
  id: 'identity-uuid-1',
  user_id: 'user-uuid-1',
  provider: 'local',
  email: 'test@besdong.com',
  password_hash: '$2a$12$hashedpassword',
};

const mockAuthToken = {
  id: 'token-uuid-1',
  user_id: 'user-uuid-1',
  token_hash: 'hashed-refresh-token',
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
};

const mockOtp = {
  id: 'otp-uuid-1',
  user_id: 'user-uuid-1',
  code_hash: '', // set per test
  purpose: 'reset_password',
  expires_at: new Date(Date.now() + 15 * 60 * 1000),
  used_at: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            findIdentityByEmail: jest.fn(),
            findUserByUsername: jest.fn(),
            createUser: jest.fn(),
            createIdentity: jest.fn(),
            createUserSettings: jest.fn(),
            createAuthToken: jest.fn(),
            findAuthToken: jest.fn(),
            deleteAuthToken: jest.fn(),
            updatePasswordHash: jest.fn(),
            upsertOtpCode: jest.fn(),
            findActiveOtp: jest.fn(),
            markOtpUsed: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              const map: Record<string, string> = {
                JWT_ACCESS_SECRET: 'test-access-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '30d',
              };
              return map[key] ?? fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    repo = module.get(AuthRepository);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    jwtService.signAsync.mockResolvedValue('mock-token');
    repo.createAuthToken.mockResolvedValue(mockAuthToken);
  });

  // ── Register ─────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates user and returns tokens', async () => {
      repo.findIdentityByEmail.mockResolvedValue(null);
      repo.findUserByUsername.mockResolvedValue(null);
      repo.createUser.mockResolvedValue(mockUser);
      repo.createIdentity.mockResolvedValue(mockIdentity);
      repo.createUserSettings.mockResolvedValue({});

      const result = await service.register({
        email: 'test@besdong.com',
        password: 'password123',
        display_name: 'Test User',
      });

      expect(result).toEqual({ access_token: 'mock-token', refresh_token: 'mock-token' });
      expect(repo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ display_name: 'Test User' }),
      );
      expect(repo.createIdentity).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'local', email: 'test@besdong.com' }),
      );
      expect(repo.createUserSettings).toHaveBeenCalledWith(mockUser.id);
    });

    it('auto-generates username from email prefix', async () => {
      repo.findIdentityByEmail.mockResolvedValue(null);
      repo.findUserByUsername.mockResolvedValue(null);
      repo.createUser.mockResolvedValue(mockUser);
      repo.createIdentity.mockResolvedValue(mockIdentity);
      repo.createUserSettings.mockResolvedValue({});

      await service.register({ email: 'john.doe@gmail.com', password: 'password123', display_name: 'John' });

      expect(repo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'john_doe' }),
      );
    });

    it('appends suffix when generated username is taken', async () => {
      repo.findIdentityByEmail.mockResolvedValue(null);
      repo.findUserByUsername
        .mockResolvedValueOnce({ id: 'other-user' }) // first candidate taken
        .mockResolvedValue(null);                     // second candidate free
      repo.createUser.mockResolvedValue(mockUser);
      repo.createIdentity.mockResolvedValue(mockIdentity);
      repo.createUserSettings.mockResolvedValue({});

      await service.register({ email: 'test@besdong.com', password: 'password123', display_name: 'Test' });

      const calledWith = repo.createUser.mock.calls[0][0];
      expect(calledWith.username).toMatch(/^test_\d{4}$/);
    });

    it('throws ConflictException if email already registered', async () => {
      repo.findIdentityByEmail.mockResolvedValue(mockIdentity);

      await expect(
        service.register({ email: 'test@besdong.com', password: 'password123', display_name: 'Test User' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── Login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 12);
      repo.findIdentityByEmail.mockResolvedValue({ ...mockIdentity, password_hash: hash });

      const result = await service.login({ email: 'test@besdong.com', password: 'password123' });

      expect(result).toEqual({ access_token: 'mock-token', refresh_token: 'mock-token' });
    });

    it('throws UnauthorizedException if email not found', async () => {
      repo.findIdentityByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@besdong.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      const hash = await bcrypt.hash('correct-password', 12);
      repo.findIdentityByEmail.mockResolvedValue({ ...mockIdentity, password_hash: hash });

      await expect(
        service.login({ email: 'test@besdong.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── Refresh ──────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('returns new access token for valid refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-1' });
      repo.findAuthToken.mockResolvedValue(mockAuthToken);

      const result = await service.refresh('valid-refresh-token');

      expect(result).toEqual({ access_token: 'mock-token' });
    });

    it('throws UnauthorizedException if token is invalid JWT', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if token not in DB (revoked)', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-1' });
      repo.findAuthToken.mockResolvedValue(null);

      await expect(service.refresh('revoked-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── Logout ───────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('deletes the auth token', async () => {
      repo.deleteAuthToken.mockResolvedValue(1);

      await service.logout('user-uuid-1', 'refresh-token');

      expect(repo.deleteAuthToken).toHaveBeenCalledWith('user-uuid-1', expect.any(String));
    });
  });

  // ── Forgot Password ───────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('stores OTP when email exists', async () => {
      repo.findIdentityByEmail.mockResolvedValue(mockIdentity);
      repo.upsertOtpCode.mockResolvedValue({});
      jest.spyOn(service as any, 'sendOtpEmail').mockResolvedValue(undefined);

      await service.forgotPassword({ email: 'test@besdong.com' });

      expect(repo.upsertOtpCode).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: mockIdentity.user_id, purpose: 'reset_password' }),
      );
    });

    it('does not throw when email does not exist (prevents enumeration)', async () => {
      repo.findIdentityByEmail.mockResolvedValue(null);

      await expect(service.forgotPassword({ email: 'ghost@besdong.com' })).resolves.not.toThrow();
      expect(repo.upsertOtpCode).not.toHaveBeenCalled();
    });
  });

  // ── Reset Password ────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    const otp = '123456';
    const crypto = require('crypto');
    const codeHash = crypto.createHash('sha256').update(otp).digest('hex');

    it('resets password on valid OTP', async () => {
      repo.findIdentityByEmail.mockResolvedValue(mockIdentity);
      repo.findActiveOtp.mockResolvedValue({ ...mockOtp, code_hash: codeHash });
      repo.markOtpUsed.mockResolvedValue(1);
      repo.updatePasswordHash.mockResolvedValue(1);

      await service.resetPassword({
        email: 'test@besdong.com',
        otp_code: otp,
        new_password: 'newpassword123',
      });

      expect(repo.markOtpUsed).toHaveBeenCalledWith(mockOtp.id);
      expect(repo.updatePasswordHash).toHaveBeenCalledWith(
        mockIdentity.user_id,
        expect.any(String),
      );
    });

    it('throws BadRequestException if OTP not found or expired', async () => {
      repo.findIdentityByEmail.mockResolvedValue(mockIdentity);
      repo.findActiveOtp.mockResolvedValue(null);

      await expect(
        service.resetPassword({ email: 'test@besdong.com', otp_code: '000000', new_password: 'new' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if OTP code is wrong', async () => {
      repo.findIdentityByEmail.mockResolvedValue(mockIdentity);
      repo.findActiveOtp.mockResolvedValue({ ...mockOtp, code_hash: codeHash });

      await expect(
        service.resetPassword({ email: 'test@besdong.com', otp_code: '999999', new_password: 'new' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
