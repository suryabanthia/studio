import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Check if essential Firebase config values are missing or are placeholders
if (
  !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_FIREBASE_API_KEY" ||
  !firebaseConfig.authDomain || firebaseConfig.authDomain === "YOUR_FIREBASE_AUTH_DOMAIN" ||
  !firebaseConfig.projectId || firebaseConfig.projectId === "YOUR_FIREBASE_PROJECT_ID"
) {
  console.warn(
    "Firebase client configuration is incomplete or uses placeholder values. " +
    "Please set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env file. " +
    "Firebase client-side functionality will be limited or disabled."
  );
  // Even with placeholders, try to initialize. Firebase SDK will handle actual invalid keys.
}


if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Failed to initialize Firebase app:", e);
    // @ts-ignore
    app = undefined; // Ensure app is undefined if initialization fails
  }
} else {
  app = getApp();
}

// Initialize Auth and Firestore only if app was successfully initialized
if (app) {
  try {
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Failed to initialize Firebase Auth/Firestore:", e);
    // @ts-ignore
    auth = undefined; 
    // @ts-ignore
    db = undefined;
  }
} else {
    console.warn("Firebase app object is not available. Auth and Firestore will not be initialized.");
    // @ts-ignore
    auth = undefined; 
    // @ts-ignore
    db = undefined;
}


export { app, auth, db };
