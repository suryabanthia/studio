
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Check for placeholder values or missing essential keys
const requiredClientKeys = {
  NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfigValues.apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfigValues.authDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfigValues.projectId,
  // Add other keys if they become strictly required for basic app functionality
  // storageBucket, messagingSenderId, appId are often important too
};

const missingOrPlaceholderClientKeys = Object.entries(requiredClientKeys)
  .filter(([key, value]) => !value || value.startsWith("YOUR_") || value.startsWith("YOUR-") || value.includes("PLACEHOLDER") || value.length < 5) // Basic length check
  .map(([key]) => key);

if (missingOrPlaceholderClientKeys.length > 0) {
  const message = `FATAL: Firebase Client Configuration Error!
Firebase client configuration is incomplete or uses placeholder values.
Please set the following environment variable(s) in your .env file with your actual Firebase project credentials:
${missingOrPlaceholderClientKeys.join('\n')}

Firebase client-side functionality will be disabled until these are correctly configured.
You can find these values in your Firebase project settings on the Firebase console.

Example .env content:
NEXT_PUBLIC_FIREBASE_API_KEY="your-actual-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com" # Optional but recommended
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id" # Optional
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id" # Optional
`;
  console.error(message);
  throw new Error(message);
}


let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfigValues);
  } catch (e: any) {
    console.error("Firebase Initialization Error: Failed to initialize Firebase app. This usually means your Firebase config values are incorrect even if they are not placeholders. Double-check them in the Firebase console.", e.message);
    // @ts-ignore
    app = undefined; 
  }
} else {
  app = getApp();
}

if (app) {
  try {
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e: any) {
    console.error("Firebase Initialization Error: Failed to initialize Firebase Auth/Firestore. This might be a follow-on error from app initialization.", e.message);
    // @ts-ignore
    auth = undefined; 
    // @ts-ignore
    db = undefined;
  }
} else {
    console.warn("Firebase app object is not available (likely due to prior config errors). Auth and Firestore will not be initialized.");
    // @ts-ignore
    auth = undefined; 
    // @ts-ignore
    db = undefined;
}

export { app, auth, db };
