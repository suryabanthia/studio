"use client";

import type { User as FirebaseUser, AuthError as FirebaseAuthError } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth as firebaseAuth } from '@/lib/firebase/firebase'; 
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendEmailVerification
} from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from "@/hooks/use-toast";


type AuthContextType = {
  user: FirebaseUser | null;
  isLoading: boolean;
  error: FirebaseAuthError | Error | null; 
  signIn: (credentials: { email: string, password: string }) => Promise<{ user: FirebaseUser | null; error: FirebaseAuthError | Error | null }>;
  signUp: (credentials: { email: string, password: string }) => Promise<{ user: FirebaseUser | null; error: FirebaseAuthError | Error | null }>;
  signOut: () => Promise<{ error: FirebaseAuthError | Error | null }>;
  sendVerificationEmail: () => Promise<{ error: FirebaseAuthError | Error | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicPaths = ['/about', '/pricing']; 

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirebaseAuthError | Error | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    // @ts-ignore
    if (globalThis._firebaseConfigError || !firebaseAuth) {
        const initError = new Error(
          // @ts-ignore
          globalThis._firebaseConfigError ||
          "Firebase Auth service is not available. " +
          "This is likely due to an earlier Firebase initialization error. " +
          "Please check console logs for details from 'src/lib/firebase/firebase.ts' " +
          "and ensure your Firebase project configuration (API key, authDomain, etc.) is correct and a Firebase App is initialized."
        );
        console.error(initError.message);
        setError(initError);
        setIsLoading(false);
        setUser(null);
        if (!publicPaths.includes(pathname) && pathname !== '/login' && pathname !== '/signup') {
          router.push('/login');
        }
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
       if (authError.code === 'auth/operation-not-allowed') {
        toast({
          title: "Authentication Error",
          description: "Email/Password sign-in is not enabled for this Firebase project. Please enable it in the Firebase console.",
          variant: "destructive",
          duration: 9000,
        });
      }
    });

    return () => unsubscribe();
  }, [pathname, router, toast]);

  const handleAuthError = (authError: FirebaseAuthError | Error, operation: string): { user: null; error: FirebaseAuthError | Error } => {
      setIsLoading(false);
      setError(authError);
      console.error(`Error during ${operation}:`, authError);
      
      let description = `An unexpected error occurred during ${operation}. Please try again.`;
      if ('code' in authError) { // FirebaseAuthError
        switch (authError.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            description = "Invalid email or password. Please check your credentials.";
            break;
          case 'auth/email-already-in-use':
            description = "This email address is already in use by another account.";
            break;
          case 'auth/weak-password':
            description = "The password is too weak. Please choose a stronger password.";
            break;
          case 'auth/invalid-email':
            description = "The email address is not valid.";
            break;
          case 'auth/operation-not-allowed':
            description = "Email/Password sign-in is not enabled for this project. Please enable it in the Firebase console (Authentication > Sign-in method).";
            break;
          case 'auth/network-request-failed':
            description = "A network error occurred. Please check your internet connection and try again.";
            break;
          case 'auth/invalid-api-key':
             description = "Invalid Firebase API Key. Please check your Firebase project configuration.";
             break;
          case 'auth/configuration-not-found':
            description = "Firebase configuration not found or is invalid. This might indicate a problem with how Firebase is initialized, or that the domain is not authorized in the Firebase console.";
            break;
          default:
            description = authError.message || description;
        }
      } else { // Generic Error
        description = authError.message || description;
      }

      toast({
        title: `${operation.charAt(0).toUpperCase() + operation.slice(1)} Failed`,
        description: description,
        variant: "destructive",
        duration: 7000,
      });
      return { user: null, error: authError };
  }


  const signIn = async ({ email, password }: { email: string, password: string }) => {
    // @ts-ignore
    if (globalThis._firebaseConfigError || !firebaseAuth) {
      // @ts-ignore
      const err = new Error(globalThis._firebaseConfigError || "Firebase Auth service not available. Cannot sign in.");
      return handleAuthError(err, 'sign-in');
    }
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      setIsLoading(false);
      if (!userCredential.user.emailVerified) {
         toast({
            title: "Email Not Verified",
            description: "Please verify your email address before signing in. A new verification email has been sent.",
            variant: "default",
            duration: 7000,
        });
        await sendEmailVerification(userCredential.user);
        await firebaseSignOut(firebaseAuth); // Sign out user until email is verified
        return { user: null, error: new Error("Email not verified.") };
      }
      return { user: userCredential.user, error: null };
    } catch (err: any) {
      return handleAuthError(err, 'sign-in');
    }
  };

  const signUp = async ({ email, password }: { email: string, password: string }) => {
    // @ts-ignore
    if (globalThis._firebaseConfigError || !firebaseAuth) {
      // @ts-ignore
      const err = new Error(globalThis._firebaseConfigError || "Firebase Auth service not available. Cannot sign up.");
      return handleAuthError(err, 'sign-up');
    }
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await sendEmailVerification(userCredential.user);
      setIsLoading(false);
      toast({
        title: "Signup Successful!",
        description: "A verification email has been sent. Please check your inbox to verify your account.",
        duration: 10000,
      });
      // Don't automatically sign in the user or set them in context until email is verified.
      // Firebase might locally sign them in, so explicitly sign out.
      await firebaseSignOut(firebaseAuth); 
      return { user: null, error: null }; // Return null user as they need to verify first
    } catch (err: any) {
      return handleAuthError(err, 'sign-up');
    }
  };

  const signOut = async () => {
    // @ts-ignore
    if (globalThis._firebaseConfigError || !firebaseAuth) {
       // @ts-ignore
      const err = new Error(globalThis._firebaseConfigError || "Firebase Auth service not available. Cannot sign out.");
      setError(err);
      setUser(null); // Clear user state
      return { error: err };
    }
    setIsLoading(true);
    setError(null);
    try {
      await firebaseSignOut(firebaseAuth);
      setIsLoading(false);
      setUser(null);
      router.push('/login'); // Redirect to login after sign out
      return { error: null };
    } catch (err: any) {
      setIsLoading(false);
      setError(err as FirebaseAuthError);
      return { error: err as FirebaseAuthError };
    }
  };

  const sendVerificationEmail = async () => {
    if (!user) {
      return { error: new Error("No user is currently signed in.") };
    }
    // @ts-ignore
    if (globalThis._firebaseConfigError || !firebaseAuth) {
       // @ts-ignore
      const err = new Error(globalThis._firebaseConfigError || "Firebase Auth service not available. Cannot send verification email.");
      return handleAuthError(err, 'send-verification');
    }
    try {
      await sendEmailVerification(user);
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox for the verification link.",
      });
      return { error: null };
    } catch (err: any) {
      return handleAuthError(err, 'send-verification');
    }
  };

  const value = {
    user,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
    sendVerificationEmail,
  };
  
  // Display loading spinner if auth state is loading and it's not a public page or auth page
  // And if firebaseAuth is defined (meaning firebase.ts didn't throw an initial config error)
  if (isLoading && !isPublicPage() && pathname !== '/login' && pathname !== '/signup' && firebaseAuth) {
     return <div className="flex h-screen w-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }
  
  function isPublicPage(): boolean {
    return publicPaths.includes(pathname);
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