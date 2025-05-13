import { adminAuth } from './firebaseAdmin';
import type { NextRequest } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';

export async function verifyIdToken(req: NextRequest): Promise<DecodedIdToken | null> {
  const authorization = req.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    const idToken = authorization.split('Bearer ')[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return null;
    }
  }
  return null;
}
