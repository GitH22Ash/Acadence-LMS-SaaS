"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, Loader2, MoreVertical, Trash2 } from "lucide-react";
import { getSubjectColor } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteNoteDialog } from "@/components/DeleteNoteDialog";
import { useState } from "react";

interface NoteCardProps {
  note: LearningNoteCard;
}

const NoteCard = ({ note }: NoteCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const color = getSubjectColor(note.subject || "");
  const isGenerating = note.notes_status === "generating";
  const isFailed = note.notes_status === "failed";
  const isPending = note.notes_status === "pending";
  const isReady = note.notes_status === "completed";

  const formattedDate = new Date(note.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="note-card group">
      {/* Header: subject badge + status */}
      <div className="flex justify-between items-center">
        <div
          className="subject-badge"
          style={{ backgroundColor: `${color}20` }}
        >
          {note.subject && (
            <span className="flex items-center gap-1.5">
              <Image
                src={`/icons/${note.subject}.svg`}
                alt=""
                width={14}
                height={14}
                className="w-3.5 h-3.5 shrink-0"
                aria-hidden
              />
              {note.subject}
            </span>
          )}
        </div>

        {/* Status indicator */}
        {isGenerating && (
          <span className="note-badge generating">
            <Loader2 className="size-3 animate-spin" />
            Generating
          </span>
        )}
        {isReady && (
          <span className="note-badge completed">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            Completed
          </span>
        )}
        
        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-md text-muted-foreground hover:bg-muted focus:outline-none transition-colors">
              <MoreVertical className="size-4" />
              <span className="sr-only">Open menu</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Delete Note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {isFailed && (
          <span className="note-badge failed">
            Retry needed
          </span>
        )}
        {isPending && (
          <span className="note-badge pending">
            Pending
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-1.5">
        <h3 className="text-lg font-bold tracking-tight line-clamp-1">
          {note.title || "Untitled Session"}
        </h3>
        {note.companion_name && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {note.companion_name} · {formattedDate}
          </p>
        )}
        {note.summary && isReady && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mt-1">
            {note.summary}
          </p>
        )}
        {isGenerating && (
          <p className="text-sm text-muted-foreground italic mt-1">
            Notes are being generated...
          </p>
        )}
        {isFailed && (
          <p className="text-sm text-destructive/70 mt-1">
            Generation failed — tap to retry
          </p>
        )}
      </div>

      {/* Key concepts pills */}
      {isReady && note.key_concepts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {note.key_concepts.slice(0, 3).map((concept, i) => (
            <span
              key={i}
              className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground font-medium truncate max-w-[200px]"
            >
              {concept}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3.5" strokeWidth={1.8} />
          <span className="text-sm">{formattedDate}</span>
        </div>
        <Link href={`/notes/${isReady ? note.id : note.session_id}`}>
          <span className="btn-primary text-sm py-2 px-4 group-hover:gap-3 transition-all">
            {isReady ? "View Notes" : isFailed ? "Retry" : "View"}
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </span>
        </Link>
      </div>
      
      <DeleteNoteDialog
        isOpen={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        noteId={note.id}
        noteTitle={note.title || undefined}
      />
    </article>
  );
};

export default NoteCard;
