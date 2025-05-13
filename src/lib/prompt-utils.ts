
import type { Prompt } from '@/components/layout/main-layout';

export const newId = () => `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

export interface FolderOption {
  value: string;
  label: string;
}

export function generateFolderOptions(
  items: Prompt[],
  prefix = '',
  includeRootOption = false,
  promptIdToExclude?: string // Used when choosing a parent for a new folder, to avoid self-parenting if we were moving items
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
