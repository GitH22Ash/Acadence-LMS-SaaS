"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  submitQuizAnswer,
  completeQuizAttempt,
  startQuizAttempt,
} from "@/lib/actions/practice.actions";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

interface QuizAttemptProps {
  quiz: Quiz;
  questions: QuizQuestion[];
}

export default function QuizAttempt({ quiz, questions }: QuizAttemptProps) {
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(
    new Set()
  );

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const handleStart = async () => {
    try {
      setIsStarting(true);
      const result = await startQuizAttempt(quiz.id);
      setAttemptId(result.attemptId);
    } catch (error) {
      console.error("Failed to start quiz:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleNext = useCallback(async () => {
    if (!attemptId || !selectedAnswer || !currentQuestion) return;
    if (answeredQuestions.has(currentQuestion.id)) {
      // Already submitted, just move to next
      if (isLastQuestion) {
        // Complete the quiz
        setIsCompleting(true);
        try {
          await completeQuizAttempt(attemptId);
          router.push(
            `/practice/quizzes/${quiz.id}/results/${attemptId}`
          );
        } catch (error) {
          console.error("Failed to complete quiz:", error);
          setIsCompleting(false);
        }
      } else {
        setCurrentIndex((prev) => prev + 1);
        setSelectedAnswer(null);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await submitQuizAnswer(attemptId, currentQuestion.id, selectedAnswer);
      setAnsweredQuestions((prev) => new Set(prev).add(currentQuestion.id));

      if (isLastQuestion) {
        setIsCompleting(true);
        await completeQuizAttempt(attemptId);
        router.push(
          `/practice/quizzes/${quiz.id}/results/${attemptId}`
        );
      } else {
        setCurrentIndex((prev) => prev + 1);
        setSelectedAnswer(null);
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    attemptId,
    selectedAnswer,
    currentQuestion,
    isLastQuestion,
    answeredQuestions,
    quiz.id,
    router,
  ]);

  // Start screen
  if (!attemptId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6 max-w-md mx-auto">
        <h2 className="text-2xl">{quiz.title}</h2>
        <p className="text-muted-foreground">
          {totalQuestions} {totalQuestions === 1 ? "question" : "questions"}
          {quiz.subject && ` · ${quiz.subject}`}
        </p>
        <button
          onClick={handleStart}
          disabled={isStarting}
          className="btn-primary py-3 px-8"
        >
          {isStarting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Starting...
            </>
          ) : (
            "Start Quiz"
          )}
        </button>
      </div>
    );
  }

  if (isCompleting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Calculating your results...</p>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const options =
    currentQuestion.question_type === "true_false"
      ? ["True", "False"]
      : (currentQuestion.options as string[]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Exit
        </button>
        <span className="text-sm text-muted-foreground font-medium">
          Question {currentIndex + 1} of {totalQuestions}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
          }}
        />
      </div>

      {/* Question */}
      <div className="pt-4">
        <p className="text-xl sm:text-2xl font-medium leading-relaxed">
          {currentQuestion.question}
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => setSelectedAnswer(option)}
            disabled={isSubmitting}
            className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all text-base font-medium ${
              selectedAnswer === option
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border bg-card hover:border-border/80 hover:bg-secondary/40 text-foreground/90"
            } disabled:opacity-50`}
            aria-pressed={selectedAnswer === option}
          >
            <span className="flex items-center gap-3">
              <span
                className={`flex-shrink-0 size-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                  selectedAnswer === option
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              {option}
            </span>
          </button>
        ))}
      </div>

      {/* Next button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleNext}
          disabled={!selectedAnswer || isSubmitting}
          className="btn-primary py-3 px-6 disabled:opacity-40"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isLastQuestion ? (
            <>
              <CheckCircle2 className="size-4" />
              Submit Quiz
            </>
          ) : (
            <>
              Next
              <ArrowRight className="size-4" strokeWidth={2} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
