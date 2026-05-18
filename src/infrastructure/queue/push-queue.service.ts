import { Injectable, OnModuleDestroy, Inject } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConversationType, MessageType } from '../../shared/enums';

export const PUSH_QUEUE = 'PUSH_QUEUE';

export interface PushJobData {
  conversationId: string;
  convType: ConversationType;
  senderId: string;
  recipientId: string;
  messageId: string;
  messageType: MessageType;
  messageContent: string;
  messageCreatedAt: string;
}

@Injectable()
export class PushQueueService implements OnModuleDestroy {
  constructor(@Inject(PUSH_QUEUE) private readonly queue: Queue) {}

  async onModuleDestroy() {
    await this.queue.close();
  }

  async schedulePush(data: PushJobData): Promise<void> {
    const jobId = `push:${data.conversationId}:${data.recipientId}`;
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'delayed') await existing.remove();
    }
    await this.queue.add('send-push', data, {
      jobId,
      delay: 1000,
      removeOnComplete: true,
      removeOnFail: { count: 5 },
    });
  }
}
