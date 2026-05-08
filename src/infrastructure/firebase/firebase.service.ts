import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
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
}
