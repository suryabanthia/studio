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
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockUser: AppUser = { 
        uid: `mock-user-${Date.now()}`, 
        email, 
        displayName: `${firstName} ${lastName}`, 
        photoURL: null, 
        emailVerified: false, // Typically false until confirmed
        firstName, 
        lastName,
        createdAt: new Date()
    };
    setUser(mockUser);
    setLoading(false);
    toast({ title: "Sign Up Successful (Mock)", description: "Welcome! Please proceed to login." });
    router.push('/login'); // Redirect to login after mock signup
    return { user: mockUser, error: null };
  };

  // Placeholder signIn function
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    // This is a mock user. In a real app, you'd get this from your auth provider.
    const mockUser: AppUser = { 
        uid: 'mock-user-123', 
        email, 
        displayName: 'Mock User', 
        photoURL: `https://picsum.photos/seed/mock-user-123/40/40`, 
        emailVerified: true, 
        firstName: 'Mock', 
        lastName: 'User',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) // 7 days ago
    };
    setUser(mockUser);
    setLoading(false);
    toast({ title: "Sign In Successful (Mock)", description: "Welcome back!" });
    router.push('/');
    return { user: mockUser, error: null };
  };

  // Placeholder signOut function
  const signOut = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(null);
    setLoading(false);
    toast({ title: "Signed Out (Mock)", description: "You have been successfully signed out." });
    router.push('/login'); 
  };

  // Placeholder sendPasswordReset function
  const sendPasswordReset = async (email: string) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    toast({ title: "Password Reset Email Sent (Mock)", description: `If an account exists for ${email}, a reset link has been sent.` });
    return { error: null };
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
