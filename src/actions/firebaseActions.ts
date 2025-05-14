'use server';
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import type { Prompt, PromptVersion } from '@/components/layout/main-layout'; // Assuming types are defined here
import { FieldValue } from 'firebase-admin/firestore';
import { generateNewId } from '@/lib/prompt-utils'; // Assuming this utility exists

// Helper function to convert Firestore Timestamps to JS Dates
// This should be used when sending data to the client
const convertTimestampsForClient = (data: any) => {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(item => convertTimestampsForClient(item));
  }
  if (typeof data === 'object' && data !== null) {
    const newObj: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        if (value && typeof value.toDate === 'function' && value.nanoseconds !== undefined && value.seconds !== undefined) { // Check if it's a Firestore Timestamp
          newObj[key] = value.toDate();
        } else if (typeof value === 'object' && value !== null) {
          newObj[key] = convertTimestampsForClient(value);
        } else {
          newObj[key] = value;
        }
      }
    }
    return newObj;
  }
  return data;
};


export async function createPrompt({ userId, name, content, parentId }: { userId: string; name: string; content: string; parentId: string | null }): Promise<{ prompt: Prompt | null; error: Error | null }> {
  if (!userId) return { prompt: null, error: new Error("User not authenticated") };
  try {
    const newPromptRef = adminDb.collection('prompts').doc();
    const promptData: Omit<Prompt, 'id' | 'children' | 'history' > & { createdAt: FieldValue; updatedAt: FieldValue; userId: string; parentId: string | null, type: 'prompt', versions: number } = {
      name,
      content,
      userId,
      parentId: parentId || null,
      type: 'prompt',
      versions: 1,
      isFavorite: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await newPromptRef.set(promptData);
    const promptDoc = await newPromptRef.get();
    const createdPrompt = { id: promptDoc.id, ...promptDoc.data() } as Prompt;
    return { prompt: convertTimestampsForClient(createdPrompt), error: null };
  } catch (error) {
    console.error("Error creating prompt:", error);
    return { prompt: null, error: error instanceof Error ? error : new Error("Failed to create prompt") };
  }
}

export async function updatePrompt({ promptId, newContent, userId }: { promptId: string; newContent: string; userId: string }): Promise<{ updatedPrompt: Prompt | null; error: Error | null }> {
  if (!userId) return { updatedPrompt: null, error: new Error("User not authenticated") };
  if (!promptId) return { updatedPrompt: null, error: new Error("Prompt ID is required") };

  try {
    const promptRef = adminDb.collection('prompts').doc(promptId);
    const promptDoc = await promptRef.get();

    if (!promptDoc.exists || promptDoc.data()?.userId !== userId) {
      return { updatedPrompt: null, error: new Error("Prompt not found or unauthorized") };
    }

    const currentPromptData = promptDoc.data() as Prompt;
    const currentVersionNumber = currentPromptData.versions || 0;

    // Create a version history entry
    const versionId = generateNewId();
    const versionRef = adminDb.collection('promptVersions').doc(versionId);
    const versionData: Omit<PromptVersion, 'id'> & { createdAt: FieldValue } = {
      promptId: promptId,
      versionNumber: currentVersionNumber,
      content: currentPromptData.content || "",
      timestamp: currentPromptData.updatedAt || FieldValue.serverTimestamp(), // Use current updatedAt or server timestamp
      userId: userId,
      createdAt: FieldValue.serverTimestamp()
    };
    await versionRef.set(versionData);

    // Update the prompt
    await promptRef.update({
      content: newContent,
      versions: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedPromptDoc = await promptRef.get();
    const updatedPrompt = { id: updatedPromptDoc.id, ...updatedPromptDoc.data() } as Prompt;
    
    // Fetch history to include in the response
    const historySnapshot = await adminDb.collection('promptVersions')
      .where('promptId', '==', promptId)
      .where('userId', '==', userId)
      .orderBy('versionNumber', 'desc')
      .get();
    
    updatedPrompt.history = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PromptVersion));

    return { updatedPrompt: convertTimestampsForClient(updatedPrompt), error: null };
  } catch (error) {
    console.error("Error updating prompt:", error);
    return { updatedPrompt: null, error: error instanceof Error ? error : new Error("Failed to update prompt") };
  }
}

export async function deletePrompt({ promptId, userId }: { promptId: string; userId: string }): Promise<{ success: boolean; error: Error | null }> {
   if (!userId) return { success: false, error: new Error("User not authenticated") };
   if (!promptId) return { success: false, error: new Error("Prompt ID is required") };
  try {
    const promptRef = adminDb.collection('prompts').doc(promptId);
    const promptDoc = await promptRef.get();

    if (!promptDoc.exists || promptDoc.data()?.userId !== userId) {
      return { success: false, error: new Error("Prompt not found or unauthorized") };
    }
    
    // Delete associated versions first (optional, or handle via Firebase functions for cascading deletes)
    const versionsQuery = adminDb.collection('promptVersions').where('promptId', '==', promptId).where('userId', '==', userId);
    const versionsSnapshot = await versionsQuery.get();
    const batch = adminDb.batch();
    versionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    await promptRef.delete();
    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting prompt:", error);
    return { success: false, error: error instanceof Error ? error : new Error("Failed to delete prompt") };
  }
}

export async function getPrompts({ userId }: { userId: string }): Promise<{ prompts: Prompt[] | null; error: Error | null }> {
  if (!userId) return { prompts: null, error: new Error("User not authenticated") };
  try {
    const promptsSnapshot = await adminDb.collection('prompts').where('userId', '==', userId).get();
    const prompts = promptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt));
    return { prompts: convertTimestampsForClient(prompts), error: null };
  } catch (error) {
    console.error("Error fetching prompts:", error);
    return { prompts: null, error: error instanceof Error ? error : new Error("Failed to fetch prompts") };
  }
}

