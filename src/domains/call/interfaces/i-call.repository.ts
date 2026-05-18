import { CallLog, CallLogListItem, InsertCallLog } from '../entities/call-log.entity';

export type CallFilter = 'all' | 'missed' | 'voice' | 'video';

export const ICallRepository = Symbol('ICallRepository');

export interface ICallRepository {
  save(data: InsertCallLog): Promise<CallLog>;
  list(userId: string, filter: CallFilter, cursor: string | null, limit: number): Promise<CallLogListItem[]>;
}
