// src/lib/firebase/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// console.log("Attempting to initialize Firebase client..."); // For debugging

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// console.log("Firebase Config being used:", firebaseConfig); // For debugging

// More specific placeholder checks
const PLACEHOLDER_VALUES = [
  "YOUR_FIREBASE_API_KEY_HERE",
  "YOUR_FIREBASE_AUTH_DOMAIN_HERE",
  "YOUR_FIREBASE_PROJECT_ID_HERE",
  // Add other specific placeholder strings if used
];

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

const essentialKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId'];
const missingOrPlaceholderKeys = essentialKeys.filter(key => {
  const value = firebaseConfig[key];
  return !value || PLACEHOLDER_VALUES.includes(value) || value.startsWith("YOUR_") || value.startsWith("MISSING_");
});

if (missingOrPlaceholderKeys.length > 0) {
  const errorMessage = `FATAL: Firebase Client Configuration Error!
Firebase client configuration is incomplete or uses placeholder values.
Please set the following environment variable(s) in your .env file with your actual Firebase project credentials:
${missingOrPlaceholderKeys.map(key => `NEXT_PUBLIC_${key.replace(/([A-Z])/g, '_$1').toUpperCase().slice(1)}`).join('\n')}

Firebase client-side functionality will be disabled until these are correctly configured.
You can find these values in your Firebase project settings on the Firebase console.

Example .env content:
NEXT_PUBLIC_FIREBASE_API_KEY="your-actual-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com" # Optional
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id" # Optional
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id" # Optional
`;
  console.error(errorMessage);
  // Not throwing an error here to allow the module to load,
  // but Firebase services will not be functional.
  // Consumer modules should check if auth/db are defined.
} else {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      // console.log("Firebase app initialized successfully.");
    } else {
      app = getApp();
      // console.log("Existing Firebase app retrieved.");
    }
    auth = getAuth(app);
    db = getFirestore(app);
    // console.log("Firebase auth and db services initialized.");
  } catch (e) {
    console.error("Error during Firebase initialization:", e);
    // Ensure app, auth, db are undefined if initialization fails
    app = undefined;
    auth = undefined;
    db = undefined;
  }
}

export { app, auth, db };
