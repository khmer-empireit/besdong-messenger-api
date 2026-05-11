import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { AuthConfig, AuthMethod } from './entities/auth-config.entity';

@Injectable()
export class AdminRepository {
  constructor(private db: DbService) {}

  async findAllAuthConfigs(): Promise<AuthConfig[]> {
    return this.db.knex('auth_config').select('*').orderBy('method');
  }

  async findAuthConfig(method: AuthMethod): Promise<AuthConfig | undefined> {
    return this.db.knex('auth_config').where({ method }).first();
  }

  async updateAuthConfig(method: AuthMethod, isEnabled: boolean): Promise<AuthConfig> {
    const [config] = await this.db
      .knex('auth_config')
      .where({ method })
      .update({ is_enabled: isEnabled, updated_at: new Date() })
      .returning('*');
    return config;
  }

  async isMethodEnabled(method: string): Promise<boolean> {
    const config = await this.db.knex('auth_config').where({ method }).first();
    return config?.is_enabled ?? true;
  }
}
