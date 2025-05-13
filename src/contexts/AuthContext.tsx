"use client";

import type { Session, User, AuthError, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient'; // supabase can now be null
import { useRouter, usePathname } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner'; // Assuming you have a spinner

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: AuthError | null;
  signIn: (credentials: SignInWithPasswordCredentials) => Promise<{ user: User | null; session: Session | null; error: AuthError | null }>;
  signUp: (credentials: SignUpWithPasswordCredentials) => Promise<{ user: User | null; session: Session | null; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define public paths
const publicPaths = ['/about', '/pricing']; // Add any other public paths

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!supabase) {
      console.warn("Supabase client is not initialized. Auth functionality will be disabled.");
      setIsLoading(false);
      setUser(null);
      setSession(null);
      setError({ name: "ConfigurationError", message: "Supabase not configured." } as AuthError);
      return;
    }

    const fetchSession = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Error fetching session:", sessionError.message);
          setError(sessionError);
        }
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (e: any) {
        console.error("Exception fetching session:", e.message);
        setError({ name: "FetchSessionError", message: e.message } as AuthError);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
       if (event === 'SIGNED_IN' && (pathname === '/login' || pathname === '/signup')) {
        router.push('/');
      } else if (event === 'SIGNED_OUT' && !publicPaths.includes(pathname) && pathname !== '/login' && pathname !== '/signup') {
        router.push('/login');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [pathname, router]); // Only trigger on pathname/router changes after initial load

 useEffect(() => {
    if (!isLoading && !supabase) { // If loading is done and supabase is still not configured
        if (!publicPaths.includes(pathname) && pathname !== '/login' && pathname !== '/signup') {
            // Potentially show a "service unavailable" or redirect to a safe page
            // For now, if it reaches login/signup, it's fine. Otherwise, it's an issue.
            console.warn("Attempting to access a private page while Supabase is not configured.");
        }
        return;
    }

    if (!isLoading && !user && !publicPaths.includes(pathname) && pathname !== '/signup' && pathname !== '/login') {
      router.push('/login');
    } else if (!isLoading && user && (pathname === '/login' || pathname === '/signup')) {
      router.push('/');
    }
  }, [user, isLoading, router, pathname]);


  const signIn = async (credentials: SignInWithPasswordCredentials) => {
    if (!supabase) {
      const err = { name: "ConfigurationError", message: "Supabase not configured." } as AuthError;
      setError(err);
      return { user: null, session: null, error: err };
    }
    setIsLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword(credentials);
    setIsLoading(false);
    if (signInError) setError(signInError);
    else setError(null);
    return { user: data.user, session: data.session, error: signInError };
  };

  const signUp = async (credentials: SignUpWithPasswordCredentials) => {
    if (!supabase) {
      const err = { name: "ConfigurationError", message: "Supabase not configured." } as AuthError;
      setError(err);
      return { user: null, session: null, error: err };
    }
    setIsLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp(credentials);
    setIsLoading(false);
    if (signUpError) setError(signUpError);
    else setError(null);
    return { user: data.user, session: data.session, error: signUpError };
  };

  const signOut = async () => {
    if (!supabase) {
      const err = { name: "ConfigurationError", message: "Supabase not configured." } as AuthError;
      setError(err);
      setUser(null); // Clear user state even if supabase is not configured
      setSession(null);
      return { error: err };
    }
    setIsLoading(true);
    const { error: signOutError } = await supabase.auth.signOut();
    setIsLoading(false);
    if (signOutError) setError(signOutError);
    else {
      setUser(null);
      setSession(null);
      setError(null);
    }
    router.push('/login'); // Redirect to login after sign out
    return { error: signOutError };
  };

  const value = {
    user,
    session,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
  };
  
  const isPublicPage = publicPaths.includes(pathname);

  // Show loading spinner only on initial load for private pages.
  // For public pages, or if supabase is not configured, render children immediately or after initial checks.
  if (isLoading && !user && !isPublicPage && pathname !== '/login' && pathname !== '/signup' && supabase) {
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
