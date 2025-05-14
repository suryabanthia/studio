// src/lib/firebase/firebaseAdmin.ts
import * as admin from 'firebase-admin';

interface FirebaseAdminConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

// Ensure environment variables are defined
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  const missingVars = [];
  if (!projectId) missingVars.push('FIREBASE_PROJECT_ID');
  if (!clientEmail) missingVars.push('FIREBASE_CLIENT_EMAIL');
  if (!privateKey) missingVars.push('FIREBASE_PRIVATE_KEY');
  
  console.error(`FATAL: Firebase Admin SDK Configuration Error!
Missing environment variable(s): ${missingVars.join(', ')}.
These are required for server-side Firebase operations.
Please set them in your .env.local or environment configuration.
Firebase Admin SDK will not be initialized.`);
  
  // Fallback to prevent app crash during build/dev if not fully configured yet,
  // but operations will fail.
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const mockFirestore = { collection: () => ({ doc: () => ({ get: async () => {}, set: async () => {}, update: async () => {}, delete: async () => {} }), get: async () => ({ docs: [] }) }) } as admin.firestore.Firestore;
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const mockAuth = { verifyIdToken: async () => {} } as admin.auth.Auth;
  
  module.exports = {
    adminDb: mockFirestore,
    adminAuth: mockAuth,
  };

} else {
  const firebaseAdminConfig: FirebaseAdminConfig = {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'), // Replace escaped newlines
  };

  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseAdminConfig),
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } catch (error: any) {
      console.error('Firebase Admin SDK initialization error:', error.stack);
      // Rethrow or handle more gracefully depending on desired behavior on init failure
      throw new Error(`Firebase Admin SDK initialization failed: ${error.message}. Ensure your FIREBASE_PRIVATE_KEY is correctly formatted in your .env file (e.g., replace literal newlines with \\\\n).`);
    }
  } else {
    // console.log('Firebase Admin SDK already initialized.');
  }
  
  const adminDb = admin.firestore();
  const adminAuth = admin.auth();
  
  module.exports = {
    adminDb,
    adminAuth,
  };
}
