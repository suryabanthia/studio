"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Prompt } from "@/components/layout/main-layout";
import { generateFolderOptions, type FolderOption } from "@/lib/prompt-utils";

const newPromptFormSchema = z.object({
  promptName: z.string().min(1, "Prompt name is required."),
  promptContent: z.string().min(1, "Prompt content is required."),
  saveLocationType: z.enum(["existing", "new"]),
  selectedExistingFolderId: z.string().optional(),
  newFolderName: z.string().optional(),
  newFolderParentId: z.string().optional(), // 'root' or folderId
}).refine(data => {
  if (data.saveLocationType === "existing") {
    return !!data.selectedExistingFolderId;
  }
  return true;
}, {
  message: "Please select an existing folder.",
  path: ["selectedExistingFolderId"],
}).refine(data => {
  if (data.saveLocationType === "new") {
    return !!data.newFolderName;
  }
  return true;
}, {
  message: "New folder name is required.",
  path: ["newFolderName"],
}).refine(data => {
  if (data.saveLocationType === "new") {
    return !!data.newFolderParentId;
  }
  return true;
}, {
  message: "Please select a parent for the new folder.",
  path: ["newFolderParentId"],
});

export type NewPromptFormValues = z.infer<typeof newPromptFormSchema>;

interface NewPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allPrompts: Prompt[]; // Used to populate folder selectors
  onCreate: (data: NewPromptFormValues) => void;
}

export function NewPromptDialog({ open, onOpenChange, allPrompts, onCreate }: NewPromptDialogProps) {
  const { toast } = useToast();
  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewPromptFormValues>({
    resolver: zodResolver(newPromptFormSchema),
    defaultValues: {
      promptName: "",
      promptContent: "",
      saveLocationType: "existing",
    },
  });

  const saveLocationType = watch("saveLocationType");

  // Memoize options based on allPrompts
  const existingFolderOptions = React.useMemo(() => generateFolderOptions(allPrompts), [allPrompts]);
  const newFolderParentOptions = React.useMemo(() => generateFolderOptions(allPrompts, '', true), [allPrompts]);

  const onSubmit = (data: NewPromptFormValues) => {
    onCreate(data);
    // Toast and reset are handled by the `useEffect` reacting to `open` state or by parent.
    // For now, let's keep toast here, but reset is tricky with external open control.
    // Parent will close dialog via onOpenChange(false) which then triggers reset via useEffect.
  };
  
  React.useEffect(() => {
    if (open) {
      // Re-calculate options here based on potentially updated allPrompts when dialog opens
      const currentExistingFolderOptions = generateFolderOptions(allPrompts);
      const currentNewFolderParentOptions = generateFolderOptions(allPrompts, '', true);
      reset({ 
        promptName: "",
        promptContent: "",
        saveLocationType: currentExistingFolderOptions.length > 0 ? "existing" : "new",
        selectedExistingFolderId: currentExistingFolderOptions.length > 0 ? currentExistingFolderOptions[0]?.value : undefined,
        newFolderName: "", // Always clear new folder name
        newFolderParentId: currentNewFolderParentOptions.length > 0 ? currentNewFolderParentOptions[0]?.value : 'root',
      });
    }
  }, [open, reset, allPrompts]); // allPrompts is needed to correctly calculate options on open.
                                 // If allPrompts changes while open, form won't reset, protecting input.


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] bg-card">
        <DialogHeader>
          <DialogTitle>Create New Prompt</DialogTitle>
          <DialogDescription>
            Fill in the details for your new prompt and choose where to save it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="promptName">Prompt Name</Label>
            <Input id="promptName" {...register("promptName")} className="mt-1 bg-background" />
            {errors.promptName && <p className="text-sm text-destructive mt-1">{errors.promptName.message}</p>}
          </div>

          <div>
            <Label htmlFor="promptContent">Prompt Content</Label>
            <Textarea id="promptContent" {...register("promptContent")} className="mt-1 min-h-[100px] font-code bg-background" />
            {errors.promptContent && <p className="text-sm text-destructive mt-1">{errors.promptContent.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Save Location</Label>
            <Controller
              name="saveLocationType"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="existing" id="existing" disabled={existingFolderOptions.length === 0}/>
                    <Label htmlFor="existing" className={existingFolderOptions.length === 0 ? "text-muted-foreground" : ""}>
                      Existing Folder {existingFolderOptions.length === 0 && "(None available)"}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new">New Folder</Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>

          {saveLocationType === "existing" && existingFolderOptions.length > 0 && (
            <div>
              <Label htmlFor="selectedExistingFolderId">Select Folder</Label>
              <Controller
                name="selectedExistingFolderId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || undefined}>
                    <SelectTrigger className="w-full mt-1 bg-background">
                      <SelectValue placeholder="Select an existing folder" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingFolderOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.selectedExistingFolderId && <p className="text-sm text-destructive mt-1">{errors.selectedExistingFolderId.message}</p>}
            </div>
          )}

          {saveLocationType === "new" && (
            <>
              <div>
                <Label htmlFor="newFolderName">New Folder Name</Label>
                <Input id="newFolderName" {...register("newFolderName")} className="mt-1 bg-background"/>
                {errors.newFolderName && <p className="text-sm text-destructive mt-1">{errors.newFolderName.message}</p>}
              </div>
              <div>
                <Label htmlFor="newFolderParentId">Parent of New Folder</Label>
                 <Controller
                    name="newFolderParentId"
                    control={control}
                    defaultValue="root" 
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || 'root'}>
                        <SelectTrigger className="w-full mt-1 bg-background">
                        <SelectValue placeholder="Select parent folder" />
                        </SelectTrigger>
                        <SelectContent>
                        {newFolderParentOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                            {option.label}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    )}
                />
                {errors.newFolderParentId && <p className="text-sm text-destructive mt-1">{errors.newFolderParentId.message}</p>}
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); /* Reset is handled by useEffect on 'open' change */ }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Prompt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