export async function getPromptVersions({ promptId, userId }: { promptId: string; userId: string }): Promise<{ versions: PromptVersion[] | null; error: Error | null }> {
   if (!userId) return { versions: null, error: new Error("User not authenticated") };
   if (!promptId) return { versions: null, error: new Error("Prompt ID is required") };
  try {
    const versionsSnapshot = await adminDb.collection('promptVersions')
      .where('promptId', '==', promptId)
      .where('userId', '==', userId)
      .orderBy('versionNumber', 'desc')
      .get();
    const versions = versionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PromptVersion));
    return { versions: convertTimestampsForClient(versions), error: null };
  } catch (error) {
    console.error("Error fetching prompt versions:", error);
    return { versions: null, error: error instanceof Error ? error : new Error("Failed to fetch prompt versions") };
  }
}

export async function createFolder({ userId, name, parentId }: { userId: string; name: string; parentId: string | null }): Promise<{ folder: Prompt | null; error: Error | null }> {
  if (!userId) return { folder: null, error: new Error("User not authenticated") };
  try {
    const newFolderRef = adminDb.collection('folders').doc(); // Using 'folders' collection
    const folderData: Omit<Prompt, 'id' | 'content' | 'versions' | 'history' | 'isFavorite'> & { createdAt: FieldValue; updatedAt: FieldValue; userId: string; parentId: string | null; type: 'folder' } = {
      name,
      userId,
      parentId: parentId || null,
      type: 'folder',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await newFolderRef.set(folderData);
    const folderDoc = await newFolderRef.get();
    const createdFolder = { id: folderDoc.id, ...folderDoc.data() } as Prompt;
    return { folder: convertTimestampsForClient(createdFolder), error: null };
  } catch (error) {
    console.error("Error creating folder:", error);
    return { folder: null, error: error instanceof Error ? error : new Error("Failed to create folder") };
  }
}

export async function getFolders({ userId }: { userId: string }): Promise<{ folders: Prompt[] | null; error: Error | null }> {
  if (!userId) return { folders: null, error: new Error("User not authenticated") };
  try {
    const foldersSnapshot = await adminDb.collection('folders').where('userId', '==', userId).get();
    const folders = foldersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt));
    return { folders: convertTimestampsForClient(folders), error: null };
  } catch (error) {
    console.error("Error fetching folders:", error);
    return { folders: null, error: error instanceof Error ? error : new Error("Failed to fetch folders") };
  }
}

