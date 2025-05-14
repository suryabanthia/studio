// src/lib/firebase/firebaseAdmin.ts
import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';

let adminDb: Firestore | undefined;
let adminAuth: admin.auth.Auth | undefined;

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Replace escaped newlines
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  let missingVars = [];
  if (!serviceAccount.projectId) missingVars.push('FIREBASE_PROJECT_ID');
  if (!serviceAccount.clientEmail) missingVars.push('FIREBASE_CLIENT_EMAIL');
  if (!serviceAccount.privateKey) missingVars.push('FIREBASE_PRIVATE_KEY');
  console.error(
    `FATAL: Firebase Admin SDK configuration error! Missing environment variable(s): ${missingVars.join(', ')}. ` +
    `Please set these in your .env file. Firebase Admin SDK cannot be initialized.`
  );
} else {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } else {
      // console.log('Firebase Admin SDK already initialized.');
    }
    adminDb = admin.firestore();
    adminAuth = admin.auth();
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // console.error('Full error details:', error); // For more detailed debugging if needed
  }
}

export { adminDb, adminAuth };
