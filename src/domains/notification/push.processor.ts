import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import { UserService } from '../user/user.service';
import { ConversationRepository } from '../conversation/conversation.repository';
import { MessageService } from '../message/message.service';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';
import { AppLogger } from '../../infrastructure/logger/logger.service';
import { PushJobData } from '../../infrastructure/queue/push-queue.service';
import { ConversationType, MessageType } from '../../shared/enums';

@Injectable()
export class PushProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;

  constructor(
    private readonly userService: UserService,
    private readonly convRepo: ConversationRepository,
    private readonly messageService: MessageService,
    private readonly firebaseService: FirebaseService,
    private readonly config: ConfigService,
    private readonly logger: AppLogger,
  ) {}

  onModuleInit() {
    this.worker = new Worker('push', (job) => this.process(job.data), {
      connection: {
        host: this.config.get<string>('REDIS_HOST'),
        port: this.config.get<number>('REDIS_PORT'),
      },
    });
    this.worker.on('failed', (_job, err) =>
      this.logger.error(`push job failed: ${err.message}`, err.stack, 'Push'),
    );
  }

  async onModuleDestroy() {
    await this.worker.close();
  }

  private async process(data: PushJobData): Promise<void> {
    const { conversationId, convType, senderId, recipientId, messageId, messageType, messageContent, messageCreatedAt } = data;

    const profile = await this.userService.getProfile(recipientId);
    if (profile.is_online) return;

    const participant = await this.convRepo.getParticipant(conversationId, recipientId);
    const msgCreatedAt = new Date(messageCreatedAt);
    if (participant?.last_read_at && participant.last_read_at >= msgCreatedAt) return;

    const settings = await this.userService.getSettings(recipientId);
    if (!settings.notifications_enabled || settings.do_not_disturb) return;
    if (convType === ConversationType.Direct && !settings.notify_messages) return;
    if (convType === ConversationType.Group && !settings.notify_groups) return;

    const tokens = await this.userService.getDeviceTokens(recipientId);
    if (tokens.length === 0) return;

    const [sender, unread] = await Promise.all([
      this.userService.getProfile(senderId),
      this.messageService.getUnreadCount(conversationId, recipientId),
    ]);

    let body: string;
    switch (messageType) {
      case MessageType.Image: body = 'Sent an image'; break;
      case MessageType.Audio: body = 'Sent an audio message'; break;
      case MessageType.File: body = 'Sent a file'; break;
      default: body = messageContent.substring(0, 100);
    }
    if (unread > 1) body = `${body} (${unread} new messages)`;

    this.logger.log(`push → userId=${recipientId} tokens=${tokens.length} unread=${unread} msg=${messageId}`, 'Push');
    const invalid = await this.firebaseService.sendPush(tokens, sender.display_name, body, {
      conversation_id: conversationId,
    });
    for (const token of invalid) {
      await this.userService.purgeDeviceToken(token);
    }
  }
}
