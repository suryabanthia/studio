// src/components/layout/main-layout.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent as ShadDialogContent, DialogHeader as ShadDialogHeader, DialogTitle as ShadDialogTitle, DialogDescription as ShadDialogDescription, DialogFooter as ShadDialogFooter } from "@/components/ui/dialog"; // Aliased to avoid conflict if any

import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { optimizePrompt, type PromptOptimizerInput, type PromptOptimizerOutput } from "@/ai/flows/prompt-optimizer";
import { NewPromptDialog, type NewPromptFormValues } from "@/components/dialogs/new-prompt-dialog";
import { EditPromptDialog } from "@/components/dialogs/edit-prompt-dialog";
import { VersionHistoryDialog } from "@/components/dialogs/version-history-dialog";
import { generateNewId } from "@/lib/prompt-utils";

import {
  Home,
  Settings,
  LifeBuoy,
  ChevronDown,
  Search,
  Folder,
  FileText,
  PlusCircle,
  UploadCloud,
  DownloadCloud,
  Sparkles,
  BookOpen,
  Moon,
  Sun,
  Palette,
  History,
  Star,
  GitFork,
  Trash2,
  LogIn,
  UserPlus,
  LogOut
} from "lucide-react";
import { useTheme } from "next-themes";
// AuthProvider is removed from here, useAuth is still needed
import { useAuth } from "@/contexts/AuthContext"; 
import { useRouter } from "next/navigation";
import { 
  createPrompt as createPromptAction,
  updatePrompt as updatePromptAction,
  deletePrompt as deletePromptAction,
  getPrompts as getPromptsAction,
  getPromptVersions as getPromptVersionsAction,
  createFolder as createFolderAction,
  getFolders as getFoldersAction,
  branchPrompt as branchPromptAction,
  exportPrompts as exportPromptsAction,
  importPrompts as importPromptsAction
} from "@/actions/firebaseActions"; 
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Timestamp } from "firebase/firestore";


// Helper to convert Firestore Timestamps in fetched data
const convertTimestamps = (data: any) => {
  if (data && typeof data === 'object') {
    for (const key in data) {
      if (data[key] instanceof Timestamp) {
        data[key] = data[key].toDate();
      } else if (typeof data[key] === 'object') {
        convertTimestamps(data[key]);
      }
    }
  }
  return data;
};


export interface PromptVersion {
  id: string; 
  versionNumber: number;
  content: string;
  timestamp: Date | Timestamp; 
  userId?: string; 
  promptId?: string; 
}

export interface Prompt {
  id: string; 
  name: string;
  type: "folder" | "prompt";
  icon?: React.ElementType;
  children?: Prompt[];
  versions?: number;
  isFavorite?: boolean;
  content?: string;
  history?: PromptVersion[];
  userId?: string;
  parentId?: string | null; 
  createdAt?: Date | Timestamp; 
  updatedAt?: Date | Timestamp; 
}

