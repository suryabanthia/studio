// src/app/page.tsx
"use client"; 

import { MainLayout, type PageRenderProps } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, Star, UploadCloud, DownloadCloud, PlusCircle, Palette, History, LogIn, UserPlus, Folder as FolderIcon } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast"; 
import { useAuth } from "@/contexts/AuthContext"; 
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";


// Define the content of the dashboard separately
function DashboardContent({ openNewPromptDialog, openOptimizerDialog, openLoginDialog, openSignupDialog }: PageRenderProps) {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const handleCreateNewPrompt = () => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to create a new prompt.", variant: "destructive" });
      if (openLoginDialog) openLoginDialog(); else router.push('/login');
      return;
    }
    if (openNewPromptDialog) {
      openNewPromptDialog();
    } else {
      // This case might occur if MainLayoutWrapper doesn't pass it correctly
      toast({ title: "Error", description: "New prompt dialog is unavailable.", variant: "destructive" });
    }
  };

  const handleExploreFeatures = () => {
    toast({ title: "Explore Features", description: "Discover the full power of PromptVerse!" });
  };

  const handleOptimizeAPrompt = () => {
     if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to optimize a prompt.", variant: "destructive" });
      if (openLoginDialog) openLoginDialog(); else router.push('/login');
      return;
    }
    if (openOptimizerDialog) {
      openOptimizerDialog();
    } else {
      toast({ title: "Error", description: "Optimizer dialog is unavailable.", variant: "destructive" });
    }
  };

  const handleImportPrompts = () => {
     if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to import prompts.", variant: "destructive" });
      if (openLoginDialog) openLoginDialog(); else router.push('/login');
      return;
    }
    // The import button is in MainLayout, this simulates its click if not directly available
    const importButton = document.getElementById('import-button-mainlayout'); 
    if (importButton instanceof HTMLElement) { // More generic check
      importButton.click();
    } else {
        toast({ title: "Info", description: "Use the 'Import' button in the header to import prompts. (Functionality disabled)", variant: "default" });
    }
  };

  const handleViewVersionHistory = () => {
     if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to view version history.", variant: "destructive" });
       if (openLoginDialog) openLoginDialog(); else router.push('/login');
      return;
    }
    toast({ title: "Info", description: "Select a prompt from the sidebar to view its version history." });
  };


  if (authLoading && !user) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-6">
         <LoadingSpinner size="lg" />
        <h1 className="text-4xl font-bold mb-4 text-foreground mt-4">Loading PromptVerse...</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
          Please wait while we prepare your prompt universe.
        </p>
      </div>
    );
  }

  if (!user && typeof window !== 'undefined') {
    // This conditional rendering will be hit if MainLayout's useEffect for redirect hasn't fired yet
    // or if the user is already on login/signup page
    const onLogin = openLoginDialog ? openLoginDialog : () => router.push('/login');
    const onSignup = openSignupDialog ? openSignupDialog : () => router.push('/signup');
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-6">
        <Palette className="w-24 h-24 text-primary mb-6" />
        <h1 className="text-4xl font-bold mb-4 welcome-title-override">Welcome to PromptVerse!</h1>
        <p className="text-xl welcome-description-override mb-8 max-w-2xl">
          Organize, version, and optimize your AI prompts with ease. Sign in or create an account to get started.
        </p>
        <div className="flex gap-4">
          <Button size="lg" onClick={onLogin}><LogIn className="mr-2 h-5 w-5" />Login</Button>
          <Button size="lg" variant="outline" onClick={onSignup}><UserPlus className="mr-2 h-5 w-5" />Sign Up</Button>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Explore PromptVerse features by logging in or signing up. (Backend features may be limited)
        </p>
      </div>
    );
  }
  
  // Logged-in user dashboard content
  return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-card shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold welcome-title-override">Welcome to PromptVerse, {user?.displayName || 'User'}!</CardTitle>
            <CardDescription className="text-lg welcome-description-override">
              Your central hub for managing, versioning,and optimizing AI prompts.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 space-y-4">
              <p>
                Navigate your prompts using the sidebar, create new ones, or optimize existing prompts with our AI-powered tools.
                Let's make your AI interactions more powerful and efficient.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleCreateNewPrompt}><PlusCircle className="mr-2 h-4 w-4"/>Create New Item</Button>
                <Button variant="outline" onClick={handleExploreFeatures}>Explore Features</Button>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Image
                src="https://picsum.photos/300/200?random=1&blur=2"
                alt="PromptVerse illustration"
                width={300}
                height={200}
                className="rounded-lg shadow-md"
                data-ai-hint="abstract tech"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center text-xl"><FileText className="w-5 h-5 mr-2 text-accent" /> Recent Prompts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent prompts available. (Data store removed)</p>
            {/* <ul className="space-y-2">
              <li className="flex justify-between items-center p-2 rounded hover:bg-muted"><span>Ad Copy Generator</span> <Star className="w-4 h-4 text-yellow-400"/></li>
              <li className="flex justify-between items-center p-2 rounded hover:bg-muted"><span>Welcome Email</span></li>
              <li className="flex justify-between items-center p-2 rounded hover:bg-muted"><span>Code Documentation</span></li>
            </ul> */}
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center text-xl"><Sparkles className="w-5 h-5 mr-2 text-accent" /> Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="secondary" className="w-full justify-start" onClick={handleOptimizeAPrompt}><Sparkles className="mr-2 h-4 w-4"/>Optimize a Prompt</Button>
            <Button variant="secondary" className="w-full justify-start" onClick={handleImportPrompts} disabled><UploadCloud className="mr-2 h-4 w-4"/>Import Prompts (Disabled)</Button>
            <Button variant="secondary" className="w-full justify-start" onClick={handleViewVersionHistory}><History className="mr-2 h-4 w-4"/>View Version History</Button>
          </CardContent>
        </Card>
      </div>
  );
}

export default function DashboardPage() {
  return (
    // MainLayout is now wrapped by MainLayoutWrapper in main-layout.tsx itself for QueryClient and AuthProvider
    // So, we directly use MainLayout here.
    // For clarity, if MainLayoutWrapper was meant to be used here, it'd be:
    // <MainLayoutWrapper>
    //   {(props: PageRenderProps) => <DashboardContent {...props} />}
    // </MainLayoutWrapper>
    // But given the setup, MainLayout itself is the top-level for page content.
    <MainLayout>
      {(props: PageRenderProps) => <DashboardContent {...props} />}
    </MainLayout>
  );
}
