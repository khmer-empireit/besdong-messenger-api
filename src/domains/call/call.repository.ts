import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { CallLog, CallLogListItem, InsertCallLog } from './entities/call-log.entity';
import { CallFilter, ICallRepository } from './interfaces/i-call.repository';

@Injectable()
export class CallRepository implements ICallRepository {
  constructor(private readonly db: DbService) {}

  async save(data: InsertCallLog): Promise<CallLog> {
    const [row] = await this.db.knex('call_logs').insert(data).returning('*');
    return row as CallLog;
  }

  async list(userId: string, filter: CallFilter, cursor: string | null, limit: number): Promise<CallLogListItem[]> {
    let query = this.db
      .knex('call_logs as cl')
      .join('users as u1', 'u1.id', 'cl.caller_id')
      .join('users as u2', 'u2.id', 'cl.callee_id')
      .where(function () {
        this.where('cl.caller_id', userId).orWhere('cl.callee_id', userId);
      })
      .select([
        'cl.id',
        'cl.conversation_id',
        'cl.call_type',
        'cl.status',
        'cl.duration',
        'cl.started_at',
        'cl.ended_at',
        this.db.knex.raw(`CASE WHEN cl.caller_id = ? THEN 'outgoing' ELSE 'incoming' END AS direction`, [userId]),
        this.db.knex.raw(
          `CASE WHEN cl.caller_id = ? THEN json_build_object('id', u2.id, 'name', u2.display_name, 'username', u2.username, 'avatar_url', u2.avatar_url)
                ELSE json_build_object('id', u1.id, 'name', u1.display_name, 'username', u1.username, 'avatar_url', u1.avatar_url)
           END AS other_party`,
          [userId],
        ),
      ])
      .orderBy('cl.started_at', 'desc')
      .limit(limit + 1);

    if (filter === 'missed') query = query.whereIn('cl.status', ['missed', 'declined']);
    if (filter === 'voice') query = query.where('cl.call_type', 'audio');
    if (filter === 'video') query = query.where('cl.call_type', 'video');
    if (cursor) query = query.where('cl.started_at', '<', cursor);

    return query as unknown as Promise<CallLogListItem[]>;
  }
}
