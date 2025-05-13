
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle as ShadDialogTitle
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { optimizePrompt, type PromptOptimizerInput, type PromptOptimizerOutput } from "@/ai/flows/prompt-optimizer";
import { NewPromptDialog, type NewPromptFormValues } from "@/components/dialogs/new-prompt-dialog";
import { EditPromptDialog } from "@/components/dialogs/edit-prompt-dialog";
import { VersionHistoryDialog } from "@/components/dialogs/version-history-dialog";
import { buildPromptTree } from "@/lib/prompt-utils";
import type { ClientPrompt, ClientFolder, ClientPromptVersion, FirebasePrompt, FirebaseFolder, FirebasePromptVersion as FirebasePromptVersionType } from "@/types/app.types";
import {
  Home,
  Settings,
  ChevronDown,
  Search,
  Folder as FolderIcon,
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
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  createPrompt as createPromptAction,
  updatePrompt as updatePromptAction,
  deletePrompt as deletePromptAction,
  getPrompts as getPromptsAction,
  getPromptVersions as getPromptVersionsAction,
  createFolder as createFolderAction,
  getFolders as getFoldersAction,
  deleteFolder as deleteFolderAction,
  updateFolder as updateFolderAction,
  branchPrompt as branchPromptAction
} from "@/actions/firebaseActions";
import {
    importPrompts as importPromptsAction,
    exportPrompts as exportPromptsAction
} from "@/actions/promptActions";


// Helper to convert Firestore Timestamps in fetched data
const convertTimestamps = (data: any) => {
  if (data?.createdAt && typeof data.createdAt === 'object' && data.createdAt.seconds) {
    data.createdAt = new Date(data.createdAt.seconds * 1000);
  }
  if (data?.updatedAt && typeof data.updatedAt === 'object' && data.updatedAt.seconds) {
    data.updatedAt = new Date(data.updatedAt.seconds * 1000);
  }
  if (data?.timestamp && typeof data.timestamp === 'object' && data.timestamp.seconds) { // For versions
    data.timestamp = new Date(data.timestamp.seconds * 1000);
  }

  // Firebase Timestamps are already converted to Date objects by Firestore SDK when fetched
  // This is more for data coming directly from API routes which might be serialized Firestore Timestamps
  if (data?.createdAt && typeof data.createdAt === 'string') {
    data.createdAt = new Date(data.createdAt);
  }
  if (data?.updatedAt && typeof data.updatedAt === 'string') {
    data.updatedAt = new Date(data.updatedAt);
  }
  if (data?.timestamp && typeof data.timestamp === 'string') { // For versions
    data.timestamp = new Date(data.timestamp);
  }

  if (Array.isArray(data)) {
    return data.map(convertTimestamps);
  }

  if (typeof data === 'object' && data !== null) {
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        data[key] = convertTimestamps(data[key]);
      }
    }
  }
  return data;
};


const fetchPrompts = async (): Promise<ClientPrompt[]> => {
  const result = await getPromptsAction();
  if (result.error) throw new Error(result.error);
  if (!result.data) return [];
  return result.data.map(p => ({ ...convertTimestamps(p), type: 'prompt', icon: FileText })) as ClientPrompt[];
};

const fetchFolders = async (): Promise<ClientFolder[]> => {
  const result = await getFoldersAction();
  if (result.error) throw new Error(result.error);
  if (!result.data) return [];
  return result.data.map(f => ({ ...convertTimestamps(f), type: 'folder', icon: FolderIcon })) as ClientFolder[];
};

