
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"; // ESSENTIAL: For initializing Firebase
import { getAuth, type Auth } from "firebase/auth"; // IMPORTANT: If you are using Firebase Authentication
import { getFirestore, type Firestore } from 'firebase/firestore'; // Added for Firestore

// Your web app's Firebase configuration (you have this part already)
const firebaseConfig = {
  apiKey: "AIzaSyDski1hHnVu-UMZ4Ois3xEmMGTzgun-y0o",
  authDomain: "promptverse-10ydl.firebaseapp.com",
  projectId: "promptverse-10ydl",
  storageBucket: "promptverse-10ydl.appspot.com", // Corrected from .firebasestorage.app to .appspot.com
  messagingSenderId: "521983968297",
  appId: "1:521983968297:web:24682d9240cba731664838"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore; // Declare db

// Initialize Firebase
if (!getApps().length) {
  try {
    if (
      !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY_HERE" || firebaseConfig.apiKey.includes("AIzaSyYOUR_") ||
      !firebaseConfig.authDomain || firebaseConfig.authDomain.includes("YOUR_PROJECT_ID") ||
      !firebaseConfig.projectId || firebaseConfig.projectId.includes("YOUR_PROJECT_ID")
    ) {
      const message = `FATAL: Firebase Client Configuration Error!
Firebase client configuration is incomplete or uses placeholder values.
Please set the following environment variable(s) in your .env file with your actual Firebase project credentials:
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID

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
      // In a real app, you might throw an error or set a global state to indicate this critical failure.
      // For now, we'll let it proceed but auth and db will be undefined.
      // @ts-ignore
      app = undefined;
    } else {
       app = initializeApp(firebaseConfig); // THIS LINE IS CRUCIAL
    }
  } catch (e: any) {
    console.error("Firebase Initialization Error during initializeApp:", e.message);
    // @ts-ignore
    app = undefined;
  }
} else {
  app = getApp();
}


if (app) {
  try {
    // Initialize Firebase Authentication and get a reference to the service
    auth = getAuth(app); // THIS LINE IS ALSO CRUCIAL FOR AUTHENTICATION
    db = getFirestore(app); // Initialize Firestore
  } catch (e: any) {
     console.error("Firebase Initialization Error during getAuth/getFirestore:", e.message);
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


// Export the auth instance (and app if needed elsewhere) so you can use it in other parts of your application
export { app, auth, db };
