// src/actions/firebaseActions.ts
"use client"; // Mark as client component if it uses client-side Firebase auth

import { auth } from '@/lib/firebase/firebase'; // Firebase client SDK
import type { 
  FirebasePrompt, 
  FirebaseFolder, 
  FirebasePromptVersion 
} from '@/types/firebase.types';
import type { PromptSchemaType as CreatePromptPayload } from '@/app/api/prompts/route'; // Assuming this is the Zod schema type
import type { FolderSchemaType as CreateFolderPayload } from '@/app/api/folders/route'; // Assuming this is the Zod schema type
import type { UpdatePromptPayload } from '@/app/api/prompts/[id]/route';
import type { UpdateFolderPayload } from '@/app/api/folders/[id]/route';


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
      'Content-Type': 'application/json',
    };
  } catch (error) {
    console.error("Error getting ID token:", error);
    return null;
  }
}

// Prompts
export async function getPrompts(): Promise<{ data?: FirebasePrompt[]; error?: string }> {
  const headers = await getAuthHeaders();
  if (!headers) return { error: "User not authenticated." };

  try {
    const response = await fetch('/api/prompts', { headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to fetch prompts: ${response.statusText}` }));
      return { error: errorData.error || `Failed to fetch prompts: ${response.statusText}` };
    }
    const data: FirebasePrompt[] = await response.json();
    return { data };
  } catch (e: any) {
    return { error: e.message || "An unexpected error occurred while fetching prompts." };
  }
}

export async function createPrompt(payload: CreatePromptPayload): Promise<{ data?: FirebasePrompt; error?: string }> {
  const headers = await getAuthHeaders();
  if (!headers) return { error: "User not authenticated." };
  
  try {
    const response = await fetch('/api/prompts', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to create prompt: ${response.statusText}` }));
      return { error: errorData.error || `Failed to create prompt: ${response.statusText}` };
    }
    const data: FirebasePrompt = await response.json();
    return { data };
  } catch (e: any) {
    return { error: e.message || "An unexpected error occurred while creating prompt." };
  }
}

export async function updatePrompt(id: string, payload: UpdatePromptPayload): Promise<{ data?: FirebasePrompt; error?: string }> {
  const headers = await getAuthHeaders();
  if (!headers) return { error: "User not authenticated." };

  try {
    const response = await fetch(`/api/prompts/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to update prompt: ${response.statusText}` }));
      return { error: errorData.error || `Failed to update prompt: ${response.statusText}` };
    }
    const data: FirebasePrompt = await response.json(); // API returns updated prompt
    return { data };
  } catch (e: any) {
    return { error: e.message || "An unexpected error occurred while updating prompt." };
  }
}

export async function deletePrompt(id: string): Promise<{ error?: string }> {
  const headers = await getAuthHeaders();
  if (!headers) return { error: "User not authenticated." };

  try {
    const response = await fetch(`/api/prompts/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to delete prompt: ${response.statusText}` }));
      return { error: errorData.error || `Failed to delete prompt: ${response.statusText}` };
    }
    return {}; // Success
  } catch (e: any) {
    return { error: e.message || "An unexpected error occurred while deleting prompt." };
  }
}

export async function getPromptVersions(promptId: string): Promise<{ data?: FirebasePromptVersion[]; error?: string }> {
  const headers = await getAuthHeaders();
  if (!headers) return { error: "User not authenticated." };
  
  try {
    const response = await fetch(`/api/prompts/${promptId}/versions`, { headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to fetch prompt versions: ${response.statusText}` }));
      return { error: errorData.error || `Failed to fetch prompt versions: ${response.statusText}` };
    }
    const data: FirebasePromptVersion[] = await response.json();
    return { data };
  } catch (e: any) {
    return { error: e.message || "An unexpected error occurred while fetching prompt versions." };
  }
}


// Folders
export async function getFolders(): Promise<{ data?: FirebaseFolder[]; error?: string }> {
  const headers = await getAuthHeaders();
  if (!headers) return { error: "User not authenticated." };
  
  try {
    const response = await fetch('/api/folders', { headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to fetch folders: ${response.statusText}` }));
      return { error: errorData.error || `Failed to fetch folders: ${response.statusText}` };
    }
    const data: FirebaseFolder[] = await response.json();
    return { data };
  } catch (e: any) {
    return { error: e.message || "An unexpected error occurred while fetching folders." };
  }
}

export async function createFolder(payload: CreateFolderPayload): Promise<{ data?: FirebaseFolder; error?: string }> {
  const headers = await getAuthHeaders();
  if (!headers) return { error: "User not authenticated." };

  try {
    const response = await fetch('/api/folders', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to create folder: ${response.statusText}` }));
      return { error: errorData.error || `Failed to create folder: ${response.statusText}` };
    }
    const data: FirebaseFolder = await response.json();
    return { data };
  } catch (e: any) {
    return { error: e.message || "An unexpected error occurred while creating folder." };
  }
}


export async function updateFolder(id: string, payload: UpdateFolderPayload): Promise<{ data?: FirebaseFolder; error?: string }> {
  const headers = await getAuthHeaders();
  if (!headers) return { error: "User not authenticated." };

  try {
    const response = await fetch(`/api/folders/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to update folder: ${response.statusText}` }));
      return { error: errorData.error || `Failed to update folder: ${response.statusText}` };
    }
    const data: FirebaseFolder = await response.json();
    return { data };
  } catch (e: any) {
    return { error: e.message || "An unexpected error occurred while updating folder." };
  }
}

export async function deleteFolder(id: string): Promise<{ error?: string }> {
  const headers = await getAuthHeaders();
  if (!headers) return { error: "User not authenticated." };

  try {
    const response = await fetch(`/api/folders/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Failed to delete folder: ${response.statusText}` }));
      return { error: errorData.error || `Failed to delete folder: ${response.statusText}` };
    }
    return {}; // Success
  } catch (e: any) {
    return { error: e.message || "An unexpected error occurred while deleting folder." };
  }
}


// Branch Prompt
// This function will require a dedicated API endpoint or to be a server action itself.
// For now, making it a fetch wrapper for a non-existent API and it will fail.
// Or, it could be implemented as a server action directly here if this file is 'use server'
// For consistency with other actions, let's assume it calls an API.
// A new API route /api/prompts/[id]/branch (POST) would be needed.
export async function branchPrompt(promptId: string): Promise<{ data?: FirebasePrompt; error?: string }> {
  const headers = await getAuthHeaders();
  if (!headers) return { error: "User not authenticated." };

  try {
    // This API endpoint doesn't exist yet. It needs to be created.
    const response = await fetch(`/api/prompts/${promptId}/branch`, { 
      method: 'POST', 
      headers 
    }); 
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Branch prompt error response:", errorText);
      try {
        const errorData = JSON.parse(errorText);
        return { error: errorData.error || `Failed to branch prompt: ${response.statusText}` };
      } catch (parseError) {
        return { error: `Failed to branch prompt: ${response.statusText}. Non-JSON response: ${errorText}` };
      }
    }
    const data: FirebasePrompt = await response.json();
    return { data };
  } catch (e: any) {
    return { error: e.message || "An unexpected error occurred while branching prompt." };
  }
}
