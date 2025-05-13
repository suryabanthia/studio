import type { Prompt, PromptVersion } from '@/components/layout/main-layout';

export const newId = () => `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export interface FolderOption {
  value: string;
  label: string;
}

export function generateFolderOptions(
  items: Prompt[],
  prefix = '',
  includeRootOption = false,
  promptIdToExclude?: string
): FolderOption[] {
  let options: FolderOption[] = [];
  if (includeRootOption) {
    options.push({ value: 'root', label: 'No Parent (Root Level)' });
  }

  items.forEach(item => {
    if (item.id === promptIdToExclude) return;

    if (item.type === 'folder') {
      const currentLabel = prefix ? `${prefix} > ${item.name}` : item.name;
      options.push({ value: item.id, label: currentLabel });
      if (item.children) {
        options = options.concat(
          generateFolderOptions(item.children, currentLabel, false, promptIdToExclude)
        );
      }
    }
  });
  return options;
}

export function addPromptToTree(
  tree: Prompt[],
  targetFolderId: string,
  promptToAdd: Prompt
): Prompt[] {
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
        children: addPromptToTree(item.children, targetFolderId, promptToAdd),
      };
    }
    return item;
  });
}

export function addFolderToTree(
  tree: Prompt[],
  parentId: string | 'root',
  folderToAdd: Prompt
): Prompt[] {
  if (parentId === 'root') {
    return [...tree, folderToAdd];
  }
  return tree.map(item => {
    if (item.id === parentId && item.type === 'folder') {
      return {
        ...item,
        children: [...(item.children || []), folderToAdd],
      };
    }
    if (item.children) {
      return {
        ...item,
        children: addFolderToTree(item.children, parentId, folderToAdd),
      };
    }
    return item;
  });
}

export function updatePromptInTree(
  items: Prompt[],
  targetId: string,
  newContent: string
): Prompt[] {
  return items.map(item => {
    if (item.id === targetId && item.type === 'prompt' && item.content !== undefined) {
      const previousVersionNumber = item.versions || 1; 
      const newHistoryEntry: PromptVersion = {
        versionNumber: previousVersionNumber,
        content: item.content, // Store the old content
        timestamp: new Date(), // Timestamp of when this old version was superseded
      };
      return {
        ...item,
        content: newContent, // New content becomes current
        versions: previousVersionNumber + 1, // Increment total versions
        history: [...(item.history || []), newHistoryEntry].sort((a,b) => b.versionNumber - a.versionNumber), // Add to history and keep sorted
      };
    }
    if (item.children) {
      return {
        ...item,
        children: updatePromptInTree(item.children, targetId, newContent),
      };
    }
    return item;
  });
}