import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

export class FirebaseService {
  private static app: admin.app.App;

  /**
   * Initialize Firebase Admin SDK
   */
  static async initialize(): Promise<void> {
    try {
      // Check if Firebase is already initialized
      if (this.app) {
        logger.info('Firebase already initialized');
        return;
      }

      // Validate required environment variables
      const requiredVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY',
      ];

      for (const varName of requiredVars) {
        if (!process.env[varName]) {
          throw new Error(`Missing required environment variable: ${varName}`);
        }
      }

      // Initialize Firebase Admin with service account
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });

      logger.info('Firebase Admin SDK initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
      throw error;
    }
  }

  /**
   * Verify Firebase ID token
   */
  static async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      logger.error('Failed to verify ID token:', error);
      throw new Error('Invalid authentication token');
    }
  }

  /**
   * Get user by UID
   */
  static async getUser(uid: string): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().getUser(uid);
      return userRecord;
    } catch (error) {
      logger.error('Failed to get user:', error);
      throw new Error('User not found');
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      return userRecord;
    } catch (error) {
      logger.error('Failed to get user by email:', error);
      throw new Error('User not found');
    }
  }

  /**
   * Create custom token for user
   */
  static async createCustomToken(
    uid: string,
    claims?: object
  ): Promise<string> {
    try {
      const customToken = await admin.auth().createCustomToken(uid, claims);
      return customToken;
    } catch (error) {
      logger.error('Failed to create custom token:', error);
      throw new Error('Failed to create authentication token');
    }
  }

  /**
   * Set custom user claims (for roles/permissions)
   */
  static async setCustomUserClaims(
    uid: string,
    claims: object
  ): Promise<void> {
    try {
      await admin.auth().setCustomUserClaims(uid, claims);
      logger.info(`Custom claims set for user ${uid}`);
    } catch (error) {
      logger.error('Failed to set custom claims:', error);
      throw new Error('Failed to update user permissions');
    }
  }

  /**
   * Revoke refresh tokens for a user
   */
  static async revokeRefreshTokens(uid: string): Promise<void> {
    try {
      await admin.auth().revokeRefreshTokens(uid);
      logger.info(`Refresh tokens revoked for user ${uid}`);
    } catch (error) {
      logger.error('Failed to revoke refresh tokens:', error);
      throw error;
    }
  }

  /**
   * List users with pagination
   */
  static async listUsers(
    maxResults?: number,
    pageToken?: string
  ): Promise<admin.auth.ListUsersResult> {
    try {
      const listUsersResult = await admin
        .auth()
        .listUsers(maxResults, pageToken);
      return listUsersResult;
    } catch (error) {
      logger.error('Failed to list users:', error);
      throw error;
    }
  }

  /**
   * Delete a user
   */
  static async deleteUser(uid: string): Promise<void> {
    try {
      await admin.auth().deleteUser(uid);
      logger.info(`User ${uid} deleted successfully`);
    } catch (error) {
      logger.error('Failed to delete user:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Verify and decode session cookie
   */
  static async verifySessionCookie(
    sessionCookie: string,
    checkRevoked = true
  ): Promise<admin.auth.DecodedIdToken> {
    try {
      const decodedClaims = await admin
        .auth()
        .verifySessionCookie(sessionCookie, checkRevoked);
      return decodedClaims;
    } catch (error) {
      logger.error('Failed to verify session cookie:', error);
      throw new Error('Invalid session');
    }
  }

  /**
   * Create session cookie
   */
  static async createSessionCookie(
    idToken: string,
    expiresIn: number = 60 * 60 * 24 * 5 * 1000 // 5 days default
  ): Promise<string> {
    try {
      const sessionCookie = await admin
        .auth()
        .createSessionCookie(idToken, { expiresIn });
      return sessionCookie;
    } catch (error) {
      logger.error('Failed to create session cookie:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Get Firebase app instance
   */
  static getApp(): admin.app.App {
    if (!this.app) {
      throw new Error('Firebase not initialized');
    }
    return this.app;
  }
}