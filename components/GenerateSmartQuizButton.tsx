"use client";

import { useState } from "react";
import { generateAdaptiveQuiz } from "@/lib/actions/smart-practice.actions";
import { useRouter } from "next/navigation";
import { BrainCircuit, Loader2 } from "lucide-react";

export default function GenerateSmartQuizButton({ subject }: { subject?: string }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const result = await generateAdaptiveQuiz(subject);
      if (result.success && result.quizId) {
        router.push(`/practice/quizzes/${result.quizId}`);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate adaptive quiz. Try again later.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isGenerating}
      className="btn-primary w-fit shadow-md shadow-primary/20"
    >
      {isGenerating ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <BrainCircuit className="size-4" strokeWidth={2} />
      )}
      {isGenerating ? "Generating..." : "Generate Smart Quiz"}
    </button>
  );
}
