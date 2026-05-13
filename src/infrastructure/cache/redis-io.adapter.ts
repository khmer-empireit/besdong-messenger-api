import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisService } from './redis.service';

export class RedisIoAdapter extends IoAdapter {
  private redisService: RedisService;

  constructor(app: any, redisService: RedisService) {
    super(app);
    this.redisService = redisService;
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    const pubClient = this.redisService.client.duplicate({ lazyConnect: false, enableOfflineQueue: true });
    const subClient = this.redisService.client.duplicate({ lazyConnect: false, enableOfflineQueue: true });
    server.adapter(createAdapter(pubClient, subClient));
    return server;
  }
}
