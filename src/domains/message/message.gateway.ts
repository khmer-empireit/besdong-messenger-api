import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessageService } from './message.service';
import { ConversationRepository } from '../conversation/conversation.repository';
import { DbService } from '../../infrastructure/database/db.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private messageService: MessageService,
    private convRepo: ConversationRepository,
    private db: DbService,
  ) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) return client.disconnect();

    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      client.data.userId = payload.sub;
      await this.setOnlineStatus(payload.sub, true);
      this.server.emit('user:status', { user_id: payload.sub, is_online: true, last_seen_at: null });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;
    const lastSeenAt = new Date();
    await this.setOnlineStatus(userId, false, lastSeenAt);
    this.server.emit('user:status', { user_id: userId, is_online: false, last_seen_at: lastSeenAt });
  }

  @SubscribeMessage('message:send')
  async onMessageSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: string; content: string; reply_to_id?: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const msg = await this.messageService.send(data.conversation_id, userId, {
        content: data.content,
        reply_to_id: data.reply_to_id,
      });
      this.server.to(data.conversation_id).emit('message:new', msg);
    } catch {
      client.emit('error', { event: 'message:send', message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('message:read')
  async onMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      await this.messageService.markRead(data.conversation_id, userId);
      const lastReadAt = new Date();
      this.server.to(data.conversation_id).emit('message:read_receipt', {
        conversation_id: data.conversation_id,
        user_id: userId,
        last_read_at: lastReadAt,
      });
    } catch {
      // silently ignore — non-critical
    }
  }

  @SubscribeMessage('typing:start')
  onTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    client.to(data.conversation_id).emit('typing:indicator', {
      conversation_id: data.conversation_id,
      user_id: userId,
      is_typing: true,
    });
  }

  @SubscribeMessage('typing:stop')
  onTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    client.to(data.conversation_id).emit('typing:indicator', {
      conversation_id: data.conversation_id,
      user_id: userId,
      is_typing: false,
    });
  }

  @SubscribeMessage('conversation:join')
  async onJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    const p = await this.convRepo.getParticipant(data.conversation_id, userId);
    if (p) await client.join(data.conversation_id);
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth?.token || client.handshake.headers?.authorization;
    if (!auth) return undefined;
    const [type, token] = auth.split(' ');
    return type === 'Bearer' ? token : auth;
  }

  private async setOnlineStatus(userId: string, isOnline: boolean, lastSeenAt?: Date) {
    const update: Record<string, unknown> = { is_online: isOnline };
    if (!isOnline && lastSeenAt) update.last_seen_at = lastSeenAt;
    await this.db.knex('users').where({ id: userId }).update(update);
  }
}
