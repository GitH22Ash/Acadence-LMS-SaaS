"use client";

import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Layers,
} from "lucide-react";

interface QuizResultsProps {
  result: QuizAttemptResult;
  sourceNoteId?: string | null;
}

export default function QuizResults({
  result,
  sourceNoteId,
}: QuizResultsProps) {
  const { attempt, quiz, answers } = result;
  const score = attempt.score ?? 0;
  const total = attempt.total_questions;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  const correctAnswers = answers.filter((a) => a.is_correct);
  const incorrectAnswers = answers.filter((a) => !a.is_correct);

  // Determine performance level
  const performanceColor =
    percentage >= 80
      ? "text-success"
      : percentage >= 60
        ? "text-warning"
        : "text-destructive";
  const performanceBg =
    percentage >= 80
      ? "bg-success/10"
      : percentage >= 60
        ? "bg-warning/10"
        : "bg-destructive/10";

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto">
      {/* Score hero */}
      <div className="flex flex-col items-center text-center gap-4 py-6">
        <div
          className={`flex size-20 items-center justify-center rounded-2xl ${performanceBg}`}
        >
          <span className={`text-3xl font-bold ${performanceColor}`}>
            {percentage}%
          </span>
        </div>
        <div>
          <h2 className="text-2xl mb-1">Quiz Complete</h2>
          <p className="text-muted-foreground">
            {score} correct out of {total}{" "}
            {total === 1 ? "question" : "questions"}
          </p>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-success/10 border border-success/20 p-4 text-center">
          <p className="text-2xl font-bold text-success">
            {correctAnswers.length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Correct</p>
        </div>
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-center">
          <p className="text-2xl font-bold text-destructive">
            {incorrectAnswers.length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Incorrect</p>
        </div>
      </div>

      {/* Weak topics */}
      {incorrectAnswers.length > 0 && (
        <section className="note-section">
          <div className="note-section-header">
            <XCircle className="size-5 text-destructive" strokeWidth={1.8} />
            <h3 className="text-lg font-semibold">Review Needed</h3>
          </div>
          <ul className="flex flex-col gap-2">
            {incorrectAnswers.map((a) => (
              <li
                key={a.id}
                className="p-4 rounded-xl bg-destructive/5 border border-destructive/10"
              >
                <p className="text-sm font-medium text-foreground mb-1">
                  {a.question?.question}
                </p>
                <p className="text-sm text-muted-foreground">
                  Your answer:{" "}
                  <span className="text-destructive font-medium">
                    {a.answer}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Correct:{" "}
                  <span className="text-success font-medium">
                    {a.question?.correct_answer}
                  </span>
                </p>
                {a.question?.explanation && (
                  <p className="text-sm text-muted-foreground/80 mt-2 italic">
                    {a.question.explanation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Strong areas */}
      {correctAnswers.length > 0 && (
        <section className="note-section">
          <div className="note-section-header">
            <CheckCircle2
              className="size-5 text-success"
              strokeWidth={1.8}
            />
            <h3 className="text-lg font-semibold">Strong Areas</h3>
          </div>
          <ul className="flex flex-col gap-1.5">
            {correctAnswers.slice(0, 5).map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 text-sm text-foreground/80"
              >
                <CheckCircle2 className="size-3.5 text-success shrink-0" />
                {a.question?.question}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2 pt-2">
        {sourceNoteId && (
          <Link
            href={`/practice/flashcards`}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Layers className="size-4" />
            Review Flashcards
          </Link>
        )}
        <Link
          href={`/practice/quizzes/${quiz.id}`}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
        >
          <RotateCcw className="size-4" />
          Practice Again
        </Link>
        <Link href="/practice" className="btn-primary py-3">
          Back to Practice
          <ArrowRight className="size-3.5" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
