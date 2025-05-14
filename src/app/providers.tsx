// src/app/providers.tsx
"use client";

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// AuthProvider is no longer globally applied here; it's either per-page or in a layout wrapper if needed globally.
// For this "start fresh" approach, MainLayoutWrapper in main-layout.tsx handles it.
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

// Create a single instance of QueryClient
const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {/* AuthProvider is removed from here. 
          If truly global auth state is needed outside MainLayout, it could be added back,
          but for now, assuming MainLayout or page-specific wrappers handle it. */}
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
