import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConversationRepository } from '../conversation/conversation.repository';
import { CallService } from './call.service';
import { CallType } from '../../shared/enums';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class CallGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly callService: CallService,
    private readonly convRepo: ConversationRepository,
  ) {}

  @SubscribeMessage('call:initiate')
  async onInitiate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: string; call_type?: CallType },
  ) {
    const callerId = client.data.userId as string | undefined;
    if (!callerId) return;

    const participant = await this.convRepo.getParticipant(data.conversation_id, callerId);
    if (!participant) {
      client.emit('error', { event: 'call:initiate', message: 'Not a member of this conversation' });
      return;
    }

    const existing = await this.callService.getActiveCall(data.conversation_id);
    if (existing) {
      client.emit('error', { event: 'call:initiate', message: 'A call is already active in this conversation' });
      return;
    }

    const participants = await this.convRepo.getParticipants(data.conversation_id);
    const callee = participants.find((p) => p.user_id !== callerId);
    if (!callee) {
      client.emit('error', { event: 'call:initiate', message: 'No other participant found' });
      return;
    }

    const session = await this.callService.createCall(
      data.conversation_id,
      callerId,
      callee.user_id,
      data.call_type ?? CallType.Audio,
    );

    this.server.to(`user:${callee.user_id}`).emit('call:incoming', {
      call_id: session.callId,
      conversation_id: data.conversation_id,
      caller_id: callerId,
      call_type: session.callType,
    });

    return { call_id: session.callId };
  }

  @SubscribeMessage('call:answer')
  async onAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: string },
  ) {
    const calleeId = client.data.userId as string | undefined;
    if (!calleeId) return;

    const session = await this.callService.getActiveCall(data.conversation_id);
    if (!session || session.calleeId !== calleeId) return;

    await this.callService.answerCall(data.conversation_id);

    this.server.to(`user:${session.callerId}`).emit('call:answered', {
      call_id: session.callId,
      conversation_id: data.conversation_id,
    });
  }

  @SubscribeMessage('call:reject')
  async onReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: string },
  ) {
    const calleeId = client.data.userId as string | undefined;
    if (!calleeId) return;

    const session = await this.callService.getActiveCall(data.conversation_id);
    if (!session || session.calleeId !== calleeId) return;

    await this.callService.endCall(data.conversation_id);

    this.server.to(`user:${session.callerId}`).emit('call:rejected', {
      call_id: session.callId,
      conversation_id: data.conversation_id,
    });

    await this.callService.writeCallLog(
      data.conversation_id,
      session.callerId,
      `${session.callType === CallType.Video ? 'Video' : 'Audio'} call • Declined`,
    );
  }

  @SubscribeMessage('call:ice-candidate')
  async onIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: string; candidate: object },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    const session = await this.callService.getActiveCall(data.conversation_id);
    if (!session) return;

    const targetId = session.callerId === userId ? session.calleeId : session.callerId;
    this.server.to(`user:${targetId}`).emit('call:ice-candidate', {
      conversation_id: data.conversation_id,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('call:hang-up')
  async onHangUp(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    const session = await this.callService.getActiveCall(data.conversation_id);
    if (!session) return;

    const { duration } = await this.callService.endCall(data.conversation_id);

    const otherPartyId = session.callerId === userId ? session.calleeId : session.callerId;
    this.server.to(`user:${otherPartyId}`).emit('call:ended', {
      call_id: session.callId,
      conversation_id: data.conversation_id,
      duration,
    });

    const label = session.callType === CallType.Video ? 'Video call' : 'Audio call';
    const content = duration !== null ? `${label} • ${formatDuration(duration)}` : `${label} • No answer`;
    await this.callService.writeCallLog(data.conversation_id, session.callerId, content);
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
