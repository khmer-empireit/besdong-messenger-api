import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DbService } from '../../infrastructure/database/db.service';
import { RedisService } from '../../infrastructure/cache/redis.service';

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private db: DbService,
    private redis: RedisService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check — returns DB and Redis status' })
  @ApiResponse({ status: 200, description: 'All systems healthy' })
  @ApiResponse({ status: 503, description: 'One or more systems degraded' })
  async check() {
    const [db, redis] = await Promise.all([
      this.checkDb(),
      this.checkRedis(),
    ]);

    const healthy = db.status === 'ok' && redis.status === 'ok';

    if (!healthy) {
      throw new ServiceUnavailableException({ message: 'One or more systems degraded', db, redis });
    }

    return { db, redis };
  }

  private async checkDb(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      await this.db.knex.raw('SELECT 1');
      return { status: 'ok' };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }

  private async checkRedis(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      await this.redis.client.ping();
      return { status: 'ok' };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }
}
