import type { ClientPrompt, ClientFolder, FirebasePromptVersion } from '@/components/layout/main-layout'; // Assuming these are defined in main-layout or a types file
import { Timestamp } from 'firebase/firestore'; // Import if needed for type consistency, though client types use Date

export const newId = () => `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export interface FolderOption {
  value: string; // Folder ID or 'root'
  label: string;
}

// Generates folder options for select dropdowns, using ClientFolder type
export function generateFolderOptions(
  folders: ClientFolder[],
  currentFolderIdToExclude?: string // To prevent selecting a folder as its own parent
): FolderOption[] {
  let options: FolderOption[] = [{ value: 'root', label: 'Root Level (No Parent)' }];

  // Simple flat list for now. For nested display in dropdown, this would need recursion.
  folders.forEach(folder => {
    if (folder.id === currentFolderIdToExclude) return;
    options.push({ value: folder.id, label: folder.name });
  });
  return options;
}


// Builds a tree structure from flat lists of prompts and folders
export function buildPromptTree(prompts: ClientPrompt[], folders: ClientFolder[]): (ClientPrompt | ClientFolder)[] {
  const itemMap = new Map<string, ClientPrompt | ClientFolder & { children?: (ClientPrompt | ClientFolder)[] }>();
  
  folders.forEach(folder => itemMap.set(folder.id, { ...folder, type: 'folder', children: [] }));
  prompts.forEach(prompt => itemMap.set(prompt.id, { ...prompt, type: 'prompt' }));

  const tree: (ClientPrompt | ClientFolder)[] = [];

  itemMap.forEach(item => {
    const parentId = item.type === 'folder' ? (item as ClientFolder).parentId : (item as ClientPrompt).folderId;
    if (parentId && itemMap.has(parentId)) {
      const parent = itemMap.get(parentId) as ClientFolder & { children?: (ClientPrompt | ClientFolder)[] };
      if (parent.type === 'folder') { // Ensure parent is indeed a folder
        parent.children = parent.children || [];
        parent.children.push(item);
      } else { // Should not happen if data is consistent
        tree.push(item); 
      }
    } else {
      tree.push(item); // Root item
    }
  });
  
  // Sort children alphabetically by name for both folders and prompts within folders
  itemMap.forEach(item => {
    if (item.type === 'folder' && (item as ClientFolder & { children?: any[] }).children) {
      (item as ClientFolder & { children?: any[] }).children?.sort((a, b) => a.name.localeCompare(b.name));
    }
  });
  // Sort root items
  tree.sort((a, b) => {
    if (a.type === 'folder' && b.type === 'prompt') return -1;
    if (a.type === 'prompt' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  return tree;
}


// The following functions (addPromptToTree, addFolderToTree, updatePromptInTree, addPromptNextToSibling)
// were for client-side state manipulation. With a backend, these operations
// should primarily be handled by API calls and then re-fetching/invalidating queries.
// They might still be useful for optimistic updates or specific client-side scenarios,
// but their role changes. For now, they are kept but might need adaptation
// if used for optimistic updates with Firebase data.

export function addPromptToTree(
  tree: ClientPrompt[],
  targetFolderId: string,
  promptToAdd: ClientPrompt
): ClientPrompt[] {
  // This function assumes tree contains items of ClientPrompt or ClientFolder type
  return tree.map(item => {
    if (item.id === targetFolderId && item.type === 'folder') {
      return {
        ...item,
        children: [...(item.children || []), promptToAdd],
      };
    }
    if (item.children) {
      return {
        ...item,
        children: addPromptToTree(item.children as ClientPrompt[], targetFolderId, promptToAdd),
      };
    }
    return item;
  }) as ClientPrompt[];
}

export function addFolderToTree(
  tree: (ClientPrompt | ClientFolder)[],
  parentId: string | 'root',
  folderToAdd: ClientFolder
): (ClientPrompt | ClientFolder)[] {
  if (parentId === 'root') {
    return [...tree, folderToAdd];
  }
  return tree.map(item => {
    if (item.id === parentId && item.type === 'folder') {
      return {
        ...item,
        children: [...((item as ClientFolder).children || []), folderToAdd],
      };
    }
    if ((item as ClientFolder).children) {
      return {
        ...item,
        children: addFolderToTree((item as ClientFolder).children!, parentId, folderToAdd),
      };
    }
    return item;
  });
}

// This function's logic for versioning is now handled by the backend.
// If used for optimistic updates, it would need to reflect the expected backend state.
export function updatePromptInTree(
  items: ClientPrompt[],
  targetId: string,
  newContent: string
): ClientPrompt[] {
   return items.map(item => {
    if (item.id === targetId && item.type === 'prompt') {
      // Optimistic update: reflect new content and assume backend increments version
      const updatedPrompt = {
        ...item,
        content: newContent,
        versions: (item.versions || 0) + 1, // Optimistically increment
        updatedAt: new Date(), // Optimistically set updatedAt
        // History update is complex for optimistic; backend handles actual history creation.
      };
      return updatedPrompt;
    }
    if (item.children) {
      return {
        ...item,
        children: updatePromptInTree(item.children as ClientPrompt[], targetId, newContent),
      };
    }
    return item;
  }) as ClientPrompt[];
}


export function findPromptInTree(items: (ClientPrompt | ClientFolder)[], promptId: string): ClientPrompt | null {
  for (const item of items) {
    if (item.id === promptId && item.type === 'prompt') {
      return item as ClientPrompt;
    }
    if (item.type === 'folder' && (item as ClientFolder).children) {
      const found = findPromptInTree((item as ClientFolder).children!, promptId);
      if (found) return found;
    }
  }
  return null;
}

export function findItemPath(items: (ClientPrompt | ClientFolder)[], itemId: string, currentPath: string[] = []): string[] | null {
    for (const item of items) {
        const newPath = [...currentPath, item.name];
        if (item.id === itemId) {
            return newPath;
        }
        if (item.type === 'folder' && (item as ClientFolder).children) {
            const foundPath = findItemPath((item as ClientFolder).children!, itemId, newPath);
            if (foundPath) {
                return foundPath;
            }
        }
    }
    return null;
}

// This function might be less relevant if branching creates a new root-level item or is handled server-side.
export function addPromptNextToSibling(
  items: (ClientPrompt | ClientFolder)[],
  siblingId: string,
  promptToAdd: ClientPrompt
): { updatedTree: (ClientPrompt | ClientFolder)[]; success: boolean } {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === siblingId) {
      const newItems = [...items];
      newItems.splice(i + 1, 0, promptToAdd);
      return { updatedTree: newItems, success: true };
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type === 'folder' && (item as ClientFolder).children) {
      const result = addPromptNextToSibling((item as ClientFolder).children!, siblingId, promptToAdd);
      if (result.success) {
        const newItems = [...items];
        (newItems[i] as ClientFolder).children = result.updatedTree;
        return { updatedTree: newItems, success: true };
      }
    }
  }
  return { updatedTree: items, success: false };
}

// Firestore doesn't store functions, so remove icon from server-side types if they existed there.
// Client-side types can still have `icon` for UI.