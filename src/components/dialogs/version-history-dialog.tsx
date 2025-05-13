"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientPrompt, ClientPromptVersion } from "@/components/layout/main-layout";
import { format } from 'date-fns';
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: ClientPrompt | null;
  versions: ClientPromptVersion[]; 
  isLoading: boolean;
}

export function VersionHistoryDialog({
  open,
  onOpenChange,
  prompt,
  versions, // These are historical versions from the 'versions' subcollection
  isLoading,
}: VersionHistoryDialogProps) {
  if (!prompt) return null;

  // Create a list of all versions to display, including the current content as the latest.
  const allDisplayVersions: (ClientPromptVersion & { isCurrent?: boolean })[] = [];

  // Add current prompt content as the "latest" (current) version.
  // Its versionNumber is `prompt.versions`.
  if (prompt.content !== undefined) {
    allDisplayVersions.push({
      id: `current-${prompt.id}`, // A unique key for React list
      versionNumber: prompt.versions, // This is the current version number
      content: prompt.content,
      timestamp: prompt.updatedAt, // Timestamp of when this content became current
      userId: prompt.userId, 
      isCurrent: true,
    });
  }
  
  // Add historical versions fetched from the API (these are already sorted by versionNumber desc by API)
  // Their version numbers will be less than `prompt.versions`.
  allDisplayVersions.push(...versions);
  
  // Ensure unique versions (though API should handle this mostly) and sort again for robustness
  const uniqueSortedVersions = Array.from(new Map(allDisplayVersions.map(v => [v.versionNumber, v])).values())
    .sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-card max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Version History: {prompt.name}</DialogTitle>
          <DialogDescription>
            Review versions of this prompt. The current version is at the top.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4">
          <div className="space-y-4 py-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <LoadingSpinner />
              </div>
            ) : uniqueSortedVersions.length > 0 ? (
              uniqueSortedVersions.map((version) => (
                <Card key={`${prompt.id}-v${version.versionNumber}`} className="bg-background/80 shadow-md">
                  <CardHeader className="py-3 px-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-md">
                        Version {version.versionNumber}
                        {version.isCurrent && " (Current)"}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      Saved on: {format(new Date(version.timestamp), "MMM d, yyyy 'at' h:mm a")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <Textarea
                      value={version.content}
                      readOnly
                      className="min-h-[80px] max-h-[200px] font-code text-xs bg-background/50"
                    />
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No version history available for this prompt.</p>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}