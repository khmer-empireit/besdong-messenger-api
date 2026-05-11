import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';

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

const mockOAuthIdentity = {
  id: 'identity-uuid-2',
  user_id: 'user-uuid-1',
  provider: 'google',
  provider_user_id: 'google-sub-123',
  email: 'oauth@gmail.com',
  password_hash: null,
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
  let firebaseMock: { auth: { verifyIdToken: jest.Mock } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            findIdentityByEmail: jest.fn(),
            findIdentityByProviderId: jest.fn(),
            updateProviderUserId: jest.fn(),
            findUserByUsername: jest.fn(),
            createLocalUser: jest.fn(),
            createOAuthUser: jest.fn(),
            createAuthToken: jest.fn(),
            findAuthToken: jest.fn(),
            deleteAuthToken: jest.fn(),
            updatePasswordHash: jest.fn(),
            upsertOtpCode: jest.fn(),
            findActiveOtp: jest.fn(),
            markOtpUsed: jest.fn(),
            isAuthMethodEnabled: jest.fn(),
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
        {
          provide: FirebaseService,
          useValue: { auth: { verifyIdToken: jest.fn() } },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    repo = module.get(AuthRepository);
    jwtService = module.get(JwtService);
    firebaseMock = module.get(FirebaseService) as any;

    jwtService.signAsync.mockResolvedValue('mock-token');
    repo.createAuthToken.mockResolvedValue(mockAuthToken);
    repo.isAuthMethodEnabled.mockResolvedValue(true);
  });

  // ── Register ─────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates user and returns tokens', async () => {
      repo.findIdentityByEmail.mockResolvedValue(null);
      repo.findUserByUsername.mockResolvedValue(null);
      repo.createLocalUser.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@besdong.com',
        password: 'password123',
        display_name: 'Test User',
      });

      expect(result).toEqual({ access_token: 'mock-token', refresh_token: 'mock-token' });
      expect(repo.createLocalUser).toHaveBeenCalledWith(
        expect.objectContaining({ display_name: 'Test User', email: 'test@besdong.com' }),
      );
    });

    it('auto-generates username from email prefix', async () => {
      repo.findIdentityByEmail.mockResolvedValue(null);
      repo.findUserByUsername.mockResolvedValue(null);
      repo.createLocalUser.mockResolvedValue(mockUser);

      await service.register({
        email: 'john.doe@gmail.com',
        password: 'password123',
        display_name: 'John',
      });

      expect(repo.createLocalUser).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'john_doe' }),
      );
    });

    it('appends suffix when generated username is taken', async () => {
      repo.findIdentityByEmail.mockResolvedValue(null);
      repo.findUserByUsername
        .mockResolvedValueOnce({ id: 'other-user' }) // first candidate taken
        .mockResolvedValue(null); // second candidate free
      repo.createLocalUser.mockResolvedValue(mockUser);

      await service.register({
        email: 'test@besdong.com',
        password: 'password123',
        display_name: 'Test',
      });

      const calledWith = repo.createLocalUser.mock.calls[0][0];
      expect(calledWith.username).toMatch(/^test_\d{4}$/);
    });

    it('throws ConflictException if email already registered', async () => {
      repo.findIdentityByEmail.mockResolvedValue(mockIdentity);

      await expect(
        service.register({
          email: 'test@besdong.com',
          password: 'password123',
          display_name: 'Test User',
        }),
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

  // ── OAuth Login ───────────────────────────────────────────────────────────

  describe('oauthLogin', () => {
    const decodedGoogleToken = {
      uid: 'google-sub-123',
      email: 'oauth@gmail.com',
      name: 'OAuth User',
      firebase: { sign_in_provider: 'google.com' },
    };

    beforeEach(() => {
      firebaseMock.auth.verifyIdToken.mockResolvedValue(decodedGoogleToken);
    });

    it('returns tokens immediately for known provider_user_id', async () => {
      repo.findIdentityByProviderId.mockResolvedValue(mockOAuthIdentity);

      const result = await service.oauthLogin({ token: 'firebase-token' });

      expect(result).toEqual({ access_token: 'mock-token', refresh_token: 'mock-token' });
      expect(repo.createOAuthUser).not.toHaveBeenCalled();
    });

    it('links provider_user_id when email matches an existing identity', async () => {
      repo.findIdentityByProviderId.mockResolvedValue(null);
      repo.findIdentityByEmail.mockResolvedValue({ ...mockOAuthIdentity, provider_user_id: null });
      repo.updateProviderUserId.mockResolvedValue(1);

      await service.oauthLogin({ token: 'firebase-token' });

      expect(repo.updateProviderUserId).toHaveBeenCalledWith(
        mockOAuthIdentity.id,
        'google-sub-123',
      );
      expect(repo.createOAuthUser).not.toHaveBeenCalled();
    });

    it('creates a new user when no identity exists', async () => {
      repo.findIdentityByProviderId.mockResolvedValue(null);
      repo.findIdentityByEmail.mockResolvedValue(null);
      repo.findUserByUsername.mockResolvedValue(null);
      repo.createOAuthUser.mockResolvedValue(mockUser);

      const result = await service.oauthLogin({ token: 'firebase-token' });

      expect(repo.createOAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
          email: 'oauth@gmail.com',
          display_name: 'OAuth User',
        }),
      );
      expect(result).toEqual({ access_token: 'mock-token', refresh_token: 'mock-token' });
    });

    it('falls back to username as display_name when provider returns no name', async () => {
      firebaseMock.auth.verifyIdToken.mockResolvedValue({
        ...decodedGoogleToken,
        name: undefined,
        firebase: { sign_in_provider: 'apple.com' },
      });
      repo.findIdentityByProviderId.mockResolvedValue(null);
      repo.findIdentityByEmail.mockResolvedValue(null);
      repo.findUserByUsername.mockResolvedValue(null);
      repo.createOAuthUser.mockResolvedValue(mockUser);

      await service.oauthLogin({ token: 'apple-firebase-token' });

      const call = repo.createOAuthUser.mock.calls[0][0];
      expect(call.display_name).toBe(call.username);
    });

    it('handles Apple relay email as opaque identifier', async () => {
      firebaseMock.auth.verifyIdToken.mockResolvedValue({
        uid: 'apple-sub-999',
        email: 'relay@privaterelay.appleid.com',
        firebase: { sign_in_provider: 'apple.com' },
      });
      repo.findIdentityByProviderId.mockResolvedValue(null);
      repo.findIdentityByEmail.mockResolvedValue(null);
      repo.findUserByUsername.mockResolvedValue(null);
      repo.createOAuthUser.mockResolvedValue(mockUser);

      const result = await service.oauthLogin({ token: 'apple-firebase-token' });

      expect(repo.createOAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'relay@privaterelay.appleid.com' }),
      );
      expect(result).toEqual({ access_token: 'mock-token', refresh_token: 'mock-token' });
    });

    it('throws UnauthorizedException on invalid or expired Firebase token', async () => {
      firebaseMock.auth.verifyIdToken.mockRejectedValue(new Error('Firebase ID token has expired'));

      await expect(service.oauthLogin({ token: 'expired-token' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for unsupported sign-in provider', async () => {
      firebaseMock.auth.verifyIdToken.mockResolvedValue({
        ...decodedGoogleToken,
        firebase: { sign_in_provider: 'password' },
      });

      await expect(service.oauthLogin({ token: 'password-token' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when Firebase token has no email', async () => {
      firebaseMock.auth.verifyIdToken.mockResolvedValue({
        ...decodedGoogleToken,
        email: undefined,
      });

      await expect(service.oauthLogin({ token: 'no-email-token' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rolls back when createOAuthUser throws mid-transaction', async () => {
      repo.findIdentityByProviderId.mockResolvedValue(null);
      repo.findIdentityByEmail.mockResolvedValue(null);
      repo.findUserByUsername.mockResolvedValue(null);
      repo.createOAuthUser.mockRejectedValue(new Error('DB constraint violation'));

      await expect(service.oauthLogin({ token: 'firebase-token' })).rejects.toThrow(
        'DB constraint violation',
      );
      expect(repo.createAuthToken).not.toHaveBeenCalled();
    });
  });

  // ── Reset Password ────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    const otp = '123456';
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
        service.resetPassword({
          email: 'test@besdong.com',
          otp_code: '000000',
          new_password: 'new',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if OTP code is wrong', async () => {
      repo.findIdentityByEmail.mockResolvedValue(mockIdentity);
      repo.findActiveOtp.mockResolvedValue({ ...mockOtp, code_hash: codeHash });

      await expect(
        service.resetPassword({
          email: 'test@besdong.com',
          otp_code: '999999',
          new_password: 'new',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
