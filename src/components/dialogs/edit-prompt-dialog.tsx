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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

interface EditPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptName: string;
  initialContent: string;
  onSave: (newContent: string) => void; // Backend will handle versioning
  isSaving?: boolean;
}

export function EditPromptDialog({
  open,
  onOpenChange,
  promptName,
  initialContent,
  onSave,
  isSaving = false,
}: EditPromptDialogProps) {
  const [content, setContent] = React.useState(initialContent);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      setContent(initialContent); 
    }
  }, [open, initialContent]);


  const handleSave = () => {
    if (content.trim() === "") {
      toast({
        title: "Error",
        description: "Prompt content cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    // Backend will handle creating a new version entry.
    // The `versions` count on the prompt document will be incremented by the backend.
    onSave(content);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card">
        <DialogHeader>
          <DialogTitle>Edit Prompt: {promptName}</DialogTitle>
          <DialogDescription>
            Modify the content of your prompt below. Saving will update the prompt and record this change in its version history.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="edit-prompt-content">Prompt Content</Label>
          <Textarea
            id="edit-prompt-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[250px] font-code bg-background"
            placeholder="Enter your prompt content here..."
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
