import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { MessageService } from '../message/message.service';
import { CallSession } from './entities/call-session.entity';
import { CallLogListItem } from './entities/call-log.entity';
import { CallFilter, ICallRepository } from './interfaces/i-call.repository';
import { CallStatus, CallType } from '../../shared/enums';

const RINGING_TTL = 60;
const ACTIVE_TTL = 60 * 60;

@Injectable()
export class CallService {
  constructor(
    private readonly redis: RedisService,
    private readonly messageService: MessageService,
    private readonly config: ConfigService,
    @Inject(ICallRepository) private readonly callRepo: ICallRepository,
  ) {}

  async getActiveCall(conversationId: string): Promise<CallSession | null> {
    const raw = await this.redis.client.get(this.key(conversationId));
    return raw ? (JSON.parse(raw) as CallSession) : null;
  }

  async createCall(
    conversationId: string,
    callerId: string,
    calleeId: string,
    callType: CallType,
  ): Promise<CallSession> {
    const session: CallSession = {
      callId: randomUUID(),
      conversationId,
      callerId,
      calleeId,
      callType,
      status: CallStatus.Ringing,
      startedAt: new Date().toISOString(),
    };
    await this.redis.client.set(this.key(conversationId), JSON.stringify(session), 'EX', RINGING_TTL);
    return session;
  }

  async answerCall(conversationId: string): Promise<CallSession> {
    const session = await this.getActiveCall(conversationId);
    if (!session) throw new Error('No active call');
    session.status = CallStatus.Active;
    session.answeredAt = new Date().toISOString();
    await this.redis.client.set(this.key(conversationId), JSON.stringify(session), 'EX', ACTIVE_TTL);
    return session;
  }

  async endCall(conversationId: string): Promise<{ session: CallSession | null; duration: number | null }> {
    const session = await this.getActiveCall(conversationId);
    if (!session) return { session: null, duration: null };
    await this.redis.client.del(this.key(conversationId));

    const duration =
      session.status === CallStatus.Active && session.answeredAt
        ? Math.floor((Date.now() - new Date(session.answeredAt).getTime()) / 1000)
        : null;

    return { session, duration };
  }

  async saveCallLog(
    session: CallSession,
    status: 'answered' | 'missed' | 'declined',
    duration: number | null,
  ): Promise<void> {
    await this.callRepo.save({
      conversation_id: session.conversationId,
      caller_id: session.callerId,
      callee_id: session.calleeId,
      call_type: session.callType === CallType.Video ? 'video' : 'audio',
      status,
      duration,
      started_at: session.startedAt,
      ended_at: new Date().toISOString(),
    });
  }

  async listCallLogs(
    userId: string,
    filter: CallFilter,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: CallLogListItem[]; has_more: boolean; next_cursor: string | null }> {
    const rows = await this.callRepo.list(userId, filter, cursor, limit);
    const has_more = rows.length > limit;
    const data = has_more ? rows.slice(0, limit) : rows;
    const next_cursor = has_more ? data[data.length - 1].started_at : null;
    return { data, has_more, next_cursor };
  }

  async writeCallLog(conversationId: string, senderId: string, content: string): Promise<void> {
    await this.messageService.createCallLog(conversationId, senderId, content);
  }

  generateTurnCredentials(userId: string): { ice_servers: object[] } {
    const turnHost = this.config.get<string>('TURN_HOST');
    const turnSecret = this.config.get<string>('TURN_SECRET');
    const stunHost = this.config.get<string>('STUN_HOST') ?? 'stun.l.google.com:19302';

    const iceServers: object[] = [{ urls: `stun:${stunHost}` }];

    if (turnHost && turnSecret) {
      const ttl = Math.floor(Date.now() / 1000) + 3600;
      const username = `${ttl}:${userId}`;
      const credential = createHmac('sha1', turnSecret).update(username).digest('base64');
      iceServers.push({
        urls: [`turn:${turnHost}:3478`, `turn:${turnHost}:3478?transport=tcp`],
        username,
        credential,
      });
    }

    return { ice_servers: iceServers };
  }

  private key(conversationId: string): string {
    return `call:active:${conversationId}`;
  }
}
