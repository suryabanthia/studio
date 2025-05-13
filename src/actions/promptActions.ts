// src/actions/promptActions.ts
"use client";

import { auth } from '@/lib/firebase/firebase';

async function getAuthHeaders(): Promise<HeadersInit | null> {
  const user = auth.currentUser;
  if (!user) {
    console.error("User not authenticated for API call.");
    return null;
  }
  try {
    const token = await user.getIdToken();
    return {
      'Authorization': `Bearer ${token}`,
      // Content-Type will be set by FormData for import, and application/json for export GET
    };
  } catch (error) {
    console.error("Error getting ID token:", error);
    return null;
  }
}

export async function importPrompts(file: File): Promise<{ count?: number; error?: string }> {
  const headers = await getAuthHeaders();
  if (!headers) return { error: "User not authenticated." };

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/prompts/import', {
      method: 'POST',
      headers: { // FormData sets Content-Type automatically, but we need Authorization
         'Authorization': headers['Authorization'],
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to import prompts: ${response.statusText}` }));
      return { error: errorData.error || `Failed to import prompts: ${response.statusText}` };
    }
    const data: { count: number } = await response.json();
    return { count: data.count };
  } catch (e: any) {
    return { error: e.message || "An unexpected error occurred while importing prompts." };
  }
}

export async function exportPrompts(format: 'json' | 'csv'): Promise<{ data?: string; error?: string }> {
  const headers = await getAuthHeaders();
  if (!headers) return { error: "User not authenticated." };

  try {
    const response = await fetch(`/api/prompts/export?format=${format}`, {
      method: 'GET',
      headers: {
        ...headers,
        'Content-Type': 'application/json', // For GET request, even though response might be different
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to export prompts: ${response.statusText}` }));
      return { error: errorData.error || `Failed to export prompts: ${response.statusText}` };
    }
    
    // For JSON, API returns JSON string. For CSV, API returns CSV string.
    const data = await response.text(); 
    return { data };

  } catch (e: any) {
    return { error: e.message || "An unexpected error occurred while exporting prompts." };
  }
}
