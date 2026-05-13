import { AsyncLocalStorage } from 'async_hooks';

export interface LogContext {
  requestId: string;
}

export const loggerContext = new AsyncLocalStorage<LogContext>();