const fetchPromptVersions = async (promptId: string): Promise<ClientPromptVersion[]> => {
  const result = await getPromptVersionsAction(promptId);
  if (result.error) throw new Error(result.error);
  if (!result.data) return [];
  return result.data.map(v => convertTimestamps(v) as ClientPromptVersion);
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
    if (item.type === "folder" && sidebarState === "expanded") { // Only toggle folder if sidebar is expanded
      handleToggle();
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
        {item.type === "folder" && (item as ClientFolder).children && (item as ClientFolder).children!.length > 0 && sidebarState === 'expanded' && (
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
        <DialogHeader>
         <ShadDialogTitle>AI Prompt Optimizer</ShadDialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter your prompt below to get AI-powered suggestions for improvement.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 px-6">
          <Textarea
            placeholder="Enter your prompt here..."
            value={promptToOptimize}
            onChange={(e) => setPromptToOptimize(e.target.value)}
            className="min-h-[100px] font-code bg-background"
          />
          {isLoading && <div className="flex justify-center items-center p-4"><LoadingSpinner /> <span className="ml-2">Optimizing...</span></div>}
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

export interface MainLayoutChildrenProps {
  openNewPromptDialog: () => void;
  openOptimizerDialog: (initialPrompt?: string) => void;
}

const queryClient = new QueryClient();

export function MainLayoutWrapper({ children }: { children: (props: MainLayoutChildrenProps) => React.ReactNode }) {
    return (
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
            <MainLayout>{children}</MainLayout>
        </QueryClientProvider>
      </AuthProvider>
    )
}


function MainLayout({ children }: { children: (props: MainLayoutChildrenProps) => React.ReactNode }) {
  const { user, signOut, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClientHook = useQueryClient();

  const [selectedItem, setSelectedItem] = React.useState<ClientPrompt | ClientFolder | null>(null);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isOptimizerOpen, setIsOptimizerOpen] = React.useState(false);
  const [optimizerInitialPrompt, setOptimizerInitialPrompt] = React.useState<string | undefined>(undefined);
  const [isNewPromptDialogOpen, setIsNewPromptDialogOpen] = React.useState(false);
  const [isEditPromptDialogOpen, setIsEditPromptDialogOpen] = React.useState(false);
  const [isVersionHistoryDialogOpen, setIsVersionHistoryDialogOpen] = React.useState(false);
  const [promptForHistory, setPromptForHistory] = React.useState<ClientPrompt | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<ClientPrompt | ClientFolder | null>(null);


  const { data: promptsData, isLoading: promptsLoading, error: promptsError } = useQuery<ClientPrompt[]>({
    queryKey: ['prompts', user?.uid],
    queryFn: () => fetchPrompts(),
    enabled: !!user,
  });

  const { data: foldersData, isLoading: foldersLoading, error: foldersError } = useQuery<ClientFolder[]>({
    queryKey: ['folders', user?.uid],
    queryFn: () => fetchFolders(),
    enabled: !!user,
  });

  const { data: versionsData, isLoading: versionsLoading, refetch: refetchVersions } = useQuery<ClientPromptVersion[]>({
    queryKey: ['promptVersions', promptForHistory?.id, user?.uid],
    queryFn: () => promptForHistory ? fetchPromptVersions(promptForHistory.id) : Promise.resolve([]),
    enabled: !!promptForHistory && !!user,
  });


  const promptTree = React.useMemo(() => {
    if (promptsData && foldersData) {
      return buildPromptTree(promptsData, foldersData);
    }
    return [];
  }, [promptsData, foldersData]);


  const createMutation = useMutation({
    mutationFn: async (data: { values: NewPromptFormValues }) => {
      const { values } = data;
      let finalFolderId: string | null = null;

      if (values.saveLocationType === 'new' && values.newFolderName) {
        const folderResult = await createFolderAction({
          name: values.newFolderName,
          parentId: values.newFolderParentId === 'root' ? null : values.newFolderParentId!,
        });
        if (folderResult.error) throw new Error(folderResult.error);
        if (!folderResult.data) throw new Error("Failed to create folder, no data returned.");
        finalFolderId = folderResult.data.id;
      } else if (values.saveLocationType === 'existing') {
        finalFolderId = values.selectedExistingFolderId === 'root' ? null : values.selectedExistingFolderId!;
      }


      const promptPayload = {
        name: values.promptName,
        content: values.promptContent,
        folderId: finalFolderId,
        isFavorite: false, // Default value
      };

      const promptResult = await createPromptAction(promptPayload);
      if (promptResult.error) throw new Error(promptResult.error);
      return promptResult.data;
    },
    onSuccess: (newItem) => {
      queryClientHook.invalidateQueries({ queryKey: ['prompts', user?.uid] });
      queryClientHook.invalidateQueries({ queryKey: ['folders', user?.uid] });
      if (newItem) {
        setSelectedItem(convertTimestamps(newItem) as ClientPrompt);
      }
      setIsNewPromptDialogOpen(false);
      toast({ title: "Success", description: `Prompt "${newItem?.name}" created.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating item", description: error.message, variant: "destructive" });
    }
  });

  const updatePromptMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; content?: string; folderId?: string | null; isFavorite?: boolean; }) => {
      const { id, ...payload } = data;
      const result = await updatePromptAction(id, payload);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (updatedPrompt) => {
      queryClientHook.invalidateQueries({ queryKey: ['prompts', user?.uid] });
      queryClientHook.invalidateQueries({ queryKey: ['promptVersions', updatedPrompt?.id, user?.uid] });
      if (updatedPrompt) {
        setSelectedItem(convertTimestamps(updatedPrompt) as ClientPrompt);
      }
      setIsEditPromptDialogOpen(false);
      toast({ title: "Success", description: `Prompt "${updatedPrompt?.name}" updated.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating prompt", description: error.message, variant: "destructive" });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (item: ClientPrompt | ClientFolder) => {
      if (item.type === 'prompt') {
        const result = await deletePromptAction(item.id);
        if (result.error) throw new Error(result.error);
      } else if (item.type === 'folder') {
        const result = await deleteFolderAction(item.id);
        if (result.error) throw new Error(result.error);
      } else {
        throw new Error("Unsupported item type for deletion.");
      }
      return item.id;
    },
    onSuccess: (deletedItemId) => {
      queryClientHook.invalidateQueries({ queryKey: ['prompts', user?.uid] });
      queryClientHook.invalidateQueries({ queryKey: ['folders', user?.uid] });
      if (selectedItem?.id === deletedItemId) {
        setSelectedItem(null);
      }
      setItemToDelete(null);
      toast({ title: "Success", description: "Item deleted successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting item", description: error.message, variant: "destructive" });
      setItemToDelete(null);
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
    await signOut();
    queryClientHook.clear();
    router.push('/login');
  };


  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: "Import Error", description: "No file selected.", variant: "destructive" });
      return;
    }

    const fileType = file.name.endsWith('.json') ? 'json' : file.name.endsWith('.csv') ? 'csv' : null;
    if (!fileType) {
      toast({ title: "Import Error", description: "Unsupported file type. Please use JSON or CSV.", variant: "destructive" });
      return;
    }

    try {
      const result = await importPromptsAction(file);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({ title: "Import Successful", description: `${result.count} prompts imported.` });
      queryClientHook.invalidateQueries({ queryKey: ['prompts', user?.uid] });
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleExport = async (format: "json" | "csv") => {
    try {
      const result = await exportPromptsAction(format);
      if (result.error) {
        throw new Error(result.error);
      }
      if (result.data) {
        const blob = new Blob([result.data], { type: format === 'json' ? 'application/json' : 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prompts.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Export Successful", description: `Prompts exported as ${format.toUpperCase()}.` });
      }
    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleOpenNewPromptDialog = () => {
    setIsNewPromptDialogOpen(true);
  };

  const handleOpenOptimizerDialog = (initialPromptText?: string) => {
    const promptContentToOptimize = initialPromptText ?? (selectedItem?.type === 'prompt' ? (selectedItem as ClientPrompt).content : "");
    setOptimizerInitialPrompt(promptContentToOptimize);
    setIsOptimizerOpen(true);
  };

  const handleCreateNewItem = (data: NewPromptFormValues) => {
    createMutation.mutate({ values: data });
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
    const currentPrompt = selectedItem as ClientPrompt;
    updatePromptMutation.mutate({
      id: currentPrompt.id,
      content: newContent,
      // name: currentPrompt.name, // Keep existing name unless changed
      // isFavorite: currentPrompt.isFavorite, // Keep existing favorite status unless changed
      // folderId: currentPrompt.folderId // Keep existing folder unless changed
    });
  };

  const handleOpenVersionHistory = () => {
    if (selectedItem && selectedItem.type === 'prompt') {
      setPromptForHistory(selectedItem as ClientPrompt);
      refetchVersions(); // Fetch versions when opening
      setIsVersionHistoryDialogOpen(true);
    } else {
      toast({ title: "Error", description: "Please select a prompt to view its history.", variant: "destructive" });
    }
  };

  const confirmDeleteItem = (item: ClientPrompt | ClientFolder) => {
    setItemToDelete(item);
  };

  const executeDeleteItem = () => {
    if (itemToDelete) {
      deleteItemMutation.mutate(itemToDelete);
    }
  };

  const handleBranchPrompt = async () => {
    if (!selectedItem || selectedItem.type !== 'prompt' || !user) {
      toast({ title: "Cannot Branch", description: "Please select a prompt and ensure you are logged in.", variant: "destructive" });
      return;
    }
    const currentPrompt = selectedItem as ClientPrompt;

    try {
        const result = await branchPromptAction(currentPrompt.id);
        if (result.error || !result.data) {
            throw new Error(result.error || "Failed to branch prompt");
        }
        const createdBranchedPrompt = result.data;
        queryClientHook.invalidateQueries({ queryKey: ['prompts', user?.uid] });
        setSelectedItem(convertTimestamps(createdBranchedPrompt) as ClientPrompt);
        toast({ title: "Prompt Branched", description: `Created branch: "${createdBranchedPrompt.name}".` });

    } catch (error: any) {
        toast({ title: "Branching Error", description: error.message, variant: "destructive" });
    }
  };

  const sidebarWidth = "280px";

  if (authLoading || ((promptsLoading || foldersLoading) && !promptsData && !foldersData && user)) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }
  if (!authLoading && !user && typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
      router.push('/login');
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (promptsError || foldersError) {
    return <div className="flex h-screen items-center justify-center text-destructive">Error loading data: {(promptsError || foldersError)?.message}. Please try refreshing. If the issue persists, check your Firebase configuration.</div>;
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
                  <AvatarImage src={user?.photoURL || `https://picsum.photos/seed/${user?.uid || 'default'}/40/40?grayscale`} alt="User Avatar" data-ai-hint="profile avatar"/>
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
              <DropdownMenuItem onClick={() => toast({ title: "Settings", description: "Settings page not yet implemented."})}><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
               <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                Switch to {theme === "dark" ? "Light" : "Dark"} Mode
              </DropdownMenuItem>
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
             {selectedItem && (
              <Button variant="ghost" size="sm" onClick={() => confirmDeleteItem(selectedItem)} disabled={deleteItemMutation.isPending}>
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => handleOpenOptimizerDialog(selectedItem?.type === 'prompt' ? (selectedItem as ClientPrompt).content : undefined)}>
              <Sparkles className="mr-2 h-4 w-4" /> Optimize
            </Button>

            <Input type="file" id="import-file" className="hidden" onChange={handleImport} accept=".json,.csv"/>
            <Button variant="outline" size="sm" onClick={() => document.getElementById('import-file')?.click()}>
                <UploadCloud className="mr-2 h-4 w-4" /> Import
            </Button>

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
               {/* TODO: Add folder edit/rename functionality here if needed */}
            </div>
          ) : (
            children({ openNewPromptDialog: handleOpenNewPromptDialog, openOptimizerDialog: handleOpenOptimizerDialog })
          )}
        </main>
      </SidebarInset>
      <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogHeader>
          <ShadDialogTitle className="sr-only">Command Menu</ShadDialogTitle>
          <DialogDescription className="sr-only">Use this to search for prompts or execute commands.</DialogDescription>
        </DialogHeader>
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
             .filter(Boolean) // Filter out any null/undefined items, though promptTree should not have them
             .map(item => (
                 <CommandItem key={item.id} onSelect={() => { handleSelectPromptOrFolder(item); setIsSearchOpen(false); }}>
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
        allPrompts={promptsData || []}
        allFolders={foldersData || []}
        onCreate={handleCreateNewItem}
        isCreating={createMutation.isPending}
      />
      {selectedItem && selectedItem.type === 'prompt' && (
        <EditPromptDialog
          open={isEditPromptDialogOpen}
          onOpenChange={setIsEditPromptDialogOpen}
          promptName={selectedItem.name}
          initialContent={(selectedItem as ClientPrompt).content || ""}
          onSave={handleSaveChangesToPrompt}
          isSaving={updatePromptMutation.isPending}
        />
      )}
      <VersionHistoryDialog
        open={isVersionHistoryDialogOpen}
        onOpenChange={setIsVersionHistoryDialogOpen}
        prompt={promptForHistory}
        versions={versionsData || []}
        isLoading={versionsLoading}
      />
      {itemToDelete && (
        <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the item
                "{itemToDelete.name}".
                {itemToDelete.type === 'folder' && (itemToDelete as ClientFolder).children?.length ? ` It also contains ${(itemToDelete as ClientFolder).children!.length} item(s). Deleting a folder will also delete all its contents.` : ''}
                {itemToDelete.type === 'prompt' ? ' All its versions will also be deleted.' : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)} disabled={deleteItemMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeDeleteItem}
                disabled={deleteItemMutation.isPending}
                className={buttonVariants({variant: "destructive"})}
              >
                {deleteItemMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </SidebarProvider>
  );
}

    