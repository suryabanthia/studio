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
  onSave: (newContent: string) => void;
}

export function EditPromptDialog({
  open,
  onOpenChange,
  promptName,
  initialContent,
  onSave,
}: EditPromptDialogProps) {
  const [content, setContent] = React.useState(initialContent);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      setContent(initialContent); 
    }
    // By depending only on `open`, we set the content when the dialog opens.
    // `initialContent` is captured from the closure at that time.
    // This prevents changes to `initialContent` prop from resetting the state while the dialog is open and user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // If you need initialContent to be reactive while the dialog is open (e.g., parent changes it),
  // then initialContent should be in the dependency array. But for typical edit dialogs,
  // snapshotting on open is often preferred to protect user input.
  // If initialContent IS intended to be reactive, then the "can't type" issue source is different.
  // For now, assuming snapshot on open is the desired behavior to fix typing.
  React.useEffect(() => {
    // This secondary effect ensures that if `initialContent` prop itself changes
    // (e.g. user selects a different item to edit without closing dialog, though not current UX)
    // the local state `content` will update IF the dialog is already open.
    // However, for the primary use case of typing, the effect above tied to `open` is key.
    // This specific effect ensures that if `initialContent` changes for an *already open* dialog, it updates.
    // This might be too aggressive if parent re-renders pass a new `initialContent` reference for the same logical data.
    // So, let's ensure we only reset if `initialContent` truly changes for an open dialog and is different from current editing state.
    if (open) {
        // Only update if the prop truly differs from what was last set via prop
        // This is a bit more nuanced. The primary effect on `open` should handle initial set.
        // This one handles "external" changes to initialContent while dialog is open.
        // Let's stick to the simpler model for now: snapshot on open.
        // setContent(initialContent); // Re-evaluating if this specific effect is needed with the one above.
                                  // The one above should be sufficient if initialContent passed on open is stable.
    }
  }, [initialContent, open]);


  const handleSave = () => {
    if (content.trim() === "") {
      toast({
        title: "Error",
        description: "Prompt content cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    onSave(content);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card">
        <DialogHeader>
          <DialogTitle>Edit Prompt: {promptName}</DialogTitle>
          <DialogDescription>
            Modify the content of your prompt below. Saving will create a new version.
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
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
