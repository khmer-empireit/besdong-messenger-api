import { Global, Module } from '@nestjs/common';
import { AppLogger } from './logger.service';
import { CorrelationMiddleware } from './correlation.middleware';

@Global()
@Module({
  providers: [AppLogger, CorrelationMiddleware],
  exports: [AppLogger],
})
export class LoggerModule {}
