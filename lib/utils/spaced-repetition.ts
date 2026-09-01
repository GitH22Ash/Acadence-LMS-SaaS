/**
 * Simplified SM-2 Spaced Repetition Algorithm
 *
 * Based on the SuperMemo SM-2 algorithm. Calculates the next review interval
 * and updated ease factor based on the user's rating.
 *
 * Rating scale:
 *   again → review very soon (failed to recall)
 *   hard  → recalled with significant difficulty
 *   good  → recalled with some effort (normal)
 *   easy  → recalled effortlessly
 *
 * The algorithm adjusts:
 *   - interval_days: how many days until the next review
 *   - ease_factor: a multiplier that makes intervals grow faster or slower
 *
 * Reference: https://en.wikipedia.org/wiki/SuperMemo#SM-2_algorithm
 */

export type ReviewRating = "again" | "hard" | "good" | "easy";

interface ReviewInput {
  rating: ReviewRating;
  currentIntervalDays: number;
  currentEaseFactor: number;
  reviewCount: number;
}

interface ReviewOutput {
  nextIntervalDays: number;
  nextEaseFactor: number;
  nextReviewAt: Date;
}

const MIN_EASE_FACTOR = 1.3;

export function calculateNextReview(input: ReviewInput): ReviewOutput {
  const { rating, currentIntervalDays, currentEaseFactor, reviewCount } = input;

  let nextInterval: number;
  let nextEase = currentEaseFactor;

  if (reviewCount === 0) {
    // First review — use fixed initial intervals
    switch (rating) {
      case "again":
        nextInterval = 0.007; // ~10 minutes (fractional day)
        nextEase = Math.max(MIN_EASE_FACTOR, currentEaseFactor - 0.2);
        break;
      case "hard":
        nextInterval = 1;
        nextEase = Math.max(MIN_EASE_FACTOR, currentEaseFactor - 0.15);
        break;
      case "good":
        nextInterval = 1;
        break;
      case "easy":
        nextInterval = 4;
        nextEase = currentEaseFactor + 0.15;
        break;
    }
  } else if (reviewCount === 1) {
    // Second review
    switch (rating) {
      case "again":
        nextInterval = 1;
        nextEase = Math.max(MIN_EASE_FACTOR, currentEaseFactor - 0.2);
        break;
      case "hard":
        nextInterval = 3;
        nextEase = Math.max(MIN_EASE_FACTOR, currentEaseFactor - 0.15);
        break;
      case "good":
        nextInterval = 6;
        break;
      case "easy":
        nextInterval = 8;
        nextEase = currentEaseFactor + 0.15;
        break;
    }
  } else {
    // Subsequent reviews — use the SM-2 formula
    switch (rating) {
      case "again":
        nextInterval = 1;
        nextEase = Math.max(MIN_EASE_FACTOR, currentEaseFactor - 0.2);
        break;
      case "hard":
        nextInterval = Math.max(1, currentIntervalDays * 1.2);
        nextEase = Math.max(MIN_EASE_FACTOR, currentEaseFactor - 0.15);
        break;
      case "good":
        nextInterval = Math.max(1, currentIntervalDays * currentEaseFactor);
        break;
      case "easy":
        nextInterval = Math.max(
          1,
          currentIntervalDays * currentEaseFactor * 1.3
        );
        nextEase = currentEaseFactor + 0.15;
        break;
    }
  }

  // Calculate the actual next review date
  const now = new Date();
  const nextReviewAt = new Date(
    now.getTime() + nextInterval * 24 * 60 * 60 * 1000
  );

  return {
    nextIntervalDays: Math.round(nextInterval * 1000) / 1000, // 3 decimal precision
    nextEaseFactor: Math.round(nextEase * 100) / 100,
    nextReviewAt,
  };
}
