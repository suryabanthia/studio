'use server';
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import type { Prompt, PromptVersion } from '@/components/layout/main-layout';
import {FieldValue} from 'firebase-admin/firestore';

if (!adminDb) {
  throw new Error('Firebase Admin SDK not initialized. Check server logs for details.');
}

// Helper to convert Firestore Timestamps to Dates for client-side usage
const convertTimestampsToDates = (data: any): any => {
  if (data && data.toDate && typeof data.toDate === 'function') { // Check if it's a Firestore Timestamp
    return data.toDate();
  }
  if (Array.isArray(data)) {
    return data.map(convertTimestampsToDates);
  }
  if (data && typeof data === 'object') {
    const res: { [key: string]: any } = {};
    for (const key in data) {
      res[key] = convertTimestampsToDates(data[key]);
    }
    return res;
  }
  return data;
};


export async function getPrompts(userId: string): Promise<Prompt[]> {
  try {
    const promptsSnapshot = await adminDb.collection('users').doc(userId).collection('prompts').get();
    const prompts = promptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt));
    return convertTimestampsToDates(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    throw new Error(`Failed to fetch prompts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getFolders(userId: string): Promise<Prompt[]> {
   try {
    const foldersSnapshot = await adminDb.collection('users').doc(userId).collection('folders').get();
    const folders = foldersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'folder' } as Prompt));
    return convertTimestampsToDates(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    throw new Error(`Failed to fetch folders: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function createPrompt(params: {
  name: string;
  content: string;
  parentId: string | null;
  userId: string;
  type: 'prompt';
}): Promise<Prompt> {
  try {
    const newPromptRef = adminDb.collection('users').doc(params.userId).collection('prompts').doc();
    const newPromptData: Omit<Prompt, 'id' | 'children' | 'history'> & {createdAt: FieldValue, updatedAt: FieldValue} = {
      name: params.name,
      content: params.content,
      parentId: params.parentId,
      userId: params.userId,
      type: 'prompt',
      versions: 1,
      isFavorite: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await newPromptRef.set(newPromptData);
    // Fetch the created document to get server-generated timestamps
    const createdDoc = await newPromptRef.get();
    const createdPrompt = { id: createdDoc.id, ...createdDoc.data() } as Prompt;
    return convertTimestampsToDates(createdPrompt);
  } catch (error) {
    console.error('Error creating prompt:', error);
    throw new Error(`Failed to create prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function createFolder(params: {
  name: string;
  parentId: string | null;
  userId: string;
}): Promise<Prompt> {
  try {
    const newFolderRef = adminDb.collection('users').doc(params.userId).collection('folders').doc();
    const newFolderData: Omit<Prompt, 'id' | 'children' | 'content' | 'versions' | 'isFavorite' | 'history'> & {createdAt: FieldValue, updatedAt: FieldValue} = {
      name: params.name,
      parentId: params.parentId,
      userId: params.userId,
      type: 'folder',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await newFolderRef.set(newFolderData);
    const createdDoc = await newFolderRef.get();
    const createdFolder = { id: createdDoc.id, ...createdDoc.data(), type: 'folder' } as Prompt;
    return convertTimestampsToDates(createdFolder);
  } catch (error) {
    console.error('Error creating folder:', error);
    throw new Error(`Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updatePrompt(params: {
  promptId: string;
  newContent: string;
  userId: string;
}): Promise<Prompt> {
  try {
    const promptRef = adminDb.collection('users').doc(params.userId).collection('prompts').doc(params.promptId);
    const promptDoc = await promptRef.get();
    if (!promptDoc.exists) {
      throw new Error('Prompt not found');
    }
    const currentPromptData = promptDoc.data() as Prompt;

    const newVersionNumber = (currentPromptData.versions || 0) + 1;
    const versionId = adminDb.collection('users').doc(params.userId).collection('prompts').doc(params.promptId).collection('versions').doc().id;

    const newVersion: PromptVersion = {
      id: versionId,
      versionNumber: currentPromptData.versions || 1, // The version number *before* this update
      content: currentPromptData.content || '',
      timestamp: currentPromptData.updatedAt || FieldValue.serverTimestamp(), // Timestamp of the old version
      userId: params.userId,
      promptId: params.promptId
    };

    await adminDb.collection('users').doc(params.userId).collection('prompts').doc(params.promptId).collection('versions').doc(versionId).set({
      ...newVersion,
      timestamp: FieldValue.serverTimestamp() // Current time for this new version entry
    });
    
    await promptRef.update({
      content: params.newContent,
      versions: newVersionNumber,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    const updatedDoc = await promptRef.get();
    const updatedPrompt = { id: updatedDoc.id, ...updatedDoc.data() } as Prompt;
    return convertTimestampsToDates(updatedPrompt);
  } catch (error) {
    console.error('Error updating prompt:', error);
    throw new Error(`Failed to update prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deletePrompt(params: { promptId: string; userId: string, promptName: string }): Promise<{ success: boolean }> {
  try {
    // Determine if it's a prompt or folder
    const promptRef = adminDb.collection('users').doc(params.userId).collection('prompts').doc(params.promptId);
    const folderRef = adminDb.collection('users').doc(params.userId).collection('folders').doc(params.promptId);

    const promptDoc = await promptRef.get();
    if (promptDoc.exists) {
      // It's a prompt, delete its versions first
      const versionsSnapshot = await promptRef.collection('versions').get();
      const batch = adminDb.batch();
      versionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      await promptRef.delete();
    } else {
      const folderDoc = await folderRef.get();
      if (folderDoc.exists) {
        // It's a folder, delete it (and potentially its contents if needed - requires recursive logic)
        // For now, just deleting the folder. Recursive deletion is complex.
        // A more robust solution would use Firebase Functions for recursive deletes.
        await folderRef.delete();
         // TODO: Implement recursive deletion for prompts/folders within this folder
      } else {
        throw new Error(`Item "${params.promptName}" not found.`);
      }
    }
    return { success: true };
  } catch (error) {
    console.error(`Error deleting item "${params.promptName}":`, error);
    throw new Error(`Failed to delete item: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


export async function getPromptVersions(params: { promptId: string; userId: string }): Promise<PromptVersion[]> {
  try {
    const versionsSnapshot = await adminDb.collection('users').doc(params.userId)
      .collection('prompts').doc(params.promptId)
      .collection('versions')
      .orderBy('versionNumber', 'desc')
      .get();
    const versions = versionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PromptVersion));
    return convertTimestampsToDates(versions);
  } catch (error) {
    console.error('Error fetching prompt versions:', error);
    throw new Error(`Failed to fetch prompt versions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function branchPrompt(params: {
  originalPrompt: Prompt;
  userId: string;
  newId: string;
}): Promise<Prompt> {
  try {
    const newPromptRef = adminDb.collection('users').doc(params.userId).collection('prompts').doc(params.newId);
    const branchedPromptData: Omit<Prompt, 'id' | 'children' | 'history'> & {createdAt: FieldValue, updatedAt: FieldValue} = {
      name: `${params.originalPrompt.name} (Branch)`,
      content: params.originalPrompt.content,
      parentId: params.originalPrompt.parentId,
      userId: params.userId,
      type: 'prompt',
      versions: 1, // Branched prompt starts at version 1
      isFavorite: false, // Branched prompt is not favorited by default
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await newPromptRef.set(branchedPromptData);
    const createdDoc = await newPromptRef.get();
    const createdPrompt = { id: createdDoc.id, ...createdDoc.data() } as Prompt;
    return convertTimestampsToDates(createdPrompt);
  } catch (error) {
    console.error('Error branching prompt:', error);
    throw new Error(`Failed to branch prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


export async function exportPrompts(params: { userId: string; format: "json" | "csv" }): Promise<{ dataString: string, fileExtension: string, mimeType: string }> {
    try {
        const userPrompts = await getPrompts(params.userId);
        const userFolders = await getFolders(params.userId);

        // Combine prompts and folders for export
        // This simple structure might need to be more hierarchical for perfect re-import
        const exportData = {
            prompts: userPrompts,
            folders: userFolders,
        };

        if (params.format === "json") {
            return {
                dataString: JSON.stringify(exportData, null, 2),
                fileExtension: "json",
                mimeType: "application/json",
            };
        } else if (params.format === "csv") {
            // CSV export: focus on prompts for simplicity. Folders are harder to represent flatly.
            let csvString = "id,name,content,parentId,versions,isFavorite,createdAt,updatedAt\n";
            userPrompts.forEach(p => {
                if (p.type === 'prompt') {
                    csvString += `"${p.id}","${p.name}","${(p.content || '').replace(/"/g, '""')}","${p.parentId || ''}",${p.versions || 1},${p.isFavorite || false},"${p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt || ''}","${p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt || ''}"\n`;
                }
            });
            return {
                dataString: csvString,
                fileExtension: "csv",
                mimeType: "text/csv",
            };
        } else {
            throw new Error("Unsupported export format");
        }
    } catch (error) {
        console.error("Error exporting prompts:", error);
        throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}


export async function importPrompts(params: { userId: string; file: File }): Promise<number> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const fileContent = event.target?.result as string;
                if (!fileContent) {
                    throw new Error("File content is empty.");
                }

                let importedCount = 0;
                const batch = adminDb.batch();

                if (params.file.name.endsWith(".json")) {
                    const data = JSON.parse(fileContent);
                    const promptsToImport: Prompt[] = data.prompts || [];
                    const foldersToImport: Prompt[] = data.folders || [];

                    // Import folders first to ensure parentId references can be resolved
                    for (const folder of foldersToImport) {
                        if (folder.type === 'folder' && folder.name) {
                            const folderRef = adminDb.collection('users').doc(params.userId).collection('folders').doc();
                            batch.set(folderRef, {
                                name: folder.name,
                                parentId: folder.parentId || null,
                                userId: params.userId,
                                type: 'folder',
                                createdAt: FieldValue.serverTimestamp(),
                                updatedAt: FieldValue.serverTimestamp(),
                            });
                            importedCount++;
                        }
                    }
                    
                    for (const prompt of promptsToImport) {
                         if (prompt.type === 'prompt' && prompt.name) {
                            const promptRef = adminDb.collection('users').doc(params.userId).collection('prompts').doc();
                             batch.set(promptRef, {
                                name: prompt.name,
                                content: prompt.content || "",
                                parentId: prompt.parentId || null, // Ensure parentId exists or handle gracefully
                                userId: params.userId,
                                type: 'prompt',
                                versions: prompt.versions || 1,
                                isFavorite: prompt.isFavorite || false,
                                createdAt: FieldValue.serverTimestamp(),
                                updatedAt: FieldValue.serverTimestamp(),
                            });
                            importedCount++;
                        }
                    }

                } else if (params.file.name.endsWith(".csv")) {
                    // Basic CSV parsing - assumes specific columns.
                    // Robust CSV parsing would use a library.
                    const lines = fileContent.split('\n');
                    if (lines.length < 2) throw new Error("CSV file has no data or only headers.");
                    
                    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                    // Expected headers: id,name,content,parentId,versions,isFavorite,createdAt,updatedAt
                    const nameIndex = headers.indexOf('name');
                    const contentIndex = headers.indexOf('content');
                    // ... other indices

                    if(nameIndex === -1 || contentIndex === -1) throw new Error("CSV missing required columns: name, content");

                    for (let i = 1; i < lines.length; i++) {
                        if (lines[i].trim() === "") continue;
                        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, '')); // Simplified CSV parsing

                        const promptRef = adminDb.collection('users').doc(params.userId).collection('prompts').doc();
                        batch.set(promptRef, {
                            name: values[nameIndex] || `Imported Prompt ${importedCount + 1}`,
                            content: values[contentIndex] || "",
                            parentId: null, // CSV import might not easily preserve hierarchy
                            userId: params.userId,
                            type: 'prompt',
                            versions: 1,
                            isFavorite: false,
                            createdAt: FieldValue.serverTimestamp(),
                            updatedAt: FieldValue.serverTimestamp(),
                        });
                        importedCount++;
                    }
                } else {
                    throw new Error("Unsupported file type for import.");
                }

                await batch.commit();
                resolve(importedCount);
            } catch (error) {
                console.error("Error importing prompts:", error);
                reject(new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
        };
        reader.onerror = (error) => {
            console.error("Error reading file for import:", error);
            reject(new Error("Failed to read file."));
        };
        reader.readAsText(params.file);
    });
}