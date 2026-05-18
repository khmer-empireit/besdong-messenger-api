import { CallStatus, CallType } from '../../../shared/enums';

export interface CallSession {
  callId: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  callType: CallType;
  status: CallStatus;
  startedAt: string;
  answeredAt?: string;
}