const PromptTreeItem: React.FC<{ 
  item: Prompt; 
  level: number; 
  onSelectPrompt: (prompt: Prompt) => void; 
  selectedPromptId?: string;
  onDeletePrompt: (promptId: string, promptName: string, itemType: "prompt" | "folder") => void;
}> = ({ item, level, onSelectPrompt, selectedPromptId, onDeletePrompt }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const { state: sidebarState } = useSidebar();

  const handleToggle = () => {
    if (item.type === "folder") {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = () => {
    if (item.type === "prompt") {
      onSelectPrompt(item);
    } else {
      handleToggle();
    }
  };

  const Icon = item.icon || (item.type === "folder" ? Folder : FileText);
  const isActive = selectedPromptId === item.id;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    onDeletePrompt(item.id, item.name, item.type);
  };

  return (
    <SidebarMenuItem>
      <div className="flex items-center w-full group/item">
        <SidebarMenuButton
          onClick={handleSelect}
          className={`flex-grow justify-start ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}
          style={{ paddingLeft: `${(level * 1.5) + 0.5}rem` }}
          tooltip={sidebarState === 'collapsed' ? item.name : undefined}
        >
          <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
          { sidebarState === 'expanded' && <span className="truncate flex-grow">{item.name}</span> }
          {item.isFavorite && <Star className="h-3 w-3 ml-auto text-yellow-400 flex-shrink-0" />}
          {item.type === "folder" && item.children && sidebarState === 'expanded' && (
            <ChevronDown className={`h-4 w-4 ml-auto transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
          )}
        </SidebarMenuButton>
        {sidebarState === 'expanded' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-1 opacity-0 group-hover/item:opacity-100 focus:opacity-100 ml-1"
            onClick={handleDeleteClick}
            aria-label={`Delete ${item.name}`}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        )}
      </div>
      {item.type === "folder" && isOpen && item.children && sidebarState === 'expanded' && (
        <SidebarMenuSub>
          {item.children.map((child) => (
            <PromptTreeItem key={child.id} item={child} level={level + 1} onSelectPrompt={onSelectPrompt} selectedPromptId={selectedPromptId} onDeletePrompt={onDeletePrompt} />
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
};


const AiOptimizerModal: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void; initialPrompt?: string }> = ({ open, onOpenChange, initialPrompt }) => {
  const [promptToOptimize, setPromptToOptimize] = React.useState(initialPrompt || "");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) { 
        setPromptToOptimize(initialPrompt || "");
        setSuggestions([]); 
    }
  }, [open, initialPrompt]); 


  const handleSubmit = async () => {
    if (!promptToOptimize.trim()) {
      toast({ title: "Error", description: "Prompt cannot be empty.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setSuggestions([]);
    try {
      const result: PromptOptimizerOutput = await optimizePrompt({ prompt: promptToOptimize });
      setSuggestions(result.suggestions);
      toast({ title: "Optimization Complete", description: "Suggestions generated successfully." });
    } catch (error) {
      console.error("Error optimizing prompt:", error);
      toast({ title: "Error", description: "Failed to optimize prompt.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
     <Dialog open={open} onOpenChange={onOpenChange}>
      <ShadDialogContent className="sm:max-w-[625px] bg-card">
        <ShadDialogHeader>
          <ShadDialogTitle className="flex items-center"><Sparkles className="w-5 h-5 mr-2 text-primary" /> AI Prompt Optimizer</ShadDialogTitle>
          <ShadDialogDescription>
            Enter your prompt below to get AI-powered suggestions for improvement.
          </ShadDialogDescription>
        </ShadDialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Enter your prompt here..."
            value={promptToOptimize}
            onChange={(e) => setPromptToOptimize(e.target.value)}
            className="min-h-[100px] font-code bg-background"
            aria-label="Prompt to optimize"
          />
          {isLoading && <LoadingSpinner className="mx-auto" />}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Suggestions:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm bg-background/50 p-3 rounded-md">
                {suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <ShadDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? <LoadingSpinner size="xs" className="mr-2"/> : null}
            {isLoading ? "Optimizing..." : "Optimize Prompt"}
          </Button>
        </ShadDialogFooter>
      </ShadDialogContent>
    </Dialog>
  );
};

export interface MainLayoutChildrenProps {
  openNewPromptDialog: () => void;
  openOptimizerDialog: (initialPrompt?: string) => void;
  openLoginDialog?: () => void; 
  openSignupDialog?: () => void; 
}
export type PageRenderProps = MainLayoutChildrenProps;


// Define queryClient here if it's specific to MainLayoutWrapper's scope,
// or ensure it's passed down/accessed correctly if meant to be the global one from Providers.
// For now, keeping it as a local new instance.
const queryClient = new QueryClient();

export function MainLayoutWrapper({ children }: { children: (props: MainLayoutChildrenProps) => React.ReactNode }) {
    return (
      // AuthProvider is removed from here as it's now global in src/app/providers.tsx
        <QueryClientProvider client={queryClient}>
            <MainLayout>{children}</MainLayout>
        </QueryClientProvider>
    );
}


export function MainLayout({ children: renderPropChildren }: { children: (props: MainLayoutChildrenProps) => React.ReactNode }) {
  const { user, loading: authLoading, signOut: appSignOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const reactQueryClient = useQueryClient(); // Use the client from the provider via hook
  
  const [tree, setTree] = React.useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = React.useState<Prompt | null>(null);
  
  const { data: promptsAndFoldersData, isLoading: isLoadingPrompts, error: promptsError } = useQuery<{ prompts: Prompt[], folders: Prompt[] }, Error>({
    queryKey: ['promptsAndFolders', user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error("User not authenticated for fetching prompts/folders");
      
      const [promptsResult, foldersResult] = await Promise.all([
        getPromptsAction({ userId: user.uid }),
        getFoldersAction({ userId: user.uid })
      ]);

      if (promptsResult.error) throw promptsResult.error;
      if (foldersResult.error) throw foldersResult.error;
      
      return { 
        prompts: convertTimestamps(promptsResult.prompts || []), 
        folders: convertTimestamps(foldersResult.folders || []) 
      };
    },
    enabled: !!user?.uid && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  React.useEffect(() => {
    if (promptsAndFoldersData) {
      const combinedItems = [
        ...(promptsAndFoldersData.folders || []).map(f => ({...f, type: 'folder' as const})), 
        ...(promptsAndFoldersData.prompts || []).map(p => ({...p, type: 'prompt' as const}))
      ];
      
      const buildTree = (items: Prompt[], parentId: string | null = null): Prompt[] => {
        return items
          .filter(item => item.parentId === parentId)
          .map(item => ({
            ...item,
            children: item.type === 'folder' ? buildTree(items, item.id) : undefined,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
      };
      setTree(buildTree(combinedItems));
    } else {
      setTree([]);
    }
  }, [promptsAndFoldersData]);


  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isOptimizerOpen, setIsOptimizerOpen] = React.useState(false);
  const [optimizerInitialPrompt, setOptimizerInitialPrompt] = React.useState<string | undefined>(undefined);
  const [isNewPromptDialogOpen, setIsNewPromptDialogOpen] = React.useState(false);
  const [isEditPromptDialogOpen, setIsEditPromptDialogOpen] = React.useState(false);
  const [isVersionHistoryDialogOpen, setIsVersionHistoryDialogOpen] = React.useState(false);
  const [promptForHistory, setPromptForHistory] = React.useState<Prompt | null>(null);
  const [promptToDelete, setPromptToDelete] = React.useState<{id: string, name: string, type: 'prompt' | 'folder'} | null>(null);

  const { setTheme, theme } = useTheme();
  
   // Redirect logic using useEffect to avoid calling router.push during render
  React.useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup') {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);


  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsSearchOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, []);
  
  // This loading state is for the initial auth check
  if (authLoading) { 
     return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  // If finished auth loading, and still no user, and not on auth pages, useEffect above will handle redirect.
  // This state can be hit briefly before redirect.
  if (!user && typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }


  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
  };
  

 const createItemMutation = useMutation({
    mutationFn: async (data: NewPromptFormValues) => {
      if (!user) throw new Error("User not authenticated");
      
      let parentIdForPrompt: string | null = null;
      let newFolderId: string | null = null;

      if (data.saveLocationType === "new") {
        const { folder: newFolder, error: folderError } = await createFolderAction({ 
            userId: user.uid, 
            name: data.newFolderName!, 
            parentId: data.newFolderParentId === 'root' ? null : data.newFolderParentId! 
        });
        if (folderError) throw folderError;
        if (!newFolder) throw new Error("Folder creation failed silently.");
        newFolderId = newFolder.id;
        parentIdForPrompt = newFolderId;
        toast({ title: "Success", description: `Folder "${newFolder.name}" created.` });
      } else {
        parentIdForPrompt = data.selectedExistingFolderId === 'root' ? null : (data.selectedExistingFolderId || null);
      }
      
      const { prompt: newPrompt, error: promptError } = await createPromptAction({ 
          userId: user.uid, 
          name: data.promptName, 
          content: data.promptContent, 
          parentId: parentIdForPrompt 
      });

      if (promptError) throw promptError;
      if (!newPrompt) throw new Error("Prompt creation failed silently.");
      
      return { newPrompt: convertTimestamps(newPrompt), newFolderId };
    },
    onSuccess: (data) => {
      reactQueryClient.invalidateQueries({ queryKey: ['promptsAndFolders', user?.uid] });
      setSelectedPrompt(data.newPrompt);
      setIsNewPromptDialogOpen(false);
       toast({ title: "Success", description: `"${data.newPrompt.name}" created.` });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
  
  const handleCreateNewItem = (data: NewPromptFormValues) => {
    createItemMutation.mutate(data);
  };
  
  const updatePromptMutation = useMutation({
    mutationFn: async (newContent: string) => {
      if (!selectedPrompt || selectedPrompt.type !== 'prompt' || !user) throw new Error("Invalid operation: No prompt selected or user not authenticated.");
      
      const { updatedPrompt, error } = await updatePromptAction({ 
        promptId: selectedPrompt.id, 
        newContent, 
        userId: user.uid 
      });
      if (error) throw error;
      if (!updatedPrompt) throw new Error("Prompt update failed silently.");
      return convertTimestamps(updatedPrompt);
    },
    onSuccess: (updatedPrompt) => {
      reactQueryClient.invalidateQueries({ queryKey: ['promptsAndFolders', user?.uid] });
      reactQueryClient.invalidateQueries({ queryKey: ['promptVersions', selectedPrompt?.id] });
      setSelectedPrompt(updatedPrompt);
      setIsEditPromptDialogOpen(false);
      toast({ title: "Success", description: `Prompt "${updatedPrompt.name}" updated.` });
    },
    onError: (error) => {
      toast({ title: "Error updating prompt", description: error.message, variant: "destructive" });
    }
  });

  const handleSaveChangesToPrompt = (newContent: string) => {
    updatePromptMutation.mutate(newContent);
  };

  const deleteItemMutation = useMutation({
    mutationFn: async (item: {id: string, type: 'prompt' | 'folder', name: string}) => {
      if (!user) throw new Error("User not authenticated");
      let error;
      if (item.type === 'prompt') {
        ({ error } = await deletePromptAction({ promptId: item.id, userId: user.uid }));
      } else {
        // Firestore delete for folders might require recursive deletion of children or a cloud function
        // For now, assuming a simple delete or that backend handles children.
        // This might need to be adjusted based on actual backend folder delete logic.
        ({ error } = await deletePromptAction({ promptId: item.id, userId: user.uid })); // Placeholder, needs deleteFolderAction
         toast({ title: "Folder Deletion Info", description: `Folder deletion for "${item.name}" might require recursive logic not yet fully implemented.`, variant: "default"});
      }
      if (error) throw error;
      return item;
    },
    onSuccess: (_, variables) => {
      reactQueryClient.invalidateQueries({ queryKey: ['promptsAndFolders', user?.uid] });
      toast({ title: "Success", description: `${variables.type === 'prompt' ? 'Prompt' : 'Folder'} "${variables.name}" deleted.` });
      if (selectedPrompt?.id === variables.id) {
        setSelectedPrompt(null);
      }
      setPromptToDelete(null);
    },
    onError: (error, variables) => {
      toast({ title: `Error deleting ${variables.type}`, description: error.message, variant: "destructive" });
      setPromptToDelete(null);
    }
  });

  const handleDeletePromptRequest = (promptId: string, promptName: string, itemType: "prompt" | "folder") => {
    setPromptToDelete({id: promptId, name: promptName, type: itemType});
  };

  const confirmDeletePrompt = () => {
    if (promptToDelete) {
      deleteItemMutation.mutate(promptToDelete);
    }
  };
  
  const branchPromptMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPrompt || selectedPrompt.type !== 'prompt' || !user) {
        throw new Error("Please select a prompt to branch.");
      }
      const { branchedPrompt, error } = await branchPromptAction({ 
        originalPrompt: selectedPrompt, 
        userId: user.uid 
      });
      if (error) throw error;
      if (!branchedPrompt) throw new Error("Branching prompt failed silently.");
      return convertTimestamps(branchedPrompt);
    },
    onSuccess: (branchedPrompt) => {
      reactQueryClient.invalidateQueries({ queryKey: ['promptsAndFolders', user?.uid] });
      setSelectedPrompt(branchedPrompt);
      toast({ title: "Prompt Branched", description: `Created branch: "${branchedPrompt.name}".` });
    },
    onError: (error: Error) => {
      toast({ title: "Cannot Branch", description: error.message, variant: "destructive" });
    }
  });
  const handleBranchPrompt = () => {
    branchPromptMutation.mutate();
  };

  const {data: versionHistoryData, isLoading: isLoadingVersionHistory} = useQuery<PromptVersion[], Error>({
    queryKey: ['promptVersions', promptForHistory?.id, user?.uid],
    queryFn: async () => {
      if (!promptForHistory?.id || !user?.uid) return [];
      const { versions, error } = await getPromptVersionsAction({ promptId: promptForHistory.id, userId: user.uid });
      if (error) throw error;
      return convertTimestamps(versions || []);
    },
    enabled: !!promptForHistory?.id && !!user?.uid && isVersionHistoryDialogOpen,
  });


  const handleOpenVersionHistory = () => {
    if (selectedPrompt && selectedPrompt.type === 'prompt') {
      setPromptForHistory(selectedPrompt); 
      setIsVersionHistoryDialogOpen(true);
    } else {
      toast({ title: "Error", description: "Please select a prompt to view its history.", variant: "destructive" });
    }
  };

  const handleOpenNewPromptDialog = () => setIsNewPromptDialogOpen(true);
  const handleOpenOptimizerDialog = (initialPrompt?: string) => {
    setOptimizerInitialPrompt(initialPrompt || selectedPrompt?.content || "");
    setIsOptimizerOpen(true);
  };
  const handleOpenEditPromptDialog = () => {
    if (selectedPrompt && selectedPrompt.type === 'prompt') setIsEditPromptDialogOpen(true);
    else toast({ title: "Error", description: "Please select a prompt to edit.", variant: "destructive" });
  };

  const handleLogout = async () => {
    try {
      await appSignOut();
      reactQueryClient.clear(); 
      // router.push handled by AuthContext's onAuthStateChanged or signOut effect
    } catch (error) {
      toast({ title: "Logout Failed", description: (error as Error).message, variant: "destructive" });
    }
  };
  
  const handleOpenLoginDialog = () => router.push('/login');
  const handleOpenSignupDialog = () => router.push('/signup');

  const exportMutation = useMutation({
    mutationFn: async (format: "json" | "csv") => {
      if (!user) throw new Error("User not authenticated.");
      const { data, error } = await exportPromptsAction({ userId: user.uid, format });
      if (error) throw error;
      if (!data) throw new Error("Export failed: No data returned.");

      const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompts.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({ title: "Export Successful", description: "Your prompts have been exported." });
    },
    onError: (error: Error) => {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleExport = (format: "json" | "csv") => {
    exportMutation.mutate(format);
  };

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("User not authenticated.");
      const content = await file.text();
      const { error } = await importPromptsAction({ userId: user.uid, fileContent: content, format: file.name.endsWith('.json') ? 'json' : 'csv' });
      if (error) throw error;
    },
    onSuccess: () => {
      reactQueryClient.invalidateQueries({ queryKey: ['promptsAndFolders', user?.uid] });
      toast({ title: "Import Successful", description: "Prompts have been imported." });
    },
    onError: (error: Error) => {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        importMutation.mutate(file);
      }
    };
    input.click();
  };

  const renderProps: PageRenderProps = {
    openNewPromptDialog: handleOpenNewPromptDialog,
    openOptimizerDialog: handleOpenOptimizerDialog,
    openLoginDialog: handleOpenLoginDialog,
    openSignupDialog: handleOpenSignupDialog,
  };

  const sidebarWidth = "280px";
  
  return (
    <SidebarProvider defaultOpen={true}>
      <style jsx global>{`
        :root {
          --sidebar-width: ${sidebarWidth} !important;
        }
      `}</style>
      <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <SidebarHeader className="p-4 h-[72px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 logo-glow">
            <Palette className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground group-data-[collapsible=icon]:hidden">PromptVerse</h1>
          </Link>
          <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
        </SidebarHeader>
        <SidebarContent className="p-2">
          <div className="mb-2 px-2 group-data-[collapsible=icon]:hidden">
            <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => setIsSearchOpen(true)}>
              <Search className="w-4 h-4 mr-2" />
              Search...
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-200px)] group-data-[collapsible=icon]:h-[calc(100vh-140px)]">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home">
                  <Link href="/">
                    <Home className="h-4 w-4" /> <span className="truncate">Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarGroup>
                <SidebarGroupLabel tooltip="Prompts" className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-2"/> Prompts
                </SidebarGroupLabel>
                {isLoadingPrompts && <LoadingSpinner className="mx-auto my-4" />}
                {!isLoadingPrompts && promptsError && (
                  <SidebarMenuItem>
                      <span className="px-4 py-2 text-sm text-destructive group-data-[collapsible=icon]:hidden">Error: {promptsError.message}.</span>
                  </SidebarMenuItem>
                )}
                {!isLoadingPrompts && !promptsError && tree.length === 0 && (
                    <SidebarMenuItem>
                        <span className="px-4 py-2 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">No items yet.</span>
                        <BookOpen className="h-4 w-4 mx-auto group-data-[collapsible=icon]:block hidden my-2" />
                    </SidebarMenuItem>
                )}
                {!isLoadingPrompts && !promptsError && tree.map((item) => (
                  <PromptTreeItem 
                    key={item.id} 
                    item={item} 
                    level={0} 
                    onSelectPrompt={handleSelectPrompt} 
                    selectedPromptId={selectedPrompt?.id}
                    onDeletePrompt={handleDeletePromptRequest}
                  />
                ))}
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel tooltip="Tools" className="flex items-center"> Tools </SidebarGroupLabel>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => handleOpenOptimizerDialog()} tooltip="AI Optimizer" disabled={!user}>
                      <Sparkles className="h-4 w-4" /> <span className="truncate">AI Optimizer</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
              </SidebarGroup>
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border group-data-[collapsible=icon]:p-2">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/40/40`} alt={user.displayName || "User Avatar"} data-ai-hint="profile avatar" />
                  <AvatarFallback>{user.displayName?.substring(0,2).toUpperCase() || "PV"}</AvatarFallback>
                </Avatar>
                <div className="truncate group-data-[collapsible=icon]:hidden">
                  <p className="font-semibold text-sm">{user.displayName || "Prompt User"}</p>
                  <p className="text-xs text-muted-foreground">{user.email || "user@promptverse.ai"}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 bg-popover">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* <DropdownMenuItem onClick={() => router.push('/profile')} > Profile </DropdownMenuItem>  */}
              <DropdownMenuItem onClick={() => toast({ title: "Settings", description: "Settings page not yet implemented."})}><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                Switch to {theme === "dark" ? "Light" : "Dark"} Mode
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ title: "Coming Soon!", description: "Help & Support will be available in a future update."})}><LifeBuoy className="mr-2 h-4 w-4" /> Help & Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
            <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
                <Button onClick={handleOpenLoginDialog} className="w-full"><LogIn className="mr-2 h-4 w-4"/> Login</Button>
                <Button onClick={handleOpenSignupDialog} variant="outline" className="w-full"><UserPlus className="mr-2 h-4 w-4"/>Sign Up</Button>
            </div>
        )}
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex items-center h-[72px] border-b bg-background px-6 shadow-sm">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">
              {selectedPrompt ? selectedPrompt.name : (user ? "Dashboard" : "Welcome")}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenOptimizerDialog(selectedPrompt?.content)} disabled={!user}>
              <Sparkles className="mr-2 h-4 w-4" /> Optimize
            </Button>
            <Button variant="outline" size="sm" id="import-button-mainlayout" disabled={!user} onClick={handleImport}>
                <UploadCloud className="mr-2 h-4 w-4" /> Import
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!user}>
                        <DownloadCloud className="mr-2 h-4 w-4" /> Export
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport("json")} >
                        Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("csv")} >
                        Export as CSV
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={handleOpenNewPromptDialog} disabled={!user}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Item
            </Button>
            <SidebarTrigger className="md:hidden" />
          </div>
        </header>

        <main className="flex-1 p-6">
          {!authLoading && !user && ( 
             renderPropChildren(renderProps)
          )}
          {!authLoading && user && (
            <>
              {isLoadingPrompts && (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner size="lg" />
                  <p className="ml-2">Loading prompts...</p>
                </div>
              )}
              {promptsError && (
                <div className="text-destructive p-4 bg-destructive/10 rounded-md">
                  Error loading data: {promptsError.message}. Please try refreshing. If the issue persists, check your Firebase configuration.
                </div>
              )}
              {!isLoadingPrompts && !promptsError && (
                selectedPrompt && selectedPrompt.type === 'prompt' ? (
                  <ShadDialogContent className="bg-card p-6 rounded-lg shadow w-full max-w-2xl mx-auto"> 
                    <ShadDialogHeader className="flex flex-row justify-between items-center mb-4 p-0">
                      <ShadDialogTitle className="text-xl font-semibold">{selectedPrompt.name}</ShadDialogTitle>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenOptimizerDialog(selectedPrompt?.content)}><Sparkles className="mr-1 h-4 w-4" /> Optimize</Button>
                        <Button variant="ghost" size="sm" onClick={handleOpenVersionHistory}><History className="mr-1 h-4 w-4" /> Versions ({selectedPrompt.versions || 0})</Button>
                        <Button variant="ghost" size="sm" onClick={handleBranchPrompt}><GitFork className="mr-1 h-4 w-4" /> Branch</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeletePromptRequest(selectedPrompt.id, selectedPrompt.name, "prompt")}><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></Button>
                      </div>
                    </ShadDialogHeader>
                    <div className="p-0"> 
                      <Textarea
                        value={selectedPrompt.content ?? ""}
                        readOnly 
                        className="w-full min-h-[300px] p-4 font-code text-sm bg-background rounded-md border"
                        aria-label="Selected prompt content"
                      />
                      <div className="mt-4 flex justify-end">
                        <Button onClick={handleOpenEditPromptDialog}>Edit Prompt</Button>
                      </div>
                    </div>
                  </ShadDialogContent>
                ) : (
                  renderPropChildren(renderProps)
                )
              )}
            </>
          )}
        </main>
      </SidebarInset>
      <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem onSelect={() => { 
                  const demoPrompt = tree.flatMap(p => 
                      p.type === 'folder' && p.children ? 
                      p.children.filter(c => c.type === 'prompt') : 
                      (p.type === 'prompt' ? [p] : [])
                  ).flat()[0];
                  if(demoPrompt) { handleSelectPrompt(demoPrompt); }
                  else { toast({title: "No prompts to select."}); }
                  setIsSearchOpen(false); 
              }}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Open First Prompt</span>
              </CommandItem>
              <CommandItem onSelect={() => { handleOpenOptimizerDialog(); setIsSearchOpen(false); }}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  <span>Open AI Optimizer</span>
              </CommandItem>
              <CommandItem onSelect={() => { handleOpenNewPromptDialog(); setIsSearchOpen(false); }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span>Create New Item</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Prompts & Folders">
            {tree.flatMap(item => {
                const itemsToRender: JSX.Element[] = []; 
                if (item.type === 'prompt') {
                    itemsToRender.push(
                        <CommandItem key={item.id} onSelect={() => { handleSelectPrompt(item); setIsSearchOpen(false); }}>
                            {React.createElement(item.icon || FileText, {className: "mr-2 h-4 w-4"})}
                            <span>{item.name}</span>
                        </CommandItem>
                    );
                } else if (item.type === 'folder') {
                    itemsToRender.push(
                         <CommandItem key={item.id} onSelect={() => { /* Maybe select folder or toggle? */ setIsSearchOpen(false); }}>
                            {React.createElement(item.icon || Folder, {className: "mr-2 h-4 w-4"})}
                            <span>{item.name} (Folder)</span>
                        </CommandItem>
                    );
                    if (item.children) {
                        item.children.forEach(child => {
                             if (child.type === 'prompt') {
                                itemsToRender.push(
                                    <CommandItem key={child.id} onSelect={() => { handleSelectPrompt(child); setIsSearchOpen(false); }}>
                                        {React.createElement(child.icon || FileText, {className: "mr-2 h-4 w-4 ml-4"})}
                                        <span>{child.name}</span>
                                    </CommandItem>
                                );
                            }
                        });
                    }
                }
                return itemsToRender;
            })}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      <AiOptimizerModal 
        open={isOptimizerOpen} 
        onOpenChange={setIsOptimizerOpen} 
        initialPrompt={optimizerInitialPrompt}
      />
      <NewPromptDialog 
        open={isNewPromptDialogOpen} 
        onOpenChange={setIsNewPromptDialogOpen}
        allPrompts={tree} 
        onCreate={handleCreateNewItem}
      />
      {selectedPrompt && selectedPrompt.type === 'prompt' && (
        <EditPromptDialog
          open={isEditPromptDialogOpen}
          onOpenChange={setIsEditPromptDialogOpen}
          promptName={selectedPrompt.name}
          initialContent={selectedPrompt.content || ""}
          onSave={handleSaveChangesToPrompt}
        />
      )}
      <VersionHistoryDialog
        open={isVersionHistoryDialogOpen}
        onOpenChange={setIsVersionHistoryDialogOpen}
        prompt={promptForHistory}
      />
      {promptToDelete && (
        <AlertDialog open={!!promptToDelete} onOpenChange={() => setPromptToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete "{promptToDelete.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the {promptToDelete.type} {promptToDelete.type === 'folder' ? 'and all its contents' : 'and all its versions'}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPromptToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePrompt} disabled={deleteItemMutation.isPending}>
                {deleteItemMutation.isPending ? <LoadingSpinner size="xs" className="mr-2" /> : null}
                {deleteItemMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </SidebarProvider>
  );
}
