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
  error: FirebaseAuthError | Error | null; // Allow generic Error for API call issues
  signIn: (credentials: { email: string, password: string }) => Promise<{ user: FirebaseUser | null; error: FirebaseAuthError | Error | null }>;
  signUp: (credentials: { email: string, password: string }) => Promise<{ user: FirebaseUser | null; error: FirebaseAuthError | Error | null }>;
  signOut: () => Promise<{ error: FirebaseAuthError | Error | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicPaths = ['/about', '/pricing']; // Add any other public paths

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirebaseAuthError | Error | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!firebaseAuth.app) { // Check if Firebase app is initialized
        console.warn("Firebase app is not initialized. Auth functionality will be disabled.");
        setIsLoading(false);
        setUser(null);
        setError(new Error("Firebase not configured."));
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
     if (!firebaseAuth.app && !isLoading) {
        if (!publicPaths.includes(pathname) && pathname !== '/login' && pathname !== '/signup') {
            console.warn("Attempting to access a private page while Firebase is not configured.");
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
    if (!firebaseAuth.app) {
      const err = new Error("Firebase not configured.");
      setError(err);
      return { user: null, error: err };
    }
    setIsLoading(true);
    setError(null);
    try {
      // Call client-side sign in first to get user object and ID token
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      
      // Optionally: Call backend /api/auth/login to establish a session cookie if needed
      // For this example, we'll rely on Firebase's client-side session management.
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ idToken: await userCredential.user.getIdToken() }),
      // });
      // if (!response.ok) throw new Error(await response.text());

      setIsLoading(false);
      return { user: userCredential.user, error: null };
    } catch (signInError: any) {
      setIsLoading(false);
      setError(signInError as FirebaseAuthError);
      return { user: null, error: signInError as FirebaseAuthError };
    }
  };

  const signUp = async ({ email, password }: { email: string, password: string }) => {
     if (!firebaseAuth.app) {
      const err = new Error("Firebase not configured.");
      setError(err);
      return { user: null, error: err };
    }
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      // Optionally: Call backend /api/auth/signup to create user record in your DB if needed
      // const response = await fetch('/api/auth/signup', { /* ... */ });
      // if (!response.ok) throw new Error(await response.text());
      setIsLoading(false);
      return { user: userCredential.user, error: null };
    } catch (signUpError: any) {
      setIsLoading(false);
      setError(signUpError as FirebaseAuthError);
      return { user: null, error: signUpError as FirebaseAuthError };
    }
  };

  const signOut = async () => {
    if (!firebaseAuth.app) {
      const err = new Error("Firebase not configured.");
      setError(err);
      setUser(null);
      return { error: err };
    }
    setIsLoading(true);
    setError(null);
    try {
      await firebaseSignOut(firebaseAuth);
      // Optionally: Call backend /api/auth/logout to clear session cookie
      // await fetch('/api/auth/logout', { method: 'POST' });
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

  if (isLoading && !user && !isPublicPage && pathname !== '/login' && pathname !== '/signup' && firebaseAuth.app) {
     return <div className="flex h-screen w-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