export async function branchPrompt({ originalPrompt, userId }: { originalPrompt: Prompt; userId: string }): Promise<{ branchedPrompt: Prompt | null; error: Error | null }> {
  if (!userId) return { branchedPrompt: null, error: new Error("User not authenticated") };
  if (!originalPrompt || !originalPrompt.id) return { branchedPrompt: null, error: new Error("Original prompt data is invalid") };
  
  try {
    const newPromptRef = adminDb.collection('prompts').doc();
    const branchedPromptData: Omit<Prompt, 'id' | 'children' | 'history'> & { createdAt: FieldValue; updatedAt: FieldValue; userId: string; parentId: string | null, type: 'prompt', versions: number } = {
      name: `${originalPrompt.name} (Branch)`,
      content: originalPrompt.content || "",
      userId,
      parentId: originalPrompt.parentId || null,
      type: 'prompt',
      versions: 1, // Branched prompt starts at version 1
      isFavorite: originalPrompt.isFavorite || false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await newPromptRef.set(branchedPromptData);
    const branchedDoc = await newPromptRef.get();
    const createdPrompt = { id: branchedDoc.id, ...branchedDoc.data() } as Prompt;
    return { branchedPrompt: convertTimestampsForClient(createdPrompt), error: null };
  } catch (error) {
    console.error("Error branching prompt:", error);
    return { branchedPrompt: null, error: error instanceof Error ? error : new Error("Failed to branch prompt") };
  }
}


export async function exportPrompts({ userId, format }: { userId: string; format: 'json' | 'csv' }): Promise<{ data: string | null; error: Error | null }> {
  if (!userId) return { data: null, error: new Error("User not authenticated") };
  try {
    const promptsSnapshot = await adminDb.collection('prompts').where('userId', '==', userId).get();
    const prompts = promptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Also fetch folders to provide context if needed, or include parent folder names
    const foldersSnapshot = await adminDb.collection('folders').where('userId', '==', userId).get();
    const folders = foldersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const folderMap = new Map(folders.map(f => [f.id, f.name]));

    const exportableData = prompts.map(p => ({
      ...p,
      parentFolderName: p.parentId ? folderMap.get(p.parentId) || 'Unknown Folder' : 'Root',
      createdAt: p.createdAt?.toDate ? p.createdAt.toDate().toISOString() : null, // Convert timestamp
      updatedAt: p.updatedAt?.toDate ? p.updatedAt.toDate().toISOString() : null, // Convert timestamp
    }));


    if (format === 'json') {
      return { data: JSON.stringify(exportableData, null, 2), error: null };
    } else if (format === 'csv') {
      if (exportableData.length === 0) return { data: "", error: null };
      const headers = Object.keys(exportableData[0]).join(',');
      const rows = exportableData.map(prompt => 
        Object.values(prompt).map(value => {
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`; // Escape quotes
          return value;
        }).join(',')
      );
      return { data: `${headers}\n${rows.join('\n')}`, error: null };
    }
    return { data: null, error: new Error("Invalid export format") };
  } catch (error) {
    console.error("Error exporting prompts:", error);
    return { data: null, error: error instanceof Error ? error : new Error("Failed to export prompts") };
  }
}

export async function importPrompts({ userId, fileContent, format }: { userId: string; fileContent: string; format: 'json' | 'csv' }): Promise<{ success: boolean; error: Error | null }> {
  if (!userId) return { success: false, error: new Error("User not authenticated") };
  try {
    let promptsToImport: Partial<Prompt>[] = [];
    if (format === 'json') {
      promptsToImport = JSON.parse(fileContent);
    } else if (format === 'csv') {
      // Basic CSV parsing - for more robust parsing, consider a library
      const lines = fileContent.split('\n');
      if (lines.length < 2) return { success: false, error: new Error("CSV file must have headers and at least one data row.") };
      const headers = lines[0].split(',');
      promptsToImport = lines.slice(1).map(line => {
        const values = line.split(','); // This is a naive CSV split, doesn't handle commas in values well
        const prompt: any = {};
        headers.forEach((header, index) => {
          prompt[header.trim()] = values[index]?.trim().replace(/^"|"$/g, '').replace(/""/g, '"'); // Unescape quotes
        });
        return prompt;
      });
    } else {
      return { success: false, error: new Error("Invalid import format") };
    }

    const batch = adminDb.batch();
    for (const p of promptsToImport) {
      if (!p.name || !p.content) {
        console.warn("Skipping prompt due to missing name or content:", p);
        continue;
      }
      const newPromptRef = adminDb.collection('prompts').doc(); // Generate new ID
      const promptData = {
        name: p.name,
        content: p.content,
        userId,
        parentId: p.parentId || null, // Assuming parentId might be in the import
        type: 'prompt',
        versions: p.versions || 1,
        isFavorite: p.isFavorite || false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      batch.set(newPromptRef, promptData);
    }
    await batch.commit();
    return { success: true, error: null };
  } catch (error) {
    console.error("Error importing prompts:", error);
    return { success: false, error: error instanceof Error ? error : new Error("Failed to import prompts") };
  }
}
