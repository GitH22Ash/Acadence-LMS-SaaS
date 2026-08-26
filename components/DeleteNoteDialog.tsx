"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteNote } from "@/lib/actions/learning.actions";

interface DeleteNoteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  noteTitle?: string;
  onSuccess?: () => void;
}

export function DeleteNoteDialog({
  isOpen,
  onOpenChange,
  noteId,
  noteTitle,
  onSuccess,
}: DeleteNoteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteNote(noteId);
      toast.success("Note deleted successfully.");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Couldn't delete the note. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this note?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            {noteTitle ? <span className="font-semibold text-foreground">"{noteTitle}"</span> : "this note"}? 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
