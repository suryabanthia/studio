// src/contexts/AuthContext.tsx
"use client";

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    sendPasswordResetEmail, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut,
    updateProfile
} from 'firebase/auth';
import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth as firebaseAuth, db as firebaseDb } from '@/lib/firebase/firebase'; // Consolidated import
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';


// Extended User type to include displayName and photoURL from FirebaseUser
export interface AppUser extends Omit<FirebaseUser, 'providerData' | 'toJSON'> { 
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  createdAt?: Timestamp | string; // Firestore Timestamp or ISO string
}


interface Session { // Session is typically managed by Firebase itself, this might be simplified
  user: AppUser | null;
  // token?: string | null; // Handled by Firebase SDK internally
  // expiresAt?: number | null; // Handled by Firebase SDK internally
}

type AuthContextType = {
  user: AppUser | null;
  // session: Session | null; // Simplified, as Firebase handles session internally
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ user: AppUser | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ user: AppUser | null; error: AuthError | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!firebaseAuth) {
      console.error("Firebase Auth service is not available. Check Firebase configuration in .env and firebase.ts.");
      setLoading(false);
      // Optionally, you could set an error state here to inform the user
      // or redirect to an error page / show a global notification.
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        if (!firebaseDb) {
          console.error("Firestore service is not available. Check Firebase configuration.");
          setUser(mapFirebaseUserToAppUser(fbUser)); // Set basic user data if DB is down
          setLoading(false);
          return;
        }
        try {
          const userDocRef = doc(firebaseDb, "users", fbUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          const appUser: AppUser = {
            ...mapFirebaseUserToAppUser(fbUser),
            ...(userDoc.exists() ? (userDoc.data() as Omit<AppUser, keyof FirebaseUser>) : {}),
          };
          setUser(appUser);
        } catch (dbError) {
          console.error("Error fetching user data from Firestore:", dbError);
          toast({ title: "Database Error", description: "Could not load user profile.", variant: "destructive" });
          setUser(mapFirebaseUserToAppUser(fbUser)); // Fallback to auth data only
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const mapFirebaseUserToAppUser = (fbUser: FirebaseUser): AppUser => ({
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
    emailVerified: fbUser.emailVerified,
    // other fields from FirebaseUser if needed
  });

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    if (!firebaseAuth || !firebaseDb) {
      toast({ title: "Service Unavailable", description: "Firebase is not configured correctly.", variant: "destructive" });
      return { user: null, error: { code: "auth/internal-error", message: "Firebase not configured." } as AuthError };
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const fbUser = userCredential.user;
      
      await updateProfile(fbUser, { displayName: `${firstName} ${lastName}` });

      const userDocRef = doc(firebaseDb, "users", fbUser.uid);
      const userData = {
        uid: fbUser.uid,
        email: fbUser.email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        createdAt: serverTimestamp(),
      };
      await setDoc(userDocRef, userData);
      
      const appUser = { ...mapFirebaseUserToAppUser(fbUser), ...userData };
      setUser(appUser); 
      toast({ title: "Sign Up Successful", description: "Welcome to PromptVerse!" });
      return { user: appUser, error: null };

    } catch (error) {
      const authError = error as AuthError;
      console.error("Sign up error:", authError.code, authError.message);
      toast({ title: "Sign Up Failed", description: authError.message, variant: "destructive" });
      return { user: null, error: authError };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!firebaseAuth || !firebaseDb) {
      toast({ title: "Service Unavailable", description: "Firebase is not configured correctly.", variant: "destructive" });
      return { user: null, error: { code: "auth/internal-error", message: "Firebase not configured." } as AuthError };
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const fbUser = userCredential.user;
      
      const userDocRef = doc(firebaseDb, "users", fbUser.uid);
      const userDoc = await getDoc(userDocRef);

      const appUser: AppUser = {
        ...mapFirebaseUserToAppUser(fbUser),
        ...(userDoc.exists() ? (userDoc.data() as Omit<AppUser, keyof FirebaseUser>) : {})
      };
      setUser(appUser);
      toast({ title: "Sign In Successful", description: "Welcome back!" });
      return { user: appUser, error: null };
    } catch (error) {
      const authError = error as AuthError;
      console.error("Sign in error:", authError.code, authError.message);
      toast({ title: "Sign In Failed", description: authError.message, variant: "destructive" });
      return { user: null, error: authError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!firebaseAuth) {
      toast({ title: "Service Unavailable", description: "Firebase Auth is not configured.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await firebaseSignOut(firebaseAuth); 
      setUser(null);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
    } catch (error) {
      const authError = error as AuthError;
      console.error("Sign out error:", authError.code, authError.message);
      toast({ title: "Sign Out Failed", description: authError.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
     if (!firebaseAuth) {
      toast({ title: "Service Unavailable", description: "Firebase Auth is not configured.", variant: "destructive" });
      return { error: { code: "auth/internal-error", message: "Firebase Auth not configured." } as AuthError };
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
      toast({ title: "Password Reset Email Sent", description: "Check your inbox for instructions." });
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      console.error("Password reset error:", authError.code, authError.message);
      toast({ title: "Password Reset Failed", description: authError.message, variant: "destructive" });
      return { error: authError };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, sendPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
