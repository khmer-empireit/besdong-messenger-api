import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PUSH_QUEUE, PushQueueService } from './push-queue.service';

@Global()
@Module({
  providers: [
    {
      provide: PUSH_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Queue('push', {
          connection: {
            host: config.get<string>('REDIS_HOST'),
            port: config.get<number>('REDIS_PORT'),
          },
        }),
    },
    PushQueueService,
  ],
  exports: [PushQueueService],
})
export class PushQueueModule {}
