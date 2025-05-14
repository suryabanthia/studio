// src/components/dialogs/version-history-dialog.tsx
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
import type { Prompt, PromptVersion } from "@/components/layout/main-layout"; // PromptVersion uses Date
import { format } from 'date-fns';

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: Prompt | null;
  // onRevert?: (promptId: string, versionToRevertTo: PromptVersion) => void; // Future enhancement
}

export function VersionHistoryDialog({
  open,
  onOpenChange,
  prompt,
}: VersionHistoryDialogProps) {
  if (!prompt) return null;

  // Construct a list of all versions for display, including the current content as the latest version.
  const allDisplayVersions: PromptVersion[] = [];

  if (prompt.content !== undefined && prompt.versions !== undefined) {
    allDisplayVersions.push({
      id: `${prompt.id}-current`, // A unique ID for the current state if not versioned explicitly
      versionNumber: prompt.versions,
      content: prompt.content,
      timestamp: prompt.updatedAt || new Date(), // Use updatedAt or current date
    });
  }

  if (prompt.history) {
    // Ensure history timestamps are Date objects
    const historyWithDates = prompt.history.map(v => ({
      ...v,
      timestamp: new Date(v.timestamp) // Ensure it's a Date object
    }));
    allDisplayVersions.push(...historyWithDates);
  }
  
  // Deduplicate by versionNumber (just in case) and sort descending
  const uniqueSortedVersions = Array.from(new Map(allDisplayVersions.map(v => [v.versionNumber, v])).values())
    .sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-card max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Version History: {prompt.name}</DialogTitle>
          <DialogDescription>
            Review past versions of this prompt. The current version is at the top.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4">
          <div className="space-y-4 py-4">
            {uniqueSortedVersions.length > 0 ? (
              uniqueSortedVersions.map((version, index) => (
                <Card key={version.id || version.versionNumber} className="bg-background/80 shadow-md">
                  <CardHeader className="py-3 px-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-md">
                        Version {version.versionNumber}
                        {index === 0 && prompt.content !== undefined && " (Current)"}
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
              <p className="text-muted-foreground">No version history available for this prompt.</p>
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
