
"use client";

import type { User as FirebaseUser, AuthError as FirebaseAuthError } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth as firebaseAuth } from '@/lib/firebase/firebase'; 
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

type AuthContextType = {
  user: FirebaseUser | null;
  isLoading: boolean;
  error: FirebaseAuthError | Error | null; 
  signIn: (credentials: { email: string, password: string }) => Promise<{ user: FirebaseUser | null; error: FirebaseAuthError | Error | null }>;
  signUp: (credentials: { email: string, password: string }) => Promise<{ user: FirebaseUser | null; error: FirebaseAuthError | Error | null }>;
  signOut: () => Promise<{ error: FirebaseAuthError | Error | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicPaths = ['/about', '/pricing']; 

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirebaseAuthError | Error | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if firebaseAuth itself is available (might be undefined if firebase.ts threw an error during init)
    if (!firebaseAuth) {
        const initError = new Error(
          "Firebase Auth service is not available. " +
          "This is likely due to an earlier Firebase initialization error. " +
          "Please check console logs for details from 'src/lib/firebase/firebase.ts' " +
          "and ensure your Firebase project configuration (API key, authDomain, etc.) is correct and a Firebase App is initialized."
        );
        console.error(initError.message);
        setError(initError);
        setIsLoading(false);
        setUser(null);
        return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
      if (currentUser && (pathname === '/login' || pathname === '/signup')) {
        router.push('/');
      } else if (!currentUser && !publicPaths.includes(pathname) && pathname !== '/login' && pathname !== '/signup') {
        router.push('/login');
      }
    }, (authError) => {
      console.error("Auth state change error:", authError);
      setError(authError);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  useEffect(() => {
    if (!firebaseAuth && !isLoading) { // Check if firebaseAuth is defined
        if (!publicPaths.includes(pathname) && pathname !== '/login' && pathname !== '/signup') {
            // Error already set in the first useEffect if firebaseAuth is not available
        }
        return;
    }
    if (!isLoading && !user && !publicPaths.includes(pathname) && pathname !== '/signup' && pathname !== '/login') {
      router.push('/login');
    } else if (!isLoading && user && (pathname === '/login' || pathname === '/signup')) {
      router.push('/');
    }
  }, [user, isLoading, router, pathname]);


  const signIn = async ({ email, password }: { email: string, password: string }) => {
    if (!firebaseAuth) { // Check if firebaseAuth is defined
      const err = new Error("Firebase Auth service not available. Cannot sign in.");
      setError(err);
      return { user: null, error: err };
    }
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      setIsLoading(false);
      return { user: userCredential.user, error: null };
    } catch (signInError: any) {
      setIsLoading(false);
      setError(signInError as FirebaseAuthError);
      return { user: null, error: signInError as FirebaseAuthError };
    }
  };

  const signUp = async ({ email, password }: { email: string, password: string }) => {
     if (!firebaseAuth) { // Check if firebaseAuth is defined
      const err = new Error("Firebase Auth service not available. Cannot sign up.");
      setError(err);
      return { user: null, error: err };
    }
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      setIsLoading(false);
      return { user: userCredential.user, error: null };
    } catch (signUpError: any) {
      setIsLoading(false);
      setError(signUpError as FirebaseAuthError); // Set the error state
      return { user: null, error: signUpError as FirebaseAuthError };
    }
  };

  const signOut = async () => {
    if (!firebaseAuth) { // Check if firebaseAuth is defined
      const err = new Error("Firebase Auth service not available. Cannot sign out.");
      setError(err);
      setUser(null);
      return { error: err };
    }
    setIsLoading(true);
    setError(null);
    try {
      await firebaseSignOut(firebaseAuth);
      setIsLoading(false);
      setUser(null);
      router.push('/login');
      return { error: null };
    } catch (signOutError: any) {
      setIsLoading(false);
      setError(signOutError as FirebaseAuthError);
      return { error: signOutError as FirebaseAuthError };
    }
  };

  const value = {
    user,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
  };
  
  const isPublicPage = publicPaths.includes(pathname);

  // Display loading spinner if auth state is loading and it's not a public page or auth page
  // And if firebaseAuth is defined (meaning firebase.ts didn't throw an initial config error)
  if (isLoading && !user && !isPublicPage && pathname !== '/login' && pathname !== '/signup' && firebaseAuth) {
     return <div className="flex h-screen w-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }
  
  // If there's a general error (like Firebase not configured from firebase.ts via firebaseAuth being undefined, or auth/configuration-not-found)
  // and it's not an auth page (to prevent error loops on login/signup if they are the source of issues)
  // For now, this specific error display on all pages might be too aggressive.
  // The login/signup pages will display their specific errors.
  // This top-level error display might be better suited for a general "Something went wrong" banner.

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

