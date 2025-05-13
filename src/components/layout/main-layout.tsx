"use client"

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
  // SidebarMenuSubButton, // Not used directly for prompt tree
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
  AlertDialogTrigger,
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
import { Dialog, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { DialogTitle as ShadDialogTitle } from "@/components/ui/dialog"; // Renamed to avoid conflict
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { optimizePrompt, type PromptOptimizerInput, type PromptOptimizerOutput } from "@/ai/flows/prompt-optimizer";
import { NewPromptDialog, type NewPromptFormValues } from "@/components/dialogs/new-prompt-dialog";
import { EditPromptDialog } from "@/components/dialogs/edit-prompt-dialog";
import { VersionHistoryDialog } from "@/components/dialogs/version-history-dialog";
import { newId, buildPromptTree, addPromptToTree, addFolderToTree, updatePromptInTree, findPromptInTree, findItemPath } from "@/lib/prompt-utils";
import type { FirebasePrompt, FirebaseFolder, FirebasePromptVersion } from "@/types/firebase.types";
import {
  Home,
  Settings,
  LifeBuoy,
  ChevronDown,
  Search,
  Folder as FolderIcon, // Renamed to avoid conflict
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
  Edit3
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Timestamp } from "firebase/firestore";


// Define client-side Prompt type which might include children for tree view
export interface ClientPrompt extends Omit<FirebasePrompt, 'createdAt' | 'updatedAt'> {
  type: 'prompt' | 'folder';
  icon?: React.ElementType;
  children?: ClientPrompt[];
  createdAt: Date; // Convert Firestore Timestamps to Date for client
  updatedAt: Date;
  history?: ClientPromptVersion[]; // For client-side display
}
export interface ClientFolder extends Omit<FirebaseFolder, 'createdAt' | 'updatedAt'> {
  type: 'folder';
  icon?: React.ElementType;
  children?: ClientPrompt[]; // Folders can contain prompts or other folders (represented as ClientPrompt with type 'folder')
  createdAt: Date;
  updatedAt: Date;
}
export interface ClientPromptVersion extends Omit<FirebasePromptVersion, 'timestamp'> {
  timestamp: Date;
}

// Helper to convert Firestore Timestamps in fetched data
const convertTimestamps = (data: any) => {
  if (data?.createdAt && data.createdAt.toDate) {
    data.createdAt = data.createdAt.toDate();
  }
  if (data?.updatedAt && data.updatedAt.toDate) {
    data.updatedAt = data.updatedAt.toDate();
  }
  if (data?.timestamp && data.timestamp.toDate) { // For versions
    data.timestamp = data.timestamp.toDate();
  }
  if (data?.history) {
    data.history = data.history.map(convertTimestamps);
  }
  if (data?.children) {
    data.children = data.children.map(convertTimestamps);
  }
  return data;
};


const fetchPrompts = async (idToken: string | undefined): Promise<ClientPrompt[]> => {
  if (!idToken) throw new Error("Not authenticated");
  const res = await fetch('/api/prompts', { headers: { 'Authorization': `Bearer ${idToken}` } });
  if (!res.ok) throw new Error('Failed to fetch prompts');
  const prompts: FirebasePrompt[] = await res.json();
  return prompts.map(p => ({ ...convertTimestamps(p), type: 'prompt', icon: FileText })) as ClientPrompt[];
};

const fetchFolders = async (idToken: string | undefined): Promise<ClientFolder[]> => {
  if (!idToken) throw new Error("Not authenticated");
  const res = await fetch('/api/folders', { headers: { 'Authorization': `Bearer ${idToken}` } });
  if (!res.ok) throw new Error('Failed to fetch folders');
  const folders: FirebaseFolder[] = await res.json();
  return folders.map(f => ({ ...convertTimestamps(f), type: 'folder', icon: FolderIcon })) as ClientFolder[];
};

const fetchPromptVersions = async (promptId: string, idToken: string | undefined): Promise<ClientPromptVersion[]> => {
  if (!idToken) throw new Error("Not authenticated");
  const res = await fetch(`/api/prompts/${promptId}/versions`, { headers: { 'Authorization': `Bearer ${idToken}` }});
  if (!res.ok) throw new Error('Failed to fetch prompt versions');
  const versions: FirebasePromptVersion[] = await res.json();
  return versions.map(v => convertTimestamps(v) as ClientPromptVersion);
}


const PromptTreeItem: React.FC<{ item: ClientPrompt | ClientFolder; level: number; onSelectPromptOrFolder: (item: ClientPrompt | ClientFolder) => void; selectedItemId?: string }> = ({ item, level, onSelectPromptOrFolder, selectedItemId }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const { state: sidebarState } = useSidebar();

  const handleToggle = () => {
    if (item.type === "folder") {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = () => {
    onSelectPromptOrFolder(item);
    if (item.type === "folder") {
      handleToggle(); // Also toggle folder on select
    }
  };

  const Icon = item.icon || (item.type === "folder" ? FolderIcon : FileText);
  const isActive = selectedItemId === item.id;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleSelect}
        className={`w-full justify-start ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}
        style={{ paddingLeft: `${(level * 1.5) + 0.5}rem` }}
        tooltip={sidebarState === 'collapsed' ? item.name : undefined}
      >
        <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
         { sidebarState === 'expanded' && <span className="truncate flex-grow">{item.name}</span> }
        {(item.type === 'prompt' && (item as ClientPrompt).isFavorite) && <Star className="h-3 w-3 ml-auto text-yellow-400 flex-shrink-0" />}
        {item.type === "folder" && (item as ClientFolder).children && sidebarState === 'expanded' && (
          <ChevronDown className={`h-4 w-4 ml-auto transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
        )}
      </SidebarMenuButton>
      {item.type === "folder" && isOpen && (item as ClientFolder).children && sidebarState === 'expanded' && (
        <SidebarMenuSub>
          {(item as ClientFolder).children!.map((child) => (
            <PromptTreeItem key={child.id} item={child} level={level + 1} onSelectPromptOrFolder={onSelectPromptOrFolder} selectedItemId={selectedItemId}/>
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
      <DialogContent className="sm:max-w-[625px] bg-card">
        <ShadDialogTitle className="sr-only">AI Prompt Optimizer</ShadDialogTitle>
        <div className="flex items-center p-6 pt-0 border-b"><Sparkles className="w-5 h-5 mr-2 text-primary" /> AI Prompt Optimizer</div>
          <DialogDescription className="p-6 pt-2 text-muted-foreground">
            Enter your prompt below to get AI-powered suggestions for improvement.
          </DialogDescription>
        <div className="grid gap-4 py-4 px-6">
          <Textarea
            placeholder="Enter your prompt here..."
            value={promptToOptimize}
            onChange={(e) => setPromptToOptimize(e.target.value)}
            className="min-h-[100px] font-code bg-background"
          />
          {isLoading && <p className="text-sm text-muted-foreground">Optimizing...</p>}
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
        <div className="flex justify-end gap-2 p-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Optimizing..." : "Optimize Prompt"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface MainLayoutChildrenProps {
  openNewPromptDialog: () => void;
  openOptimizerDialog: (initialPrompt?: string) => void;
}

const queryClient = new QueryClient();

export function MainLayoutWrapper({ children }: { children: (props: MainLayoutChildrenProps) => React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <MainLayout>{children}</MainLayout>
        </QueryClientProvider>
    )
}


function MainLayout({ children }: { children: (props: MainLayoutChildrenProps) => React.ReactNode }) {
  const { user, signOut: firebaseSignOut, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClientHook = useQueryClient(); // Using Tanstack Query's client

  const [selectedItem, setSelectedItem] = React.useState<ClientPrompt | ClientFolder | null>(null);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isOptimizerOpen, setIsOptimizerOpen] = React.useState(false);
  const [optimizerInitialPrompt, setOptimizerInitialPrompt] = React.useState<string | undefined>(undefined);
  const [isNewPromptDialogOpen, setIsNewPromptDialogOpen] = React.useState(false);
  const [isEditPromptDialogOpen, setIsEditPromptDialogOpen] = React.useState(false);
  const [isVersionHistoryDialogOpen, setIsVersionHistoryDialogOpen] = React.useState(false);
  const [promptForHistory, setPromptForHistory] = React.useState<ClientPrompt | null>(null);
  const [promptToDelete, setPromptToDelete] = React.useState<ClientPrompt | null>(null);
  
  const [idToken, setIdToken] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (user) {
      user.getIdToken().then(token => setIdToken(token));
    } else {
      setIdToken(undefined);
    }
  }, [user]);


  const { data: promptsData, isLoading: promptsLoading, error: promptsError } = useQuery<ClientPrompt[]>({
    queryKey: ['prompts', user?.uid],
    queryFn: () => fetchPrompts(idToken),
    enabled: !!user && !!idToken,
  });

  const { data: foldersData, isLoading: foldersLoading, error: foldersError } = useQuery<ClientFolder[]>({
    queryKey: ['folders', user?.uid],
    queryFn: () => fetchFolders(idToken),
    enabled: !!user && !!idToken,
  });
  
  const { data: versionsData, isLoading: versionsLoading, refetch: refetchVersions } = useQuery<ClientPromptVersion[]>({
    queryKey: ['promptVersions', promptForHistory?.id, user?.uid],
    queryFn: () => promptForHistory ? fetchPromptVersions(promptForHistory.id, idToken) : Promise.resolve([]),
    enabled: !!promptForHistory && !!user && !!idToken, // Only fetch if a prompt is selected for history
  });


  const promptTree = React.useMemo(() => {
    if (promptsData && foldersData) {
      return buildPromptTree(promptsData, foldersData);
    }
    return [];
  }, [promptsData, foldersData]);


  const createPromptMutation = useMutation({
    mutationFn: async (data: { values: NewPromptFormValues, itemType: 'prompt' | 'folder' }) => {
      if (!idToken) throw new Error("Not authenticated");
      const { values, itemType } = data;
      let endpoint = itemType === 'prompt' ? '/api/prompts' : '/api/folders';
      let payload: any;

      if (itemType === 'prompt') {
        payload = {
          name: values.promptName,
          content: values.promptContent,
          folderId: values.saveLocationType === 'existing' ? values.selectedExistingFolderId : (values.saveLocationType === 'new' && values.newFolderParentId !== 'root' ? values.newFolderParentId : null), // This part needs refinement if new folder is created
          isFavorite: false, // Default
        };
        // If saving into a new folder, we might need to create the folder first, then the prompt.
        // For simplicity, this example assumes if saveLocationType is 'new', it's a new prompt in an existing or root folder,
        // or this mutation is part of a larger flow that handles folder creation.
        // The user schema implies a folderId for prompts.
        if (values.saveLocationType === 'new') {
            // Create folder first
            const folderPayload = { name: values.newFolderName!, parentId: values.newFolderParentId === 'root' ? null : values.newFolderParentId };
            const folderRes = await fetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify(folderPayload),
            });
            if (!folderRes.ok) throw new Error('Failed to create new folder');
            const newFolder = await folderRes.json();
            payload.folderId = newFolder.id; // Assign new folder's ID to the prompt
        }


      } else { // itemType === 'folder' - This case is for creating a standalone folder. NewPromptDialog handles prompt creation with optional new folder.
        payload = { 
            name: values.newFolderName!, // Assuming form has newFolderName for this
            parentId: values.newFolderParentId === 'root' ? null : values.newFolderParentId 
        }; 
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to create ${itemType}`);
      }
      return res.json();
    },
    onSuccess: (newItem) => {
      queryClientHook.invalidateQueries({ queryKey: ['prompts', user?.uid] });
      queryClientHook.invalidateQueries({ queryKey: ['folders', user?.uid] });
      setSelectedItem(convertTimestamps(newItem));
      setIsNewPromptDialogOpen(false);
      toast({ title: "Success", description: `${newItem.type === 'prompt' ? 'Prompt' : 'Folder'} "${newItem.name}" created.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updatePromptMutation = useMutation({
    mutationFn: async (data: { id: string; content: string; name?: string; isFavorite?: boolean; folderId?: string | null }) => {
      if (!idToken) throw new Error("Not authenticated");
      const res = await fetch(`/api/prompts/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ content: data.content, name: data.name, isFavorite: data.isFavorite, folderId: data.folderId }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update prompt');
      }
      return res.json();
    },
    onSuccess: (updatedPrompt) => {
      queryClientHook.invalidateQueries({ queryKey: ['prompts', user?.uid] });
      queryClientHook.invalidateQueries({ queryKey: ['promptVersions', updatedPrompt.id, user?.uid] }); // Invalidate versions too
      setSelectedItem(convertTimestamps(updatedPrompt));
      setIsEditPromptDialogOpen(false);
      toast({ title: "Success", description: `Prompt "${updatedPrompt.name}" updated to version ${updatedPrompt.versions}.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deletePromptMutation = useMutation({
    mutationFn: async (promptId: string) => {
      if (!idToken) throw new Error("Not authenticated");
      const res = await fetch(`/api/prompts/${promptId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete prompt');
      }
      return promptId;
    },
    onSuccess: (deletedPromptId) => {
      queryClientHook.invalidateQueries({ queryKey: ['prompts', user?.uid] });
      if (selectedItem?.id === deletedPromptId) {
        setSelectedItem(null);
      }
      setPromptToDelete(null);
      toast({ title: "Success", description: "Prompt deleted successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setPromptToDelete(null);
    }
  });


  const { setTheme, theme } = useTheme();
  const { toast } = useToast();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsSearchOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSelectPromptOrFolder = (item: ClientPrompt | ClientFolder) => {
    setSelectedItem(item);
  };


  const handleLogout = async () => {
    await firebaseSignOut();
    queryClientHook.clear(); // Clear React Query cache on logout
    router.push('/login');
  };
  

  const handleImport = () => { /* ... existing import logic, adapted for Firebase if necessary ... */ toast({title: "Not Implemented", description: "Import from file needs to be adapted for Firebase."})};
  const handleExport = (format: "json" | "csv") => { /* ... existing export logic, adapted for Firebase if necessary ... */ toast({title: "Not Implemented", description: `Export to ${format} needs to be adapted for Firebase.`})};
  
  const handleOpenNewPromptDialog = () => {
    setIsNewPromptDialogOpen(true);
  };

  const handleOpenOptimizerDialog = (initialPromptText?: string) => {
    const promptContentToOptimize = initialPromptText ?? (selectedItem?.type === 'prompt' ? (selectedItem as ClientPrompt).content : "");
    setOptimizerInitialPrompt(promptContentToOptimize);
    setIsOptimizerOpen(true);
  };

  const handleCreateNewItem = (data: NewPromptFormValues) => {
    createPromptMutation.mutate({ values: data, itemType: 'prompt' }); // Simplified: assumes creating a prompt. Folder creation is separate or part of this flow.
  };

  const handleOpenEditPromptDialog = () => {
    if (selectedItem && selectedItem.type === 'prompt') {
      setIsEditPromptDialogOpen(true);
    } else {
      toast({ title: "Error", description: "Please select a prompt to edit.", variant: "destructive" });
    }
  };

  const handleSaveChangesToPrompt = (newContent: string) => {
    if (!selectedItem || selectedItem.type !== 'prompt') return;
    updatePromptMutation.mutate({ id: selectedItem.id, content: newContent, name: selectedItem.name, isFavorite: (selectedItem as ClientPrompt).isFavorite, folderId: (selectedItem as ClientPrompt).folderId });
  };

  const handleOpenVersionHistory = () => {
    if (selectedItem && selectedItem.type === 'prompt') {
      setPromptForHistory(selectedItem as ClientPrompt);
      setIsVersionHistoryDialogOpen(true);
    } else {
      toast({ title: "Error", description: "Please select a prompt to view its history.", variant: "destructive" });
    }
  };

  const confirmDeletePrompt = (prompt: ClientPrompt) => {
    setPromptToDelete(prompt);
  };

  const executeDeletePrompt = () => {
    if (promptToDelete) {
      deletePromptMutation.mutate(promptToDelete.id);
    }
  };
  
  const handleBranchPrompt = async () => {
    if (!selectedItem || selectedItem.type !== 'prompt' || !idToken) {
      toast({ title: "Cannot Branch", description: "Please select a prompt and ensure you are logged in.", variant: "destructive" });
      return;
    }
    const currentPrompt = selectedItem as ClientPrompt;
    const branchedPromptName = `${currentPrompt.name} - Branch`;
  
    const newBranchedPromptData: Omit<FirebasePrompt, 'id' | 'createdAt' | 'updatedAt' | 'versions' | 'history'> & { folderId: string | null } = {
      userId: user!.uid,
      name: branchedPromptName,
      content: currentPrompt.content,
      folderId: currentPrompt.folderId, // Branch in the same folder
      isFavorite: currentPrompt.isFavorite,
    };
    
    try {
        // Simulate what createPromptMutation does for the payload part
        const res = await fetch('/api/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify(newBranchedPromptData),
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `Failed to create branched prompt`);
        }
        const createdBranchedPrompt = await res.json();
        queryClientHook.invalidateQueries({ queryKey: ['prompts', user?.uid] });
        setSelectedItem(convertTimestamps(createdBranchedPrompt));
        toast({ title: "Prompt Branched", description: `Created branch: "${createdBranchedPrompt.name}".` });

    } catch (error: any) {
        toast({ title: "Branching Error", description: error.message, variant: "destructive" });
    }
  };

  const sidebarWidth = "280px";

  if (authLoading || (promptsLoading && foldersLoading && !promptsData && !foldersData)) { // Show loading if auth or initial data is loading
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }
  if (promptsError || foldersError) {
    return <div className="flex h-screen items-center justify-center text-destructive">Error loading data: {(promptsError || foldersError)?.message}</div>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
       <style jsx global>{`
        :root {
          --sidebar-width: ${sidebarWidth} !important;
        }
      `}</style>
      <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border">
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
                <SidebarGroupLabel tooltip="Prompts & Folders" className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-2"/> Items
                </SidebarGroupLabel>
                 {promptTree.map((item) => (
                  <PromptTreeItem key={item.id} item={item} level={0} onSelectPromptOrFolder={handleSelectPromptOrFolder} selectedItemId={selectedItem?.id}/>
                ))}
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel tooltip="Tools" className="flex items-center"> Tools </SidebarGroupLabel>
                 <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => handleOpenOptimizerDialog()} tooltip="AI Optimizer">
                      <Sparkles className="h-4 w-4" /> <span className="truncate">AI Optimizer</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
              </SidebarGroup>
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border group-data-[collapsible=icon]:p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src="https://picsum.photos/40/40?grayscale" alt="User Avatar" data-ai-hint="profile avatar"/>
                  <AvatarFallback>{user?.email?.substring(0,2).toUpperCase() || 'PV'}</AvatarFallback>
                </Avatar>
                <div className="truncate group-data-[collapsible=icon]:hidden">
                  <p className="font-semibold text-sm">{user?.displayName || user?.email?.split('@')[0] || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || "user@promptverse.ai"}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 bg-popover">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* <DropdownMenuItem> Profile</DropdownMenuItem>  */}
              <DropdownMenuItem onClick={() => toast({ title: "Settings", description: "Settings page not yet implemented."})}><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
               <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                Switch to {theme === "dark" ? "Light" : "Dark"} Mode
              </DropdownMenuItem>
              {/* <DropdownMenuItem><LifeBuoy className="mr-2 h-4 w-4" /> Help & Support</DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex items-center h-[72px] border-b bg-background px-6 shadow-sm">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">
              {selectedItem ? selectedItem.name : "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
             {selectedItem && selectedItem.type === 'prompt' && (
              <Button variant="ghost" size="sm" onClick={() => confirmDeletePrompt(selectedItem as ClientPrompt)}>
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => handleOpenOptimizerDialog(selectedItem?.type === 'prompt' ? (selectedItem as ClientPrompt).content : undefined)}>
              <Sparkles className="mr-2 h-4 w-4" /> Optimize
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <UploadCloud className="mr-2 h-4 w-4" /> Import
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleImport}>
                   Import from File (.json, .csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <DownloadCloud className="mr-2 h-4 w-4" /> Export
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport("json")}>
                        Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("csv")}>
                        Export as CSV
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={handleOpenNewPromptDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> New
            </Button>
             <SidebarTrigger className="md:hidden" />
          </div>
        </header>

        <main className="flex-1 p-6">
           {selectedItem && selectedItem.type === 'prompt' ? (
            <div className="bg-card p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{selectedItem.name}</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenOptimizerDialog((selectedItem as ClientPrompt).content)}><Sparkles className="mr-1 h-4 w-4" /> Optimize</Button>
                  <Button variant="ghost" size="sm" onClick={handleOpenVersionHistory}><History className="mr-1 h-4 w-4" /> Versions ({(selectedItem as ClientPrompt).versions || 0})</Button>
                   <Button variant="ghost" size="sm" onClick={handleBranchPrompt} disabled={!selectedItem || selectedItem.type !== 'prompt'}><GitFork className="mr-1 h-4 w-4" /> Branch</Button>
                </div>
              </div>
              <Textarea
                value={(selectedItem as ClientPrompt).content ?? ""}
                readOnly 
                className="w-full min-h-[300px] p-4 font-code text-sm bg-background rounded-md border"
              />
               <div className="mt-4 flex justify-end">
                <Button onClick={handleOpenEditPromptDialog}><Edit3 className="mr-2 h-4 w-4" />Edit Prompt</Button>
              </div>
            </div>
          ) : selectedItem && selectedItem.type === 'folder' ? (
            <div className="bg-card p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-2">Folder: {selectedItem.name}</h3>
              <p className="text-muted-foreground">Contains {(selectedItem as ClientFolder).children?.length || 0} item(s).</p>
              {/* Add folder specific actions here if needed */}
            </div>
          ) : (
            children({ openNewPromptDialog: handleOpenNewPromptDialog, openOptimizerDialog: handleOpenOptimizerDialog })
          )}
        </main>
      </SidebarInset>
      <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <ShadDialogTitle className="sr-only">Command Menu</ShadDialogTitle>
        <DialogDescription className="sr-only">Use this to search for prompts or execute commands.</DialogDescription>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem onSelect={() => { 
                const demoPrompt = promptsData?.find(p => p.name === "Ad Copy Generator");
                if(demoPrompt) { handleSelectPromptOrFolder(demoPrompt); }
                setIsSearchOpen(false); 
            }}>
                <FileText className="mr-2 h-4 w-4" />
                <span>Open "Ad Copy Generator"</span>
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
             {promptTree.flatMap(item => item.type === 'folder' && (item as ClientFolder).children ? (item as ClientFolder).children! : [item] )
             .map(item => (
                 item && <CommandItem key={item.id} onSelect={() => { handleSelectPromptOrFolder(item); setIsSearchOpen(false); }}>
                    {React.createElement(item.icon || (item.type === 'folder' ? FolderIcon : FileText), {className: "mr-2 h-4 w-4"})}
                    <span>{item.name}</span>
                 </CommandItem>
             ))}
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
        // Pass flat lists for populating selectors, tree is for display only in sidebar
        allPrompts={promptsData || []} 
        allFolders={foldersData || []}
        onCreate={handleCreateNewItem}
      />
      {selectedItem && selectedItem.type === 'prompt' && (
        <EditPromptDialog
          open={isEditPromptDialogOpen}
          onOpenChange={setIsEditPromptDialogOpen}
          promptName={selectedItem.name}
          initialContent={(selectedItem as ClientPrompt).content || ""}
          onSave={handleSaveChangesToPrompt}
        />
      )}
      <VersionHistoryDialog
        open={isVersionHistoryDialogOpen}
        onOpenChange={setIsVersionHistoryDialogOpen}
        prompt={promptForHistory}
        versions={versionsData || []} // Pass fetched versions
        isLoading={versionsLoading}
      />
      {promptToDelete && (
        <AlertDialog open={!!promptToDelete} onOpenChange={() => setPromptToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the prompt
                "{promptToDelete.name}" and all its versions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPromptToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={executeDeletePrompt} disabled={deletePromptMutation.isPending}>
                {deletePromptMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </SidebarProvider>
  );
}
