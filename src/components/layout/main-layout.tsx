
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
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { optimizePrompt, type PromptOptimizerInput, type PromptOptimizerOutput } from "@/ai/flows/prompt-optimizer";
import { NewPromptDialog, type NewPromptFormValues } from "@/components/dialogs/new-prompt-dialog";
import { EditPromptDialog } from "@/components/dialogs/edit-prompt-dialog";
import { VersionHistoryDialog } from "@/components/dialogs/version-history-dialog";
import { newId, addPromptToTree, addFolderToTree, updatePromptInTree } from "@/lib/prompt-utils";
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
  Star
} from "lucide-react";
import { useTheme } from "next-themes";

export interface PromptVersion {
  versionNumber: number;
  content: string;
  timestamp: Date;
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
}


const initialMockPrompts: Prompt[] = [
  {
    id: "1",
    name: "Marketing",
    type: "folder",
    icon: Folder,
    children: [
      { 
        id: "1-1", 
        name: "Ad Copy Generator", 
        type: "prompt", 
        icon: FileText, 
        versions: 3, 
        content: "Generate ad copy for {{product}} - V3",
        history: [
          { versionNumber: 2, content: "Generate ad copy for {{product}} - V2", timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
          { versionNumber: 1, content: "Generate ad copy for {{product}} - V1", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        ]
      },
      { 
        id: "1-2", 
        name: "Email Campaigns", 
        type: "folder", 
        icon: Folder, 
        children: [
          { 
            id: "1-2-1", 
            name: "Welcome Email", 
            type: "prompt", 
            icon: FileText, 
            versions: 2, 
            isFavorite: true, 
            content: "Write a welcome email for new subscribers. - V2",
            history: [
              { versionNumber: 1, content: "Write a welcome email for new subscribers. - V1", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
            ]
          }
      ]},
    ],
  },
  {
    id: "2",
    name: "Development",
    type: "folder",
    icon: Folder,
    children: [
      { 
        id: "2-1", 
        name: "Code Documentation", 
        type: "prompt", 
        icon: FileText, 
        versions: 1, 
        content: "Generate documentation for the following code: {{code_snippet}}",
        history: []
      },
    ],
  },
  { 
    id: "3", 
    name: "My Favorite Prompt", 
    type: "prompt", 
    icon: FileText, 
    versions: 1, 
    isFavorite: true, 
    content: "This is my favorite prompt for daily summaries.",
    history: []
  }
];

const PromptTreeItem: React.FC<{ item: Prompt; level: number; onSelectPrompt: (prompt: Prompt) => void; selectedPromptId?: string }> = ({ item, level, onSelectPrompt, selectedPromptId }) => {
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

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleSelect}
        className={`w-full justify-start ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}
        style={{ paddingLeft: `${(level * 1.5) + 0.5}rem` }}
        tooltip={sidebarState === 'collapsed' ? item.name : undefined}
      >
        <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
        <span className="truncate flex-grow">{item.name}</span>
        {item.isFavorite && <Star className="h-3 w-3 ml-auto text-yellow-400 flex-shrink-0" />}
        {item.type === "folder" && item.children && (
          <ChevronDown className={`h-4 w-4 ml-auto transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
        )}
      </SidebarMenuButton>
      {item.type === "folder" && isOpen && item.children && (
        <SidebarMenuSub>
          {item.children.map((child) => (
            <PromptTreeItem key={child.id} item={child} level={level + 1} onSelectPrompt={onSelectPrompt} selectedPromptId={selectedPromptId}/>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); 

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
          <DialogTitle className="flex items-center"><Sparkles className="w-5 h-5 mr-2 text-primary" /> AI Prompt Optimizer</DialogTitle>
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
}

export function MainLayout({ children }: { children: (props: MainLayoutChildrenProps) => React.ReactNode }) {
  const [prompts, setPrompts] = React.useState<Prompt[]>(initialMockPrompts);
  const [selectedPrompt, setSelectedPrompt] = React.useState<Prompt | null>(null);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isOptimizerOpen, setIsOptimizerOpen] = React.useState(false);
  const [optimizerInitialPrompt, setOptimizerInitialPrompt] = React.useState<string | undefined>(undefined);
  const [isNewPromptDialogOpen, setIsNewPromptDialogOpen] = React.useState(false);
  const [isEditPromptDialogOpen, setIsEditPromptDialogOpen] = React.useState(false);
  const [isVersionHistoryDialogOpen, setIsVersionHistoryDialogOpen] = React.useState(false);
  const [promptForHistory, setPromptForHistory] = React.useState<Prompt | null>(null);

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

  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
  };

  const handleImport = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result;
            if (typeof content === 'string') {
              const importedPrompts = JSON.parse(content);
              
              if (Array.isArray(importedPrompts) && 
                  (importedPrompts.length === 0 || 
                   (importedPrompts[0] && typeof importedPrompts[0].id === 'string' && typeof importedPrompts[0].name === 'string' && typeof importedPrompts[0].type === 'string'))) {
                
                const sanitizedPrompts = importedPrompts.map((prompt: any) => {
                  // Ensure versions is at least 1 if content exists and versions is missing
                  const versions = (prompt.versions === undefined && prompt.content !== undefined) ? 1 : prompt.versions;
                  
                  // Ensure history array exists and timestamps are Date objects
                  const history = (prompt.history || []).map((h: any) => ({
                    ...h,
                    timestamp: new Date(h.timestamp),
                  })).sort((a: PromptVersion, b: PromptVersion) => b.versionNumber - a.versionNumber);

                  return { ...prompt, versions, history };
                });
  
                setPrompts(sanitizedPrompts as Prompt[]);
                setSelectedPrompt(null); 
                toast({ title: "Import Successful", description: "Prompts imported successfully." });
              } else {
                toast({ title: "Import Failed", description: "Invalid file format. Expected an array of prompts.", variant: "destructive" });
              }
            } else {
              toast({ title: "Import Failed", description: "Could not read file content.", variant: "destructive" });
            }
          } catch (error) {
            console.error("Error importing prompts:", error);
            toast({ title: "Import Failed", description: "Error parsing JSON file. Ensure it's valid.", variant: "destructive" });
          }
        };
        reader.onerror = () => {
          toast({ title: "Import Failed", description: "Error reading file.", variant: "destructive" });
        };
        reader.readAsText(file);
      }
    };
    fileInput.click();
  };
  
  const handleExport = () => {
    if (prompts.length === 0) {
      toast({ title: "Export Prompts", description: "No prompts to export.", variant: "default" });
      return;
    }
    try {
      const jsonString = JSON.stringify(prompts, (key, value) => {
        // Convert Date objects to ISO strings for consistent JSON output
        if (key === 'timestamp' && value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }, 2); 
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().split('T')[0]; 
      a.download = `promptverse_export_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Export Successful", description: "Prompts exported successfully." });
    } catch (error) {
      console.error("Error exporting prompts:", error);
      toast({ title: "Export Failed", description: "An error occurred while exporting prompts.", variant: "destructive" });
    }
  };
  
  const handleOpenNewPromptDialog = () => {
    setIsNewPromptDialogOpen(true);
  };

  const handleOpenOptimizerDialog = (initialPrompt?: string) => {
    setOptimizerInitialPrompt(initialPrompt || selectedPrompt?.content || "");
    setIsOptimizerOpen(true);
  };


  const handleCreateNewItem = (data: NewPromptFormValues) => {
    const newPromptItem: Prompt = {
      id: newId(),
      name: data.promptName,
      content: data.promptContent,
      type: "prompt",
      icon: FileText,
      versions: 1,
      isFavorite: false,
      history: [],
    };

    let newPromptsList = [...prompts];
    if (data.saveLocationType === "existing") {
      if (data.selectedExistingFolderId) {
        newPromptsList = addPromptToTree(prompts, data.selectedExistingFolderId, newPromptItem);
      } else {
        newPromptsList = [...prompts, newPromptItem];
        toast({ title: "Warning", description: "No folder selected, prompt added to root.", variant: "default" });
      }
    } else if (data.saveLocationType === "new") {
      const newFolder: Prompt = {
        id: newId(),
        name: data.newFolderName!,
        type: "folder",
        icon: Folder,
        children: [newPromptItem],
        history: [], 
        versions: 0, 
      };
      newPromptsList = addFolderToTree(prompts, data.newFolderParentId || 'root', newFolder);
    }
    setPrompts(newPromptsList);
    setSelectedPrompt(newPromptItem); 
    setIsNewPromptDialogOpen(false); 
    toast({ title: "Success", description: `Prompt "${newPromptItem.name}" created successfully.` });
  };

  const handleOpenEditPromptDialog = () => {
    if (selectedPrompt && selectedPrompt.type === 'prompt') {
      setIsEditPromptDialogOpen(true);
    } else {
      toast({ title: "Error", description: "Please select a prompt to edit.", variant: "destructive" });
    }
  };

  const handleSaveChangesToPrompt = (newContent: string) => {
    if (!selectedPrompt || selectedPrompt.id === null) {
      toast({ title: "Error", description: "No prompt selected for editing.", variant: "destructive" });
      return;
    }

    const updatedPrompts = updatePromptInTree(prompts, selectedPrompt.id, newContent);
    setPrompts(updatedPrompts);

    const findUpdated = (items: Prompt[], id: string): Prompt | null => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const foundInChildren = findUpdated(item.children, id);
          if (foundInChildren) return foundInChildren;
        }
      }
      return null;
    };
    const newlySelectedPrompt = findUpdated(updatedPrompts, selectedPrompt.id);
    setSelectedPrompt(newlySelectedPrompt); 
    
    setIsEditPromptDialogOpen(false);
    toast({ title: "Success", description: `Prompt "${selectedPrompt.name}" updated to version ${newlySelectedPrompt?.versions}.` });
  };

  const handleOpenVersionHistory = () => {
    if (selectedPrompt && selectedPrompt.type === 'prompt') {
      setPromptForHistory(selectedPrompt);
      setIsVersionHistoryDialogOpen(true);
    } else {
      toast({ title: "Error", description: "Please select a prompt to view its history.", variant: "destructive" });
    }
  };
  
  const sidebarWidth = "280px";

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
                <SidebarGroupLabel tooltip="Prompts" className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-2"/> Prompts
                </SidebarGroupLabel>
                 {prompts.map((item) => (
                  <PromptTreeItem key={item.id} item={item} level={0} onSelectPrompt={handleSelectPrompt} selectedPromptId={selectedPrompt?.id}/>
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
                  <AvatarImage src="https://picsum.photos/40/40?grayscale" alt="User Avatar" data-ai-hint="profile avatar" />
                  <AvatarFallback>PV</AvatarFallback>
                </Avatar>
                <div className="truncate group-data-[collapsible=icon]:hidden">
                  <p className="font-semibold text-sm">Prompt User</p>
                  <p className="text-xs text-muted-foreground">user@promptverse.ai</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 bg-popover">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem> Profile</DropdownMenuItem> 
              <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
               <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                Switch to {theme === "dark" ? "Light" : "Dark"} Mode
              </DropdownMenuItem>
              <DropdownMenuItem><LifeBuoy className="mr-2 h-4 w-4" /> Help & Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            <Button variant="outline" size="sm" onClick={() => handleOpenOptimizerDialog(selectedPrompt?.content)}>
              <Sparkles className="mr-2 h-4 w-4" /> Optimize
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport}>
              <UploadCloud className="mr-2 h-4 w-4" /> Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <DownloadCloud className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button size="sm" onClick={handleOpenNewPromptDialog}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Prompt
            </Button>
             <SidebarTrigger className="md:hidden" />
          </div>
        </header>

        <main className="flex-1 p-6">
           {selectedPrompt && selectedPrompt.type === 'prompt' ? (
            <div className="bg-card p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{selectedPrompt.name}</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenOptimizerDialog(selectedPrompt?.content)}><Sparkles className="mr-1 h-4 w-4" /> Optimize</Button>
                  <Button variant="ghost" size="sm" onClick={handleOpenVersionHistory}><History className="mr-1 h-4 w-4" /> Versions ({selectedPrompt.versions || 0})</Button>
                   <Button variant="ghost" size="sm" onClick={() => toast({title: "Branch clicked", description: "Branching functionality coming soon."})}> Branch</Button>
                </div>
              </div>
              <Textarea
                value={selectedPrompt.content ?? ""}
                readOnly
                className="w-full min-h-[300px] p-4 font-code text-sm bg-background rounded-md border"
              />
               <div className="mt-4 flex justify-end">
                <Button onClick={handleOpenEditPromptDialog}>Edit Prompt</Button>
              </div>
            </div>
          ) : (
            children({ openNewPromptDialog: handleOpenNewPromptDialog, openOptimizerDialog: handleOpenOptimizerDialog })
          )}
        </main>
      </SidebarInset>
      <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogHeader className="p-0 m-0 border-0 sr-only">
          <DialogTitle>Command Menu</DialogTitle>
          <DialogDescription>Use this to search for prompts or execute commands.</DialogDescription>
        </DialogHeader>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem onSelect={() => { 
                const adCopyPrompt = prompts.flatMap(p => p.type === 'folder' && p.children ? p.children.filter(c => c.id === '1-1') : []).flat()[0];
                if(adCopyPrompt) setSelectedPrompt(adCopyPrompt); 
                setIsSearchOpen(false); 
            }}>
                <FileText className="mr-2 h-4 w-4" />
                <span>Ad Copy Generator</span>
            </CommandItem>
            <CommandItem onSelect={() => { handleOpenOptimizerDialog(); setIsSearchOpen(false); }}>
                <Sparkles className="mr-2 h-4 w-4" />
                <span>Open AI Optimizer</span>
            </CommandItem>
             <CommandItem onSelect={() => { handleOpenNewPromptDialog(); setIsSearchOpen(false); }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                <span>Create New Prompt</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Prompts">
             {prompts.flatMap(p => p.type === 'folder' && p.children ? p.children.filter(c => c.type === 'prompt') : (p.type === 'prompt' ? [p] : [])).map(prompt => (
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
        allPrompts={prompts}
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
    </SidebarProvider>
  );
}

    