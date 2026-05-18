export interface CallLog {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  call_type: 'audio' | 'video';
  status: 'answered' | 'missed' | 'declined';
  duration: number | null;
  started_at: string;
  ended_at: string | null;
}

export interface CallLogListItem extends CallLog {
  direction: 'outgoing' | 'incoming';
  other_party: {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface InsertCallLog {
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  call_type: 'audio' | 'video';
  status: 'answered' | 'missed' | 'declined';
  duration: number | null;
  started_at: string;
  ended_at: string | null;
}
