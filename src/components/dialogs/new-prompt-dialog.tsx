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
// Removed useToast as it's not used here directly, parent handles toasts.
import type { ClientPrompt, ClientFolder } from "@/components/layout/main-layout"; 
import { generateFolderOptions } from "@/lib/prompt-utils";


const newPromptFormSchema = z.object({
  promptName: z.string().min(1, "Prompt name is required."),
  promptContent: z.string().min(1, "Prompt content is required."),
  saveLocationType: z.enum(["existing", "new"]),
  selectedExistingFolderId: z.string().optional(), 
  newFolderName: z.string().optional(),
  newFolderParentId: z.string().optional(), 
}).refine(data => {
  if (data.saveLocationType === "existing") {
    return !!data.selectedExistingFolderId; 
  }
  return true;
}, {
  message: "Please select an existing folder or root.",
  path: ["selectedExistingFolderId"],
}).refine(data => {
  if (data.saveLocationType === "new") {
    return !!data.newFolderName && !!data.newFolderParentId;
  }
  return true;
}, {
  message: "New folder name and its parent location are required.",
  path: ["newFolderName"], 
});

export type NewPromptFormValues = z.infer<typeof newPromptFormSchema>;

interface NewPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allPrompts: ClientPrompt[]; 
  allFolders: ClientFolder[]; 
  onCreate: (data: NewPromptFormValues) => void;
  isCreating?: boolean; 
}

export function NewPromptDialog({ 
    open, 
    onOpenChange, 
    allFolders, 
    onCreate,
    isCreating = false 
}: NewPromptDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting: formIsSubmitting }, 
  } = useForm<NewPromptFormValues>({
    resolver: zodResolver(newPromptFormSchema),
    defaultValues: {
      promptName: "",
      promptContent: "",
      saveLocationType: "existing",
      selectedExistingFolderId: "root", 
      newFolderName: "",
      newFolderParentId: "root", 
    },
  });

  const saveLocationType = watch("saveLocationType");

  const existingFolderOptionsForPrompt = React.useMemo(() => {
      const options = allFolders.map(f => ({ value: f.id, label: f.name }));
      return [{ value: 'root', label: 'Root Level (No Folder)' }, ...options];
  }, [allFolders]);

  const parentFolderOptionsForNewFolder = React.useMemo(() => {
      const options = allFolders.map(f => ({ value: f.id, label: f.name }));
      return [{ value: 'root', label: 'Root Level (Top Level Folder)' }, ...options];
  }, [allFolders]);


  const onSubmit = (data: NewPromptFormValues) => {
    onCreate(data);
  };
  
  React.useEffect(() => {
    if (open) {
      reset({ 
        promptName: "",
        promptContent: "",
        saveLocationType: existingFolderOptionsForPrompt.length > 1 ? "existing" : "new",
        selectedExistingFolderId: "root",
        newFolderName: "",
        newFolderParentId: "root",
      });
    }
  }, [open, reset, existingFolderOptionsForPrompt]);


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
            <Label>Save Location for Prompt</Label>
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
                    <RadioGroupItem value="existing" id="existing" />
                    <Label htmlFor="existing">
                      Existing Folder (or Root)
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

          {saveLocationType === "existing" && (
            <div>
              <Label htmlFor="selectedExistingFolderId">Select Folder for Prompt</Label>
              <Controller
                name="selectedExistingFolderId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || "root"}>
                    <SelectTrigger className="w-full mt-1 bg-background">
                      <SelectValue placeholder="Select folder or root" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingFolderOptionsForPrompt.map((option) => (
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
                <Label htmlFor="newFolderParentId">Parent for New Folder</Label>
                 <Controller
                    name="newFolderParentId"
                    control={control}
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || 'root'}>
                        <SelectTrigger className="w-full mt-1 bg-background">
                        <SelectValue placeholder="Select parent for new folder" />
                        </SelectTrigger>
                        <SelectContent>
                        {parentFolderOptionsForNewFolder.map((option) => (
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
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); }} disabled={isCreating || formIsSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isCreating || formIsSubmitting}>
              {isCreating || formIsSubmitting ? "Creating..." : "Create Prompt"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog