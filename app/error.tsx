"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-destructive/10">
        <AlertTriangle className="size-9 text-destructive" strokeWidth={1.2} />
      </div>
      <h1 className="text-3xl sm:text-4xl">Something Went Wrong</h1>
      <p className="text-muted-foreground max-w-sm">
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </p>
      <button
        onClick={reset}
        className="btn-primary mt-2 cursor-pointer"
      >
        <RotateCcw className="size-4" strokeWidth={2} />
        Try Again
      </button>
    </main>
  );
}
