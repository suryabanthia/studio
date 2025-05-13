// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"; // ESSENTIAL: For initializing Firebase
import { getAuth, type Auth } from "firebase/auth"; // IMPORTANT: If you are using Firebase Authentication
import { getFirestore, type Firestore } from 'firebase/firestore'; // For Firestore

// Your web app's Firebase configuration
// Using the exact configuration provided by the user in the last snippet.
const firebaseConfig = {
  apiKey: "AIzaSyDski1hHnVu-UMZ4Ois3xEmMGTzgun-y0o",
  authDomain: "promptverse-10ydl.firebaseapp.com",
  projectId: "promptverse-10ydl",
  storageBucket: "promptverse-10ydl.firebasestorage.app", // As per user's last snippet
  messagingSenderId: "521983968297",
  appId: "1:521983968297:web:24682d9240cba731664838"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  if (!getApps().length) {
    // console.log("Firebase App not initialized. Initializing now...");
    app = initializeApp(firebaseConfig);
  } else {
    // console.log("Firebase App already initialized. Getting existing app...");
    app = getApp();
  }

  // Initialize Auth and Firestore only if app was successfully initialized/retrieved
  if (app) {
    // console.log("Firebase App instance available. Initializing Auth and Firestore...");
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    // This case should ideally not be reached if initializeApp or getApp is working.
    console.error("CRITICAL: Firebase app instance is not available after initialization/getApp attempt. Auth and Firestore will be unavailable.");
    // @ts-ignore
    auth = undefined;
    // @ts-ignore
    db = undefined;
  }
} catch (error: any) {
  console.error("CRITICAL: Firebase initialization process failed:", error.message, error.stack);
  // Ensure app, auth, and db are undefined if any part of the initialization fails.
  // @ts-ignore
  app = undefined;
  // @ts-ignore
  auth = undefined;
  // @ts-ignore
  db = undefined;
}

// Export the instances. They might be undefined if initialization failed.
export { app, auth, db };
