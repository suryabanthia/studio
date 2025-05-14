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
import { Dialog, DialogContent, DialogHeader, DialogTitle as ShadDialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { optimizePrompt, type PromptOptimizerInput, type PromptOptimizerOutput } from "@/ai/flows/prompt-optimizer";
import { NewPromptDialog, type NewPromptFormValues } from "@/components/dialogs/new-prompt-dialog";
import { EditPromptDialog } from "@/components/dialogs/edit-prompt-dialog";
import { VersionHistoryDialog } from "@/components/dialogs/version-history-dialog";
import { generateNewId, removeItemFromTree, addPromptToTree, addFolderToTree, updatePromptInTree } from "@/lib/prompt-utils";


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
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoadingSpinner } from "@/components/ui/loading-spinner";


export interface PromptVersion {
  id: string; 
  versionNumber: number;
  content: string;
  timestamp: Date; // Changed from Firebase Timestamp
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
  createdAt?: Date; // Changed from Firebase Timestamp
  updatedAt?: Date; // Changed from Firebase Timestamp
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? <LoadingSpinner size="xs" className="mr-2"/> : null}
            {isLoading ? "Optimizing..." : "Optimize Prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
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


// QueryClient should be initialized once, typically in _app.tsx or Providers component
const queryClient = new QueryClient();

// Wrapper component to provide QueryClient and AuthContext
export function MainLayoutWrapper({ children }: { children: (props: MainLayoutChildrenProps) => React.ReactNode }) {
    return (
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
            <MainLayout>{children}</MainLayout>
        </QueryClientProvider>
      </AuthProvider>
    );
}


export function MainLayout({ children: renderPropChildren }: { children: (props: MainLayoutChildrenProps) => React.ReactNode }) {
  const { user, loading: authLoading, signOut: appSignOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [tree, setTree] = React.useState<Prompt[]>([]); // Local state for prompts/folders
  const [selectedPrompt, setSelectedPrompt] = React.useState<Prompt | null>(null);
  const [isLoadingPrompts, setIsLoadingPrompts] = React.useState(false); // Local loading state
  const [promptsError, setPromptsError] = React.useState<Error | null>(null); // Local error state

  // Effect for redirecting if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user && typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/signup') {
            router.push('/login');
        }
    }
  }, [user, authLoading, router]);
  
  // Placeholder for fetching data locally or from a non-Firebase source if needed
  React.useEffect(() => {
    // Example: Load from localStorage or set mock data
    // setIsLoadingPrompts(true);
    // setTimeout(() => {
    //   setTree([
    //     { id: 'folder-1', name: 'Marketing', type: 'folder', children: [
    //       { id: 'prompt-1', name: 'Ad Copy Generator', type: 'prompt', content: 'Generate ad copy for...', versions: 1, createdAt: new Date(), updatedAt: new Date() }
    //     ], createdAt: new Date(), updatedAt: new Date() },
    //     { id: 'prompt-2', name: 'Welcome Email', type: 'prompt', content: 'Write a welcome email.', versions: 1, createdAt: new Date(), updatedAt: new Date() }
    //   ]);
    //   setIsLoadingPrompts(false);
    // }, 1000);
    setTree([]); // Start with empty tree
    setIsLoadingPrompts(false);
  }, []);


  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isOptimizerOpen, setIsOptimizerOpen] = React.useState(false);
  const [optimizerInitialPrompt, setOptimizerInitialPrompt] = React.useState<string | undefined>(undefined);
  const [isNewPromptDialogOpen, setIsNewPromptDialogOpen] = React.useState(false);
  const [isEditPromptDialogOpen, setIsEditPromptDialogOpen] = React.useState(false);
  const [isVersionHistoryDialogOpen, setIsVersionHistoryDialogOpen] = React.useState(false);
  const [promptForHistory, setPromptForHistory] = React.useState<Prompt | null>(null);
  const [promptToDelete, setPromptToDelete] = React.useState<{id: string, name: string, type: 'prompt' | 'folder'} | null>(null);

  const { setTheme, theme } = useTheme();

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
  
  if (authLoading) {
     return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  // If not logged in and not on login/signup, redirect (handled by useEffect, this is a fallback)
  if (!user && typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /> (Redirecting...)</div>;
  }


  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
  };
  

  const handleCreateNewItem = (data: NewPromptFormValues) => {
    const newPromptId = generateNewId();
    let parentIdForPrompt: string | null = null;
    let newTreeState = [...tree];

    if (data.saveLocationType === "new") {
        const newFolderId = generateNewId();
        const newFolder: Prompt = {
            id: newFolderId,
            name: data.newFolderName!,
            type: 'folder',
            parentId: data.newFolderParentId === 'root' ? null : data.newFolderParentId!,
            children: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        newTreeState = addFolderToTree(newTreeState, newFolder.parentId!, newFolder);
        parentIdForPrompt = newFolderId;
        toast({ title: "Success", description: `Folder "${newFolder.name}" created.` });
    } else {
        parentIdForPrompt = data.selectedExistingFolderId === 'root' ? null : (data.selectedExistingFolderId || null);
    }

    const newPrompt: Prompt = {
        id: newPromptId,
        name: data.promptName,
        content: data.promptContent,
        type: 'prompt',
        parentId: parentIdForPrompt,
        versions: 1,
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    if (parentIdForPrompt) {
        newTreeState = addPromptToTree(newTreeState, parentIdForPrompt, newPrompt);
    } else {
        newTreeState.push(newPrompt);
    }
    
    setTree(newTreeState);
    setSelectedPrompt(newPrompt);
    toast({ title: "Success", description: `Prompt "${newPrompt.name}" created.` });
    setIsNewPromptDialogOpen(false);
  };
  
  const handleSaveChangesToPrompt = (newContent: string) => {
    if (!selectedPrompt || selectedPrompt.type !== 'prompt') return;
    const updatedTree = updatePromptInTree(tree, selectedPrompt.id, newContent);
    const updatedPrompt = updatedTree.flatMap(p => 
        p.id === selectedPrompt.id ? [p] : (p.children ? p.children.filter(c => c.id === selectedPrompt.id) : [])
    ).flat()[0];

    setTree(updatedTree);
    setSelectedPrompt(updatedPrompt || null);
    toast({ title: "Success", description: `Prompt "${selectedPrompt.name}" updated.` });
    setIsEditPromptDialogOpen(false);
  };

  const handleDeletePromptRequest = (promptId: string, promptName: string, itemType: "prompt" | "folder") => {
    setPromptToDelete({id: promptId, name: promptName, type: itemType});
  };

  const confirmDeletePrompt = () => {
    if (promptToDelete) {
      const newTree = removeItemFromTree(tree, promptToDelete.id);
      setTree(newTree);
      toast({ title: "Success", description: `Item "${promptToDelete.name}" deleted.` });
      if (selectedPrompt?.id === promptToDelete.id) {
        setSelectedPrompt(null);
      }
      setPromptToDelete(null);
    }
  };
  
  const handleBranchPrompt = () => {
    if (!selectedPrompt || selectedPrompt.type !== 'prompt') {
      toast({ title: "Cannot Branch", description: "Please select a prompt to branch.", variant: "destructive" });
      return;
    }
    const newId = generateNewId();
    const branchedPrompt: Prompt = {
        ...selectedPrompt,
        id: newId,
        name: `${selectedPrompt.name} (Branch)`,
        versions: 1,
        history: [], // Branched prompt starts with no history from original
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    
    let newTree = [...tree];
    if (branchedPrompt.parentId) {
        newTree = addPromptToTree(newTree, branchedPrompt.parentId, branchedPrompt);
    } else {
        newTree.push(branchedPrompt);
    }
    
    setTree(newTree);
    setSelectedPrompt(branchedPrompt);
    toast({ title: "Prompt Branched", description: `Created branch: "${branchedPrompt.name}".` });
  };

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
    await appSignOut(); // Use the signOut from AuthContext
    // queryClient.clear(); // If using react-query and want to clear cache on logout
    // router.push('/login'); // AuthContext signOut already handles this
  };
  
  const handleOpenLoginDialog = () => router.push('/login');
  const handleOpenSignupDialog = () => router.push('/signup');

  const handleImport = () => {
    toast({ title: "Import Not Implemented", description: "Import functionality is currently disabled." });
  };

  const handleExport = (format: "json" | "csv") => {
     toast({ title: "Export Not Implemented", description: `Export as ${format} functionality is currently disabled.` });
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
                {!isLoadingPrompts && tree.length === 0 && !promptsError && (
                    <SidebarMenuItem>
                        <span className="px-4 py-2 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">No items yet.</span>
                        <BookOpen className="h-4 w-4 mx-auto group-data-[collapsible=icon]:block hidden my-2" />
                    </SidebarMenuItem>
                )}
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
              <DropdownMenuItem onClick={() => router.push('/profile')} disabled> Profile (soon)</DropdownMenuItem> 
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" id="import-button-mainlayout" disabled={!user} onClick={handleImport}>
                  <UploadCloud className="mr-2 h-4 w-4" /> Import
                </Button>
              </DropdownMenuTrigger>
              {/* <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleImport} disabled>
                  Import from File (.json, .csv)
                </DropdownMenuItem>
              </DropdownMenuContent> */}
            </DropdownMenu>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!user}>
                        <DownloadCloud className="mr-2 h-4 w-4" /> Export
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport("json")} disabled>
                        Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("csv")} disabled>
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
             renderPropChildren({ openNewPromptDialog: handleOpenNewPromptDialog, openOptimizerDialog: handleOpenOptimizerDialog, openLoginDialog, openSignupDialog })
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
                  Error loading data: {promptsError.message}.
                </div>
              )}
              {!isLoadingPrompts && !promptsError && (
                selectedPrompt && selectedPrompt.type === 'prompt' ? (
                  <DialogContent className="bg-card p-6 rounded-lg shadow w-full max-w-2xl mx-auto">
                    <DialogHeader className="flex flex-row justify-between items-center mb-4 p-0">
                      <ShadDialogTitle className="text-xl font-semibold">{selectedPrompt.name}</ShadDialogTitle>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenOptimizerDialog(selectedPrompt?.content)}><Sparkles className="mr-1 h-4 w-4" /> Optimize</Button>
                        <Button variant="ghost" size="sm" onClick={handleOpenVersionHistory}><History className="mr-1 h-4 w-4" /> Versions ({selectedPrompt.versions || 0})</Button>
                        <Button variant="ghost" size="sm" onClick={handleBranchPrompt}><GitFork className="mr-1 h-4 w-4" /> Branch</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeletePromptRequest(selectedPrompt.id, selectedPrompt.name, "prompt")}><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" /></Button>
                      </div>
                    </DialogHeader>
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
                  </DialogContent>
                ) : (
                  renderPropChildren({ openNewPromptDialog: handleOpenNewPromptDialog, openOptimizerDialog: handleOpenOptimizerDialog, openLoginDialog, openSignupDialog })
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
                  // Find a demo prompt if available
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
                const items: CommandItem[] = [];
                if (item.type === 'prompt') {
                    items.push(
                        <CommandItem key={item.id} onSelect={() => { handleSelectPrompt(item); setIsSearchOpen(false); }}>
                            {React.createElement(item.icon || FileText, {className: "mr-2 h-4 w-4"})}
                            <span>{item.name}</span>
                        </CommandItem>
                    );
                } else if (item.type === 'folder') {
                    items.push(
                         <CommandItem key={item.id} onSelect={() => { /* Maybe select folder or toggle? */ setIsSearchOpen(false); }}>
                            {React.createElement(item.icon || Folder, {className: "mr-2 h-4 w-4"})}
                            <span>{item.name} (Folder)</span>
                        </CommandItem>
                    );
                    if (item.children) {
                        item.children.forEach(child => {
                             if (child.type === 'prompt') {
                                items.push(
                                    <CommandItem key={child.id} onSelect={() => { handleSelectPrompt(child); setIsSearchOpen(false); }}>
                                        {React.createElement(child.icon || FileText, {className: "mr-2 h-4 w-4 ml-4"})}
                                        <span>{child.name}</span>
                                    </CommandItem>
                                );
                            }
                        });
                    }
                }
                return items;
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
        allPrompts={tree} // Pass local tree
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
        // versions={promptForHistory?.history || []} // Pass local history
        // isLoading={false} // No async loading for local history
      />
      {promptToDelete && (
        <AlertDialog open={!!promptToDelete} onOpenChange={() => setPromptToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete "{promptToDelete.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the item {promptToDelete.type === 'folder' ? 'and all its contents' : 'and all its versions'}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPromptToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePrompt}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </SidebarProvider>
  );
}
