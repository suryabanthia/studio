// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"; // ESSENTIAL: For initializing Firebase
import { getAuth, type Auth } from "firebase/auth"; // IMPORTANT: If you are using Firebase Authentication
import { getFirestore, type Firestore } from 'firebase/firestore'; // For Firestore

// Your web app's Firebase configuration using the last explicitly provided values
const firebaseConfig = {
  apiKey: "AIzaSyDski1hHnVu-UMZ4Ois3xEmMGTzgun-y0o",
  authDomain: "promptverse-10ydl.firebaseapp.com",
  projectId: "promptverse-10ydl",
  storageBucket: "promptverse-10ydl.appspot.com", // Ensure this matches the typical Firebase storage bucket format
  messagingSenderId: "521983968297",
  appId: "1:521983968297:web:24682d9240cba731664838"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Defensive check for critical configuration values.
// While 'auth/operation-not-allowed' isn't directly caused by these, ensuring they are not obviously placeholder
// helps isolate the issue to the Firebase console settings.
if (
  firebaseConfig.apiKey === "YOUR_FALLBACK_API_KEY_HERE" || // Example placeholder check
  firebaseConfig.authDomain === "YOUR_FALLBACK_AUTH_DOMAIN_HERE" ||
  firebaseConfig.projectId === "YOUR_FALLBACK_PROJECT_ID_HERE" ||
  !firebaseConfig.apiKey ||
  !firebaseConfig.authDomain ||
  !firebaseConfig.projectId
) {
  const errorMessage = `FATAL: Firebase Client Configuration Error!
Firebase client configuration is incomplete or uses placeholder values.
Please ensure your Firebase project credentials in 'src/lib/firebase/firebase.ts' are correct.

Firebase client-side functionality will be disabled until these are correctly configured.
You can find these values in your Firebase project settings on the Firebase console.
`;
  console.error(errorMessage);
  // @ts-ignore
  globalThis._firebaseConfigError = errorMessage;
}


try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  if (app && !globalThis._firebaseConfigError) { // Only initialize if no config error
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    // @ts-ignore
    auth = undefined;
    // @ts-ignore
    db = undefined;
  }
} catch (error: any) {
  console.error("CRITICAL: Firebase initialization process failed:", error.message, error.stack);
  // @ts-ignore
  app = undefined;
  // @ts-ignore
  auth = undefined;
  // @ts-ignore
  db = undefined;
}

export { app, auth, db };