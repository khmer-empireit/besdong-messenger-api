import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';
import { loggerContext } from './logger.context';

@Injectable()
export class AppLogger implements LoggerService {
  private readonly logger = pino({ level: process.env.LOG_LEVEL || 'info' });

  private ctx() {
    return loggerContext.getStore() ?? {};
  }

  log(message: string, context?: string) {
    this.logger.info({ ...this.ctx(), context }, message);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error({ ...this.ctx(), context, trace }, message);
  }

  warn(message: string, context?: string) {
    this.logger.warn({ ...this.ctx(), context }, message);
  }

  debug(message: string, context?: string) {
    this.logger.debug({ ...this.ctx(), context }, message);
  }
}
