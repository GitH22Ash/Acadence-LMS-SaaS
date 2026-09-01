"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { submitFlashcardReview } from "@/lib/actions/practice.actions";
import { ArrowLeft, RotateCcw, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { ReviewRating } from "@/lib/utils/spaced-repetition";

interface FlashcardReviewProps {
  cards: FlashcardWithReview[];
  deckTitle?: string;
}

const RATING_CONFIG: {
  value: ReviewRating;
  label: string;
  color: string;
  shortcut: string;
}[] = [
  { value: "again", label: "Again", color: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20", shortcut: "1" },
  { value: "hard", label: "Hard", color: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20", shortcut: "2" },
  { value: "good", label: "Good", color: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20", shortcut: "3" },
  { value: "easy", label: "Easy", color: "bg-success/10 text-success border-success/20 hover:bg-success/20", shortcut: "4" },
];

export default function FlashcardReview({
  cards,
  deckTitle,
}: FlashcardReviewProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [isComplete, setIsComplete] = useState(false);

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;

  const handleFlip = useCallback(() => {
    if (!isFlipped) setIsFlipped(true);
  }, [isFlipped]);

  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      if (isSubmitting || !currentCard) return;

      setIsSubmitting(true);
      try {
        await submitFlashcardReview(currentCard.id, rating);
        setStats((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));

        if (currentIndex < totalCards - 1) {
          setCurrentIndex((prev) => prev + 1);
          setIsFlipped(false);
        } else {
          setIsComplete(true);
        }
      } catch (error) {
        console.error("Failed to submit review:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentCard, currentIndex, totalCards, isSubmitting]
  );

  // Keyboard handling
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isFlipped) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handleFlip();
        }
      } else {
        const ratingKeys: Record<string, ReviewRating> = {
          "1": "again",
          "2": "hard",
          "3": "good",
          "4": "easy",
        };
        if (ratingKeys[e.key]) {
          e.preventDefault();
          handleRate(ratingKeys[e.key]);
        }
      }
    },
    [isFlipped, handleFlip, handleRate]
  );

  if (isComplete) {
    const totalReviewed = stats.again + stats.hard + stats.good + stats.easy;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6 max-w-md mx-auto">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-success/10">
          <CheckCircle2 className="size-8 text-success" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-2xl mb-2">Review Complete</h2>
          <p className="text-muted-foreground">
            {totalReviewed} {totalReviewed === 1 ? "card" : "cards"} reviewed
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          {stats.easy > 0 && (
            <div className="rounded-xl bg-success/10 border border-success/20 p-3 text-center">
              <p className="text-2xl font-bold text-success">{stats.easy}</p>
              <p className="text-xs text-muted-foreground mt-1">Easy</p>
            </div>
          )}
          {stats.good > 0 && (
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.good}</p>
              <p className="text-xs text-muted-foreground mt-1">Good</p>
            </div>
          )}
          {stats.hard > 0 && (
            <div className="rounded-xl bg-warning/10 border border-warning/20 p-3 text-center">
              <p className="text-2xl font-bold text-warning">{stats.hard}</p>
              <p className="text-xs text-muted-foreground mt-1">Hard</p>
            </div>
          )}
          {stats.again > 0 && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center">
              <p className="text-2xl font-bold text-destructive">
                {stats.again}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Again</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full mt-2">
          <Link href="/practice" className="btn-primary py-3">
            Back to Practice
          </Link>
          <button
            onClick={() => {
              setCurrentIndex(0);
              setIsFlipped(false);
              setIsComplete(false);
              setStats({ again: 0, hard: 0, good: 0, easy: 0 });
            }}
            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
          >
            <RotateCcw className="size-4" />
            Review Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div
      className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Flashcard review"
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <Link
          href="/practice/flashcards"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Back
        </Link>
        <span className="text-sm text-muted-foreground font-medium">
          {currentIndex + 1} / {totalCards}
        </span>
      </div>

      {deckTitle && (
        <h2 className="text-xl font-bold text-center">{deckTitle}</h2>
      )}

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div
        className="flashcard-container w-full"
        style={{ perspective: "1000px" }}
      >
        <button
          onClick={handleFlip}
          className={`flashcard-inner w-full min-h-[280px] sm:min-h-[320px] relative cursor-pointer transition-transform duration-500 ${
            isFlipped ? "flashcard-flipped" : ""
          }`}
          style={{ transformStyle: "preserve-3d" }}
          aria-label={isFlipped ? "Card answer" : "Tap to reveal answer"}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl border border-border bg-card p-8 flex flex-col items-center justify-center text-center gap-4"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-xl sm:text-2xl font-medium leading-relaxed">
              {currentCard.front}
            </p>
            {!isFlipped && (
              <span className="text-sm text-muted-foreground mt-4">
                Tap to reveal · Space
              </span>
            )}
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl border border-border bg-card p-8 flex flex-col items-center justify-center text-center gap-4"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {currentCard.front}
            </p>
            <div className="w-12 h-px bg-border" />
            <p className="text-lg sm:text-xl leading-relaxed text-foreground/90">
              {currentCard.back}
            </p>
            {currentCard.hint && (
              <p className="text-sm text-muted-foreground/70 italic mt-2">
                Hint: {currentCard.hint}
              </p>
            )}
          </div>
        </button>
      </div>

      {/* Rating buttons — only visible when flipped */}
      {isFlipped && (
        <div className="flex gap-2 w-full">
          {RATING_CONFIG.map(({ value, label, color, shortcut }) => (
            <button
              key={value}
              onClick={() => handleRate(value)}
              disabled={isSubmitting}
              className={`flex-1 py-3 px-2 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 ${color}`}
              aria-label={`Rate as ${label}`}
            >
              <span className="block">{label}</span>
              <span className="text-xs opacity-60">{shortcut}</span>
            </button>
          ))}
        </div>
      )}

      {/* Show Answer button when not flipped */}
      {!isFlipped && (
        <button
          onClick={handleFlip}
          className="btn-primary w-full max-w-xs py-3"
        >
          Show Answer
        </button>
      )}
    </div>
  );
}
