import type { Timestamp } from 'firebase/firestore';

export interface FirebasePrompt {
  id: string; // Firestore document ID
  userId: string;
  name: string;
  content: string;
  folderId: string | null; // null for root-level prompts
  createdAt: Timestamp;
  updatedAt: Timestamp;
  versions: number;
  isFavorite: boolean;
}

export interface FirebaseFolder {
  id: string; // Firestore document ID
  userId: string;
  name: string;
  parentId: string | null; // null for top-level folders
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirebasePromptVersion {
  id: string; // Firestore document ID
  // promptId: string; // Not strictly needed if this is a subcollection of a prompt
  userId: string; 
  versionNumber: number;
  content: string;
  timestamp: Timestamp; // Timestamp of when this version was created/saved
}
