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
import { deleteCompanion } from "@/lib/actions/companion.actions";

interface DeleteCompanionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companionId: string;
  companionName?: string;
  onSuccess?: () => void;
}

export function DeleteCompanionDialog({
  isOpen,
  onOpenChange,
  companionId,
  companionName,
  onSuccess,
}: DeleteCompanionDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteCompanion(companionId);
      toast.success("Companion deleted successfully.");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Couldn't delete the companion. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this companion?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            {companionName ? (
              <span className="font-semibold text-foreground">
                &ldquo;{companionName}&rdquo;
              </span>
            ) : (
              "this companion"
            )}
            ? This will remove the companion from your active library. Your
            learning history and notes will be preserved.
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
