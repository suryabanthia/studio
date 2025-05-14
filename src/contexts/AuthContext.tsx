// src/contexts/AuthContext.tsx
"use client";

import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// Simplified AppUser interface without Firebase types
export interface AppUser { 
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  createdAt?: Date | string; 
}

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ user: AppUser | null; error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ user: AppUser | null; error: Error | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(false); // Set to false as no async auth check initially
  const { toast } = useToast();
  const router = useRouter();

  // Placeholder signUp function
  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    toast({ title: "Sign Up Unavailable", description: "Authentication is not configured.", variant: "destructive" });
    console.warn("Attempted to sign up, but Firebase/Auth is not configured.");
    return { user: null, error: new Error("Authentication not configured.") };
  };

  // Placeholder signIn function
  const signIn = async (email: string, password: string) => {
    toast({ title: "Sign In Unavailable", description: "Authentication is not configured.", variant: "destructive" });
    console.warn("Attempted to sign in, but Firebase/Auth is not configured.");
    // Example of mocking a user after "login" for UI testing
    // const mockUser: AppUser = { uid: 'mock-user-123', email, displayName: 'Mock User', photoURL: null, emailVerified: true, firstName: 'Mock', lastName: 'User' };
    // setUser(mockUser);
    // router.push('/');
    // return { user: mockUser, error: null };
    return { user: null, error: new Error("Authentication not configured.") };
  };

  // Placeholder signOut function
  const signOut = async () => {
    toast({ title: "Sign Out Unavailable", description: "Authentication is not configured." });
    console.warn("Attempted to sign out, but Firebase/Auth is not configured.");
    setUser(null);
    router.push('/login'); 
  };

  // Placeholder sendPasswordReset function
  const sendPasswordReset = async (email: string) => {
    toast({ title: "Password Reset Unavailable", description: "Authentication is not configured.", variant: "destructive" });
    console.warn("Attempted to send password reset, but Firebase/Auth is not configured.");
    return { error: new Error("Authentication not configured.") };
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
