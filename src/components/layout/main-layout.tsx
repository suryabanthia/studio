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
import { Dialog, DialogContent, DialogHeader, DialogTitle as ShadDialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { optimizePrompt, type PromptOptimizerInput, type PromptOptimizerOutput } from "@/ai/flows/prompt-optimizer";
import { NewPromptDialog, type NewPromptFormValues } from "@/components/dialogs/new-prompt-dialog";
import { EditPromptDialog } from "@/components/dialogs/edit-prompt-dialog";
import { VersionHistoryDialog } from "@/components/dialogs/version-history-dialog";
import { newId as generateNewId, addPromptToTreeStructure, addFolderToTreeStructure, updatePromptInTreeStructure, addPromptNextToSiblingInTree, findPromptInTree, removePromptFromTreeStructure } from "@/lib/prompt-utils";
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
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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


export interface PromptVersion {
  id: string; // Firestore document ID for the version
  versionNumber: number;
  content: string;
  timestamp: Timestamp | Date; // Allow Date for optimistic updates, convert to Timestamp for Firebase
  userId?: string; // Denormalized for potential direct queries if needed
  promptId?: string; // Parent prompt ID
}

export interface Prompt {
  id: string; // Firestore document ID
  name: string;
  type: "folder" | "prompt";
  icon?: React.ElementType;
  children?: Prompt[];
  versions?: number;
  isFavorite?: boolean;
  content?: string;
  history?: PromptVersion[];
  userId?: string;
  parentId?: string | null; // For folder hierarchy
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}


// Helper to convert Firestore Timestamps in fetched data
const convertTimestamps = (data: any): any => {
  if (data instanceof Timestamp) {
    return data.toDate();
  }
  if (Array.isArray(data)) {
    return data.map(convertTimestamps);
  }
  if (data && typeof data === 'object') {
    const res: { [key: string]: any } = {};
    for (const key in data) {
      res[key] = convertTimestamps(data[key]);
    }
    return res;
  }
  return data;
};


const PromptTreeItem: React.FC<{ 
  item: Prompt; 
  level: number; 
  onSelectPrompt: (prompt: Prompt) => void; 
  selectedPromptId?: string;
  onDeletePrompt: (promptId: string, promptName: string) => void;
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
    e.stopPropagation(); // Prevent selection when clicking delete
    onDeletePrompt(item.id, item.name);
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
      <DialogContent className="sm:max-w-[625px] bg-card">
        <DialogHeader>
          <ShadDialogTitle className="flex items-center"><Sparkles className="w-5 h-5 mr-2 text-primary" /> AI Prompt Optimizer</ShadDialogTitle>
          <DialogDescription>
            Enter your prompt below to get AI-powered suggestions for improvement.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Enter your prompt here..."
            value={promptToOptimize}
            onChange={(e) => setPromptToOptimize(e.target.value)}
            className="min-h-[100px] font-code bg-background"
            aria-label="Prompt to optimize"
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Optimizing..." : "Optimize Prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface MainLayoutChildrenProps {
  openNewPromptDialog: () => void;
  openOptimizerDialog: (initialPrompt?: string) => void;
  openLoginDialog?: () => void; 
  openSignupDialog?: () => void; 
}
export type PageRenderProps = MainLayoutChildrenProps;

const queryClient = new QueryClient();


export function MainLayout({ children }: { children: (props: MainLayoutChildrenProps) => React.ReactNode }) {
  const { user, loading: authLoading, signOut: firebaseSignOut } = useAuth();
  const router = useRouter();
  const queryClientTanstack = useQueryClient();


  const { data: promptsData, isLoading: isLoadingPrompts, error: promptsError } = useQuery<{ prompts: Prompt[], folders: Prompt[] }, Error>({
    queryKey: ['promptsAndFolders', user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error("User not authenticated");
      const fetchedPrompts = await getPromptsAction(user.uid);
      const fetchedFolders = await getFoldersAction(user.uid);
      // Combine prompts and folders, then build hierarchy
      // For now, returning them separately, hierarchy building can be client-side or server-side
      return { 
        prompts: convertTimestamps(fetchedPrompts), 
        folders: convertTimestamps(fetchedFolders) 
      };
    },
    enabled: !!user, // Only run if user is logged in
  });
  
  const [tree, setTree] = React.useState<Prompt[]>([]);

  React.useEffect(() => {
    if (promptsData) {
      // Basic hierarchy building: assign prompts to folders
      const folderMap = new Map<string, Prompt>();
      promptsData.folders.forEach(f => folderMap.set(f.id, { ...f, children: [] }));
      
      const rootPrompts: Prompt[] = [];
      promptsData.prompts.forEach(p => {
        if (p.parentId && folderMap.has(p.parentId)) {
          folderMap.get(p.parentId)!.children!.push(p);
        } else {
          rootPrompts.push(p);
        }
      });
      
      const rootFolders = promptsData.folders.filter(f => !f.parentId || !folderMap.has(f.parentId));
      setTree([...rootFolders, ...rootPrompts]);
    } else if (!isLoadingPrompts && !user) {
      setTree([]); // Clear tree if user logs out or no data
    }
  }, [promptsData, isLoadingPrompts, user]);


  const [selectedPrompt, setSelectedPrompt] = React.useState<Prompt | null>(null);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isOptimizerOpen, setIsOptimizerOpen] = React.useState(false);
  const [optimizerInitialPrompt, setOptimizerInitialPrompt] = React.useState<string | undefined>(undefined);
  const [isNewPromptDialogOpen, setIsNewPromptDialogOpen] = React.useState(false);
  const [isEditPromptDialogOpen, setIsEditPromptDialogOpen] = React.useState(false);
  const [isVersionHistoryDialogOpen, setIsVersionHistoryDialogOpen] = React.useState(false);
  const [promptForHistory, setPromptForHistory] = React.useState<Prompt | null>(null);
  const [promptToDelete, setPromptToDelete] = React.useState<{id: string, name: string} | null>(null);


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
  }, []);

  // Redirect to login if not authenticated and not on auth pages
   React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!authLoading && !user && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);


  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
  };
  
  const createMutation = useMutation({
    mutationFn: createPromptAction,
    onSuccess: (newPrompt) => {
      queryClientTanstack.invalidateQueries({ queryKey: ['promptsAndFolders', user?.uid] });
      toast({ title: "Success", description: `Prompt "${newPrompt.name}" created successfully.` });
      setSelectedPrompt(newPrompt);
      setIsNewPromptDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to create prompt: ${error.message}`, variant: "destructive" });
    }
  });

  const createFolderMutation = useMutation({
    mutationFn: createFolderAction,
    onSuccess: (newFolder) => {
      queryClientTanstack.invalidateQueries({ queryKey: ['promptsAndFolders', user?.uid] });
      toast({ title: "Success", description: `Folder "${newFolder.name}" created successfully.` });
      setIsNewPromptDialogOpen(false); // Assuming the same dialog is used
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to create folder: ${error.message}`, variant: "destructive" });
    }
  });


  const handleCreateNewItem = async (data: NewPromptFormValues) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create items.", variant: "destructive" });
      return;
    }
  
    if (data.saveLocationType === "new") {
      // Create new folder first, then the prompt inside it
      try {
        const newFolder = await createFolderMutation.mutateAsync({
          name: data.newFolderName!,
          parentId: data.newFolderParentId === 'root' ? null : data.newFolderParentId!,
          userId: user.uid,
        });
        // Now create the prompt within this new folder
        createMutation.mutate({
          name: data.promptName,
          content: data.promptContent,
          parentId: newFolder.id, // ID of the newly created folder
          userId: user.uid,
          type: "prompt",
        });
      } catch (error) {
        // Error already handled by createFolderMutation.onError
      }
    } else {
      // Create prompt in existing folder or root
      createMutation.mutate({
        name: data.promptName,
        content: data.promptContent,
        parentId: data.selectedExistingFolderId === 'root' ? null : data.selectedExistingFolderId,
        userId: user.uid,
        type: "prompt",
      });
    }
  };
  
  const updateMutation = useMutation({
    mutationFn: updatePromptAction,
    onSuccess: (updatedPrompt) => {
      queryClientTanstack.invalidateQueries({ queryKey: ['promptsAndFolders', user?.uid] });
      queryClientTanstack.invalidateQueries({ queryKey: ['promptVersions', updatedPrompt?.id] });
      toast({ title: "Success", description: `Prompt "${updatedPrompt?.name}" updated to version ${updatedPrompt?.versions}.` });
      setSelectedPrompt(updatedPrompt ?? null);
      setIsEditPromptDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to update prompt: ${error.message}`, variant: "destructive" });
    }
  });

  const handleSaveChangesToPrompt = (newContent: string) => {
    if (!selectedPrompt || !user) return;
    updateMutation.mutate({ promptId: selectedPrompt.id, newContent, userId: user.uid });
  };

  const deleteMutation = useMutation({
    mutationFn: deletePromptAction,
    onSuccess: (_, variables) => {
      queryClientTanstack.invalidateQueries({ queryKey: ['promptsAndFolders', user?.uid] });
      toast({ title: "Success", description: `Item "${variables.promptName}" deleted.` });
      if (selectedPrompt?.id === variables.promptId) {
        setSelectedPrompt(null);
      }
      setPromptToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to delete item: ${error.message}`, variant: "destructive" });
      setPromptToDelete(null);
    }
  });

  const handleDeletePromptRequest = (promptId: string, promptName: string) => {
    setPromptToDelete({id: promptId, name: promptName});
  };

  const confirmDeletePrompt = () => {
    if (promptToDelete && user) {
      deleteMutation.mutate({ promptId: promptToDelete.id, userId: user.uid, promptName: promptToDelete.name });
    }
  };
  
  const branchMutation = useMutation({
    mutationFn: branchPromptAction,
    onSuccess: (newBranchedPrompt) => {
      queryClientTanstack.invalidateQueries({ queryKey: ['promptsAndFolders', user?.uid] });
      toast({ title: "Prompt Branched", description: `Created branch: "${newBranchedPrompt.name}".` });
      setSelectedPrompt(newBranchedPrompt);
    },
    onError: (error: Error) => {
      toast({ title: "Branch Failed", description: error.message, variant: "destructive" });
    }
  });

  const handleBranchPrompt = () => {
    if (!selectedPrompt || selectedPrompt.type !== 'prompt' || !user) {
      toast({ title: "Cannot Branch", description: "Please select a prompt to branch.", variant: "destructive" });
      return;
    }
    branchMutation.mutate({
        originalPrompt: selectedPrompt,
        userId: user.uid,
        newId: generateNewId() 
    });
  };

  const { data: versionHistoryData, isLoading: isLoadingVersions } = useQuery<PromptVersion[], Error>({
    queryKey: ['promptVersions', promptForHistory?.id],
    queryFn: async () => {
      if (!promptForHistory?.id || !user?.uid) throw new Error("Prompt ID or User ID is missing");
      const versions = await getPromptVersionsAction({ promptId: promptForHistory.id, userId: user.uid });
      return convertTimestamps(versions);
    },
    enabled: !!promptForHistory && !!user?.uid && isVersionHistoryDialogOpen, // only fetch when dialog is open and prompt is selected
  });


  const handleOpenVersionHistory = () => {
    if (selectedPrompt && selectedPrompt.type === 'prompt') {
      setPromptForHistory(selectedPrompt); // This will trigger the query if dialog opens
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
    await firebaseSignOut();
    queryClientTanstack.clear(); // Clear react-query cache on logout
    router.push('/login');
  };
  
  const handleOpenLoginDialog = () => router.push('/login');
  const handleOpenSignupDialog = () => router.push('/signup');

  const exportMutation = useMutation({
    mutationFn: (format: "json" | "csv") => {
      if (!user?.uid) throw new Error("User not authenticated for export.");
      return exportPromptsAction({ userId: user.uid, format });
    },
    onSuccess: (data) => {
      const { dataString, fileExtension, mimeType } = data;
      const blob = new Blob([dataString], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `promptverse_export_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Export Successful", description: `Prompts exported to ${fileExtension}.` });
    },
    onError: (error: Error) => {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    }
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      if (!user?.uid) throw new Error("User not authenticated for import.");
      return importPromptsAction({ userId: user.uid, file });
    },
    onSuccess: (count) => {
      queryClientTanstack.invalidateQueries({ queryKey: ['promptsAndFolders', user?.uid] });
      toast({ title: "Import Successful", description: `${count} items imported successfully.` });
    },
    onError: (error: Error) => {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    }
  });

  const handleImport = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json, .csv";
    fileInput.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        importMutation.mutate(file);
      }
    };
    fileInput.click();
  };


  const sidebarWidth = "280px";
  
  // Loading state for initial auth check or if user is null and not on auth pages
  if (authLoading || (!user && typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/signup')) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }


  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
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
                    {!isLoadingPrompts && tree.map((item) => (
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
                        <SidebarMenuButton onClick={() => handleOpenOptimizerDialog()} tooltip="AI Optimizer">
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
                  <DropdownMenuItem onClick={() => router.push('/profile')}> Profile</DropdownMenuItem> 
                  <DropdownMenuItem onClick={() => router.push('/settings')}><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                    Switch to {theme === "dark" ? "Light" : "Dark"} Mode
                  </DropdownMenuItem>
                  <DropdownMenuItem><LifeBuoy className="mr-2 h-4 w-4" /> Help & Support</DropdownMenuItem>
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
                  {selectedPrompt ? selectedPrompt.name : "Dashboard"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleOpenOptimizerDialog(selectedPrompt?.content)} disabled={!user}>
                  <Sparkles className="mr-2 h-4 w-4" /> Optimize
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!user || importMutation.isPending}>
                      <UploadCloud className="mr-2 h-4 w-4" /> Import {importMutation.isPending && <LoadingSpinner size="xs" className="ml-1" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleImport} disabled={importMutation.isPending}>
                      Import from File (.json, .csv)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={!user || exportMutation.isPending}>
                            <DownloadCloud className="mr-2 h-4 w-4" /> Export {exportMutation.isPending && <LoadingSpinner size="xs" className="ml-1" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => exportMutation.mutate("json")} disabled={exportMutation.isPending}>
                            Export as JSON
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportMutation.mutate("csv")} disabled={exportMutation.isPending}>
                            Export as CSV
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" onClick={handleOpenNewPromptDialog} disabled={!user || createMutation.isPending || createFolderMutation.isPending}>
                  <PlusCircle className="mr-2 h-4 w-4" /> New Item
                </Button>
                <SidebarTrigger className="md:hidden" />
              </div>
            </header>

            <main className="flex-1 p-6">
              {authLoading && <div className="flex items-center justify-center h-full"><LoadingSpinner size="lg" /></div>}
              {!authLoading && !user && (
                <div className="flex flex-col items-center justify-center text-center p-6">
                  <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
                    Please <Link href="/login" className="text-primary hover:underline">login</Link> or <Link href="/signup" className="text-primary hover:underline">sign up</Link> to manage your prompts.
                  </p>
                </div>
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
                      <Card className="bg-card p-6 rounded-lg shadow">
                        <CardHeader className="flex flex-row justify-between items-center mb-4 p-0">
                          <ShadDialogTitle className="text-xl font-semibold">{selectedPrompt.name}</ShadDialogTitle>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenOptimizerDialog(selectedPrompt?.content)}><Sparkles className="mr-1 h-4 w-4" /> Optimize</Button>
                            <Button variant="ghost" size="sm" onClick={handleOpenVersionHistory}><History className="mr-1 h-4 w-4" /> Versions ({selectedPrompt.versions || 0})</Button>
                            <Button variant="ghost" size="sm" onClick={handleBranchPrompt} disabled={!selectedPrompt || selectedPrompt.type !== 'prompt' || branchMutation.isPending}><GitFork className="mr-1 h-4 w-4" /> Branch {branchMutation.isPending && <LoadingSpinner size="xs" className="ml-1"/>}</Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeletePromptRequest(selectedPrompt.id, selectedPrompt.name)}><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <Textarea
                            value={selectedPrompt.content ?? ""}
                            readOnly 
                            className="w-full min-h-[300px] p-4 font-code text-sm bg-background rounded-md border"
                            aria-label="Selected prompt content"
                          />
                          <div className="mt-4 flex justify-end">
                            <Button onClick={handleOpenEditPromptDialog} disabled={updateMutation.isPending}>Edit Prompt {updateMutation.isPending && <LoadingSpinner size="xs" className="ml-1"/>}</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      children({ openNewPromptDialog: handleOpenNewPromptDialog, openOptimizerDialog: handleOpenOptimizerDialog, openLoginDialog, openSignupDialog })
                    )
                  )}
                </>
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
                    const demoPrompt = tree.flatMap(p => 
                        p.type === 'folder' && p.children ? 
                        p.children.filter(c => c.name === 'Ad Copy Generator' && c.type === 'prompt') : 
                        (p.name === 'Ad Copy Generator' && p.type === 'prompt' ? [p] : [])
                    ).flat()[0];
                    if(demoPrompt) { handleSelectPrompt(demoPrompt); }
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
                {tree.flatMap(item => item.type === 'folder' && item.children ? 
                    item.children : 
                    (item.type === 'prompt' ? [item] : []) // Only show prompts in search for now, or add folder searching
                ).map(prompt => (
                    prompt && <CommandItem key={prompt.id} onSelect={() => { handleSelectPrompt(prompt); setIsSearchOpen(false); }}>
                        {React.createElement(prompt.icon || FileText, {className: "mr-2 h-4 w-4"})}
                        <span>{prompt.name}</span>
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
            allPrompts={tree}
            onCreate={handleCreateNewItem}
            isLoading={createMutation.isPending || createFolderMutation.isPending}
          />
          {selectedPrompt && selectedPrompt.type === 'prompt' && (
            <EditPromptDialog
              open={isEditPromptDialogOpen}
              onOpenChange={setIsEditPromptDialogOpen}
              promptName={selectedPrompt.name}
              initialContent={selectedPrompt.content || ""}
              onSave={handleSaveChangesToPrompt}
              isLoading={updateMutation.isPending}
            />
          )}
          <VersionHistoryDialog
            open={isVersionHistoryDialogOpen}
            onOpenChange={setIsVersionHistoryDialogOpen}
            prompt={promptForHistory} // This is the currently selected prompt
            versions={versionHistoryData || []} // Pass fetched versions
            isLoading={isLoadingVersions}
          />
          {promptToDelete && (
            <AlertDialog open={!!promptToDelete} onOpenChange={() => setPromptToDelete(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to delete "{promptToDelete.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the item and all its associated data (including versions or nested items if it's a folder).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setPromptToDelete(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDeletePrompt} disabled={deleteMutation.isPending}>
                    {deleteMutation.isPending ? <><LoadingSpinner size="xs" className="mr-2"/> Deleting...</> : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </SidebarProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}