import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { IBlockRepository } from './interfaces/block-repository.interface';

@Injectable()
export class BlockRepository implements IBlockRepository {
  constructor(private db: DbService) {}

  async block(blockerId: string, blockedId: string): Promise<void> {
    await this.db.knex('blocked_users').insert({ blocker_id: blockerId, blocked_id: blockedId });
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await this.db.knex('blocked_users').where({ blocker_id: blockerId, blocked_id: blockedId }).delete();
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const row = await this.db.knex('blocked_users').where({ blocker_id: blockerId, blocked_id: blockedId }).first();
    return !!row;
  }

  async isBlockedEither(userA: string, userB: string): Promise<boolean> {
    const row = await this.db
      .knex('blocked_users')
      .where({ blocker_id: userA, blocked_id: userB })
      .orWhere({ blocker_id: userB, blocked_id: userA })
      .first();
    return !!row;
  }

  async listBlocked(blockerId: string): Promise<{ id: string; username: string; display_name: string; avatar_url: string | null }[]> {
    return this.db
      .knex('blocked_users as b')
      .join('users as u', 'u.id', 'b.blocked_id')
      .where('b.blocker_id', blockerId)
      .select('u.id', 'u.username', 'u.display_name', 'u.avatar_url')
      .orderBy('b.created_at', 'desc');
  }
}
