"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Layers, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { generateFlashcardsFromNote } from "@/lib/actions/practice.actions";
import Link from "next/link";

interface GenerateFlashcardsButtonProps {
  noteId: string;
  existingDeckId?: string | null;
}

export function GenerateFlashcardsButton({
  noteId,
  existingDeckId,
}: GenerateFlashcardsButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  if (existingDeckId) {
    return (
      <Link
        href={`/practice/flashcards/${existingDeckId}`}
        className="btn-primary text-sm py-2.5 px-5"
      >
        <Layers className="size-4" strokeWidth={1.8} />
        Review Flashcards
        <ArrowRight className="size-3.5" strokeWidth={2} />
      </Link>
    );
  }

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const result = await generateFlashcardsFromNote(noteId);
      if (result.alreadyExists) {
        toast.success("Flashcards already exist for this note.");
      } else {
        toast.success("Flashcards generated successfully!");
      }
      router.push(`/practice/flashcards/${result.deckId}`);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't generate flashcards. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isGenerating}
      className="btn-primary text-sm py-2.5 px-5 disabled:opacity-60"
    >
      {isGenerating ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Generating flashcards...
        </>
      ) : (
        <>
          <Layers className="size-4" strokeWidth={1.8} />
          Generate Flashcards
        </>
      )}
    </button>
  );
}
