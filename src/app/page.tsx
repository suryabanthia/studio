"use client"; 

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, Star } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast"; 

// Removed DashboardPageProps as openNewPromptDialog will come from MainLayout's child function
// interface DashboardPageProps {
//   openNewPromptDialog?: () => void; 
// }

export default function DashboardPage() { // Removed openNewPromptDialog from props
  const { toast } = useToast();

  // Handlers will now be defined inside the MainLayout's child function scope
  // to access functions passed by MainLayout.

  return (
    <MainLayout>
      {({ openNewPromptDialog: layoutOpenNewPromptDialog, openOptimizerDialog: layoutOpenOptimizerDialog }) => {
        const handleCreateNewPrompt = () => {
          if (layoutOpenNewPromptDialog) {
            layoutOpenNewPromptDialog();
          } else {
            toast({ title: "Error", description: "Cannot open new prompt dialog.", variant: "destructive" });
          }
        };

        const handleExploreFeatures = () => {
          toast({ title: "Action: Explore Features", description: "This button is now clickable." });
          // TODO: Implement actual functionality
        };
      
        const handleOptimizeAPrompt = () => {
          if (layoutOpenOptimizerDialog) {
            layoutOpenOptimizerDialog(); // Call the function from MainLayout
          } else {
            toast({ title: "Error", description: "Cannot open optimizer dialog.", variant: "destructive" });
          }
        };
      
        const handleImportPrompts = () => {
          toast({ title: "Action: Import Prompts", description: "This button is now clickable." });
          // TODO: Implement actual functionality
        };
      
        const handleViewVersionHistory = () => {
          toast({ title: "Action: View Version History", description: "This button is now clickable." });
          // TODO: Implement actual functionality
        };

        return (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-card shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-3xl font-bold text-primary">Welcome to PromptVerse!</CardTitle>
                <CardDescription className="text-lg text-muted-foreground">
                  Your central hub for managing, versioning, and optimizing AI prompts.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 space-y-4">
                  <p>
                    Navigate your prompts using the sidebar, create new ones, or optimize existing prompts with our AI-powered tools.
                    Let's make your AI interactions more powerful and efficient.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateNewPrompt}>Create New Prompt</Button>
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
                <ul className="space-y-2">
                  <li className="flex justify-between items-center p-2 rounded hover:bg-muted"><span>Ad Copy Generator</span> <Star className="w-4 h-4 text-yellow-400"/></li>
                  <li className="flex justify-between items-center p-2 rounded hover:bg-muted"><span>Welcome Email</span></li>
                  <li className="flex justify-between items-center p-2 rounded hover:bg-muted"><span>Code Documentation</span></li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center text-xl"><Sparkles className="w-5 h-5 mr-2 text-accent" /> Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button variant="secondary" className="w-full justify-start" onClick={handleOptimizeAPrompt}>Optimize a Prompt</Button>
                <Button variant="secondary" className="w-full justify-start" onClick={handleImportPrompts}>Import Prompts</Button>
                <Button variant="secondary" className="w-full justify-start" onClick={handleViewVersionHistory}>View Version History</Button>
              </CardContent>
            </Card>
            
          </div>
        );
      }}
    </MainLayout>
  );
}