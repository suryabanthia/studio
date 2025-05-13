
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration - Directly using the config provided by the user.
const firebaseConfig = {
  apiKey: "AIzaSyDski1hHnVu-UMZ4Ois3xEmMGTzgun-y0o",
  authDomain: "promptverse-10ydl.firebaseapp.com",
  projectId: "promptverse-10ydl",
  storageBucket: "promptverse-10ydl.firebasestorage.app", // Corrected from .firebasestorage.app
  messagingSenderId: "521983968297",
  appId: "1:521983968297:web:24682d9240cba731664838",
  // measurementId is optional, can be added if needed
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
  try {
    // Basic check for placeholder values in the hardcoded config, though ideally it's correct.
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("AIzaSyYOUR_") || firebaseConfig.apiKey.includes("PLACEHOLDER")) {
        const message = `FATAL: Firebase Client Configuration Error!
The hardcoded firebaseConfig in src/lib/firebase/firebase.ts appears to use placeholder or invalid values.
Please ensure the firebaseConfig object contains your actual Firebase project credentials.

Firebase client-side functionality will be disabled until these are correctly configured.
You can find these values in your Firebase project settings on the Firebase console.
`;
        console.error(message);
        throw new Error(message);
    }
    app = initializeApp(firebaseConfig);
  } catch (e: any) {
    console.error("Firebase Initialization Error: Failed to initialize Firebase app. This usually means your Firebase config values (hardcoded in firebase.ts) are incorrect. Double-check them in the Firebase console.", e.message);
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
