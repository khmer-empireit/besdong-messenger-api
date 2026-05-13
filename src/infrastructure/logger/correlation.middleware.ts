import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { loggerContext } from './logger.context';
import { AppLogger } from './logger.service';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  constructor(private logger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('X-Request-ID', requestId);

    loggerContext.run({ requestId }, () => {
      const start = Date.now();
      this.logger.log(`→ ${req.method} ${req.path}`, 'HTTP');

      res.on('finish', () => {
        const ms = Date.now() - start;
        const msg = `← ${req.method} ${req.path} ${res.statusCode} ${ms}ms`;
        if (res.statusCode >= 500) this.logger.error(msg, undefined, 'HTTP');
        else if (res.statusCode >= 400) this.logger.warn(msg, 'HTTP');
        else this.logger.log(msg, 'HTTP');
      });

      next();
    });
  }
}
