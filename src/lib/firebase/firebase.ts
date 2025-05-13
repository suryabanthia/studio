// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"; // ESSENTIAL: For initializing Firebase
import { getAuth, type Auth } from "firebase/auth"; // IMPORTANT: If you are using Firebase Authentication
import { getFirestore, type Firestore } from 'firebase/firestore'; // For Firestore

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDski1hHnVu-UMZ4Ois3xEmMGTzgun-y0o", // process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "promptverse-10ydl.firebaseapp.com", // process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: "promptverse-10ydl", // process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: "promptverse-10ydl.appspot.com", // process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: "521983968297", // process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: "1:521983968297:web:24682d9240cba731664838" // process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};


let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

const requiredEnvVars: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId'];
const missingEnvVars = requiredEnvVars.filter(key => !firebaseConfig[key] || firebaseConfig[key]?.startsWith("YOUR_") || firebaseConfig[key]?.startsWith("AIzaSyYOUR_"));

if (missingEnvVars.length > 0) {
  const errorMessage = `FATAL: Firebase Client Configuration Error!
Firebase client configuration is incomplete or uses placeholder values.
Please set the following environment variable(s) in your .env file or ensure the hardcoded values in 'src/lib/firebase/firebase.ts' are correct:
${missingEnvVars.map(v => `NEXT_PUBLIC_FIREBASE_${v.replace(/([A-Z])/g, "_$1").toUpperCase()}`).join('\n')}

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
  console.error(errorMessage);
  // @ts-ignore
  globalThis._firebaseConfigError = errorMessage;
  // Fallback to prevent app crash, though functionality will be broken.
  // @ts-ignore
  app = undefined;
  // @ts-ignore
  auth = undefined;
  // @ts-ignore
  db = undefined;
} else {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    if (app) {
      auth = getAuth(app);
      db = getFirestore(app);
    } else {
      // This case should ideally not be reached if config is valid
      throw new Error("Firebase app could not be initialized despite valid config.");
    }
  } catch (error: any) {
    console.error("CRITICAL: Firebase initialization process failed:", error.message, error.stack);
    // @ts-ignore
    globalThis._firebaseConfigError = error.message;
    // @ts-ignore
    app = undefined;
    // @ts-ignore
    auth = undefined;
    // @ts-ignore
    db = undefined;
  }
}

export { app, auth, db };
