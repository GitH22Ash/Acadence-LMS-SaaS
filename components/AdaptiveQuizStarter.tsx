"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateAdaptiveQuiz } from "@/lib/actions/smart-practice.actions";
import { BrainCircuit, Loader2 } from "lucide-react";

export default function AdaptiveQuizStarter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isAdaptive = searchParams.get("adaptive") === "true";
  const subject = searchParams.get("subject") || undefined;
  
  const hasStarted = useRef(false);

  useEffect(() => {
    if (isAdaptive && !hasStarted.current) {
      hasStarted.current = true;
      generateAdaptiveQuiz(subject)
        .then((result) => {
          if (result.success && result.quizId) {
            router.replace(`/practice/quizzes/${result.quizId}`);
          }
        })
        .catch((err) => {
          console.error(err);
          // Just remove the query params if failed
          router.replace("/practice/quizzes");
        });
    }
  }, [isAdaptive, subject, router]);

  if (!isAdaptive) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border border-border p-8 rounded-3xl shadow-xl flex flex-col items-center gap-4 text-center max-w-sm mx-auto">
        <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
          <BrainCircuit className="size-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-display">Generating Smart Quiz</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Analyzing your weak topics in {subject || "all subjects"}...
          </p>
        </div>
        <Loader2 className="size-5 text-muted-foreground animate-spin mt-2" />
      </div>
    </div>
  );
}
