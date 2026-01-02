import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private app: admin.app.App | null = null;

  constructor() {
    try {
      const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;

      if (!base64Key || base64Key.includes('dummy') || base64Key.includes('build')) {
        console.warn('[Firebase] ⚠️  Firebase credentials not available - skipping initialization');
        return;
      }

      // Decode Base64 service account key
      const credentials = JSON.parse(Buffer.from(base64Key, 'base64').toString());

      this.app = admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });

      console.log('✅ Firebase Admin initialized');
    } catch (error) {
      console.error('[Firebase] Failed to initialize Firebase Admin:', error);
      this.app = null;
    }
  }

  async verifyIdToken(idToken: string) {
    if (!this.app) {
      throw new Error('Firebase Admin not initialized');
    }

    try {
      const decodedToken = await this.app.auth().verifyIdToken(idToken);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
      };
    } catch (error) {
      console.error('[Firebase] Token verification failed:', error);
      return null;
    }
  }

  async createTenant(options: { displayName: string; enableEmailLinkSignin: boolean }) {
    if (!this.app) {
      throw new Error('Firebase Admin not initialized');
    }

    try {
      return await this.app.auth().tenantManager().createTenant(options);
    } catch (error) {
      console.error('[Firebase] Tenant creation failed:', error);
      throw error;
    }
  }

  async setCustomClaims(uid: string, claims: Record<string, any>) {
    if (!this.app) {
      throw new Error('Firebase Admin not initialized');
    }

    try {
      await this.app.auth().setCustomUserClaims(uid, claims);
    } catch (error) {
      console.error('[Firebase] Failed to set custom claims:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.app !== null;
  }
}
