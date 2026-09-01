"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileQuestion, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { generateQuizFromNote } from "@/lib/actions/practice.actions";
import Link from "next/link";

interface GenerateQuizButtonProps {
  noteId: string;
  existingQuizId?: string | null;
}

export function GenerateQuizButton({
  noteId,
  existingQuizId,
}: GenerateQuizButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  if (existingQuizId) {
    return (
      <Link
        href={`/practice/quizzes/${existingQuizId}`}
        className="btn-primary text-sm py-2.5 px-5"
      >
        <FileQuestion className="size-4" strokeWidth={1.8} />
        Take Quiz
        <ArrowRight className="size-3.5" strokeWidth={2} />
      </Link>
    );
  }

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const result = await generateQuizFromNote(noteId);
      toast.success("Quiz generated successfully!");
      router.push(`/practice/quizzes/${result.quizId}`);
    } catch (error) {
      console.error(error);
      toast.error("Couldn't generate the quiz. Try again.");
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
          Creating your quiz...
        </>
      ) : (
        <>
          <FileQuestion className="size-4" strokeWidth={1.8} />
          Generate Quiz
        </>
      )}
    </button>
  );
}
