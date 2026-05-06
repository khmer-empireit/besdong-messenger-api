import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { Request } from 'express';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly limiters = new Map<string, RateLimiterRedis>();
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private reflector: Reflector,
    private redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<{ points: number; duration: number }>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const ip = (request.headers['x-forwarded-for'] as string)?.split(',')[0] ?? request.ip ?? 'unknown';
    const handlerKey = `${context.getClass().name}_${context.getHandler().name}`;

    const limiter = this.getOrCreateLimiter(handlerKey, options.points, options.duration);

    try {
      await limiter.consume(ip);
      return true;
    } catch (error) {
      if (error instanceof RateLimiterRes) {
        throw new HttpException(
          'Too many requests — please try again later',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      // Redis is unavailable — fail open so users aren't blocked
      this.logger.warn('Rate limiter Redis error — allowing request');
      return true;
    }
  }

  private getOrCreateLimiter(key: string, points: number, duration: number): RateLimiterRedis {
    if (!this.limiters.has(key)) {
      this.limiters.set(
        key,
        new RateLimiterRedis({
          storeClient: this.redis.client,
          keyPrefix: `rl_${key}`,
          points,
          duration,
        }),
      );
    }
    return this.limiters.get(key)!;
  }
}
