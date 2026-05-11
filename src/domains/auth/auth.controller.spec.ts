import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from '../../shared/filters/http-exception.filter';
import { ResponseInterceptor } from '../../shared/interceptors/response.interceptor';
import { RateLimitGuard } from '../../shared/guards/rate-limit.guard';
import { RedisService } from '../../infrastructure/cache/redis.service';

const mockTokens = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
};

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  oauthLogin: jest.fn(),
};

describe('AuthController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-uuid-1' }) },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
        {
          provide: RedisService,
          useValue: { client: {} },
        },
        RateLimitGuard,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  // ── POST /api/v1/auth/register ────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('returns 201 with tokens on valid payload', async () => {
      mockAuthService.register.mockResolvedValue(mockTokens);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'new@besdong.com', password: 'password123', display_name: 'New User' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockTokens);
    });

    it('returns 400 with field-keyed errors on missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'bad@besdong.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors).toHaveProperty('password');
      expect(res.body.errors).toHaveProperty('display_name');
    });

    it('returns 400 with errors.email on invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: 'password123', display_name: 'User' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveProperty('email');
    });

    it('returns 400 with errors.password on short password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'test@besdong.com', password: 'short', display_name: 'User' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveProperty('password');
    });
  });

  // ── POST /api/v1/auth/login ───────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('returns 200 with tokens on valid credentials', async () => {
      mockAuthService.login.mockResolvedValue(mockTokens);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@besdong.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockTokens);
    });

    it('returns 400 on missing fields', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({});

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/v1/auth/refresh ─────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('returns 200 with new access token', async () => {
      mockAuthService.refresh.mockResolvedValue({ access_token: 'new-access-token' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'some-refresh-token' });

      expect(res.status).toBe(200);
      expect(res.body.data.access_token).toBe('new-access-token');
    });

    it('returns 400 when refresh_token missing', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({});

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/v1/auth/logout ──────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('returns 200 when authenticated', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer mock-access-token')
        .send({ refresh_token: 'some-refresh-token' });

      expect(res.status).toBe(200);
    });

    it('returns 401 without Authorization header', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refresh_token: 'some-refresh-token' });

      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/v1/auth/forgot-password ─────────────────────────────────────

  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns 200 for valid email', async () => {
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'test@besdong.com' });

      expect(res.status).toBe(200);
    });

    it('returns 400 on invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-valid' });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/v1/auth/reset-password ──────────────────────────────────────

  describe('POST /api/v1/auth/reset-password', () => {
    it('returns 200 on valid payload', async () => {
      mockAuthService.resetPassword.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ email: 'test@besdong.com', otp_code: '123456', new_password: 'newpassword123' });

      expect(res.status).toBe(200);
    });

    it('returns 400 when otp_code is not 6 digits', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ email: 'test@besdong.com', otp_code: '12345', new_password: 'newpassword123' });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/v1/auth/oauth ───────────────────────────────────────────────

  describe('POST /api/v1/auth/oauth', () => {
    it('returns 201 with tokens on valid Firebase token', async () => {
      mockAuthService.oauthLogin.mockResolvedValue(mockTokens);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/oauth')
        .send({ token: 'firebase-id-token' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockTokens);
    });

    it('returns 400 when token is missing', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/oauth').send({});

      expect(res.status).toBe(400);
    });

    it('returns 400 when token is empty string', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/oauth').send({ token: '' });

      expect(res.status).toBe(400);
    });
  });
});
