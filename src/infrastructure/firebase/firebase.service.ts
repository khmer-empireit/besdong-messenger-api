import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private config: ConfigService) {}

  onModuleInit() {
    if (!admin.apps.length) {
      const encoded = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT')!;
      const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString());
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
  }

  get auth() {
    return admin.auth();
  }

  async sendPush(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<string[]> {
    if (tokens.length === 0) return [];
    const tag = data?.conversation_id ?? 'besdong';
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
      webpush: {
        headers: { Urgency: 'high' },
        notification: { title, body, tag, renotify: true },
      },
      android: {
        priority: 'high',
        collapseKey: tag,
        notification: { title, body, tag },
      },
      apns: {
        headers: { 'apns-priority': '10', 'apns-collapse-id': tag },
      },
    });
    const invalid: string[] = [];
    response.responses.forEach((r, i) => {
      if (!r.success) {
        this.logger.warn(`FCM failed for token[${i}]: ${r.error?.code} — ${r.error?.message}`);
        if (
          r.error?.code === 'messaging/invalid-registration-token' ||
          r.error?.code === 'messaging/registration-token-not-registered'
        ) {
          invalid.push(tokens[i]);
        }
      }
    });
    return invalid;
  }
}
