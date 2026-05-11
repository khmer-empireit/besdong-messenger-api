import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import knex, { Knex } from 'knex';
import pg from 'pg';

// Prevent pg from converting DATE columns to JS Date objects (which shifts timezone).
// Returns raw YYYY-MM-DD string instead.
pg.types.setTypeParser(pg.types.builtins.DATE, (val: string) => val);

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly knex: Knex;

  constructor(private config: ConfigService) {
    this.knex = knex({
      client: 'pg',
      connection: {
        host: this.config.get<string>('DB_HOST'),
        port: this.config.get<number>('DB_PORT'),
        user: this.config.get<string>('DB_USER'),
        password: this.config.get<string>('DB_PASSWORD'),
        database: this.config.get<string>('DB_NAME'),
      },
      pool: { min: 2, max: 10 },
    });
  }

  async onModuleDestroy() {
    await this.knex.destroy();
  }
}
