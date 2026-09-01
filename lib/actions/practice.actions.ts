"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "@/lib/supabase";
import { generateFlashcards } from "@/lib/ai/generate-flashcards";
import { generateQuiz } from "@/lib/ai/generate-quiz";
import {
  calculateNextReview,
  type ReviewRating,
} from "@/lib/utils/spaced-repetition";

// ---------------------------------------------------------------------------
// FLASHCARD ACTIONS
// ---------------------------------------------------------------------------

/**
 * Generate flashcards from an existing learning note.
 * Checks for existing decks from the same note to prevent duplicates.
 */
export async function generateFlashcardsFromNote(noteId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Authentication required");

  const supabase = createSupabaseClient();

  // Load the note and verify ownership
  const { data: note, error: noteError } = await supabase
    .from("learning_notes")
    .select("*")
    .eq("id", noteId)
    .eq("user_id", userId)
    .single();

  if (noteError || !note) {
    throw new Error("Note not found or access denied");
  }

  // Check for existing deck from this note (prevent duplicates)
  const { data: existingDeck } = await supabase
    .from("flashcard_decks")
    .select("id")
    .eq("source_note_id", noteId)
    .eq("user_id", userId)
    .single();

  if (existingDeck) {
    return { success: true, deckId: existingDeck.id, alreadyExists: true };
  }

  // Generate flashcards with AI
  const result = await generateFlashcards({
    subject: note.subject || "General",
    topic: note.title || undefined,
    noteTitle: note.title || undefined,
    summary: note.summary || "",
    keyConcepts: (note.key_concepts as string[]) || [],
    importantPoints: (note.important_points as string[]) || [],
    examples: (note.examples as string[]) || [],
    questionsToReview: (note.questions_to_review as string[]) || [],
  });

  if (!result.success) {
    console.error("[practice] Flashcard generation failed:", result.error);
    throw new Error("Failed to generate flashcards");
  }

  // Save the deck
  const { data: deck, error: deckError } = await supabase
    .from("flashcard_decks")
    .insert({
      user_id: userId,
      title: result.flashcards.title,
      subject: result.flashcards.subject,
      source_note_id: noteId,
      source_session_id: note.session_id,
    })
    .select("id")
    .single();

  if (deckError || !deck) {
    console.error("[practice] Failed to save deck:", deckError?.message);
    throw new Error("Failed to save flashcard deck");
  }

  // Save individual cards
  const cardRows = result.flashcards.cards.map((card) => ({
    deck_id: deck.id,
    front: card.front,
    back: card.back,
    hint: card.hint || null,
    difficulty: card.difficulty,
    source_note_id: noteId,
  }));

  const { error: cardsError } = await supabase
    .from("flashcards")
    .insert(cardRows);

  if (cardsError) {
    console.error("[practice] Failed to save cards:", cardsError.message);
    // Clean up the deck if cards failed
    await supabase.from("flashcard_decks").delete().eq("id", deck.id);
    throw new Error("Failed to save flashcards");
  }

  revalidatePath("/practice");
  revalidatePath("/practice/flashcards");

  return { success: true, deckId: deck.id, alreadyExists: false };
}

/**
 * Get all flashcard decks for the authenticated user with card counts.
 */
export async function getUserDecks(): Promise<FlashcardDeckCard[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = createSupabaseClient();

  const { data: decks, error } = await supabase
    .from("flashcard_decks")
    .select(`
      id,
      title,
      subject,
      source_note_id,
      created_at,
      flashcards (id)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !decks) {
    console.error("[practice] Failed to fetch decks:", error?.message);
    return [];
  }

  // Get due counts for each deck's cards
  const now = new Date().toISOString();
  const deckCards: FlashcardDeckCard[] = [];

  for (const deck of decks) {
    const cards = (deck.flashcards as any[]) || [];
    const cardIds = cards.map((c: any) => c.id);

    let dueCount = cards.length; // Default: all cards are due (never reviewed)

    if (cardIds.length > 0) {
      // Get latest review for each card to calculate due count
      const { data: reviews } = await supabase
        .from("flashcard_reviews")
        .select("flashcard_id, next_review_at")
        .in("flashcard_id", cardIds)
        .eq("user_id", userId)
        .order("reviewed_at", { ascending: false });

      if (reviews && reviews.length > 0) {
        // Get the latest review per card
        const latestByCard = new Map<string, string>();
        for (const r of reviews) {
          if (!latestByCard.has(r.flashcard_id)) {
            latestByCard.set(r.flashcard_id, r.next_review_at);
          }
        }

        // Count: cards never reviewed + cards where next_review_at <= now
        const reviewedCardIds = new Set(latestByCard.keys());
        const neverReviewed = cardIds.filter(
          (id: string) => !reviewedCardIds.has(id)
        ).length;
        const dueReviewed = Array.from(latestByCard.values()).filter(
          (nextReview) => nextReview <= now
        ).length;

        dueCount = neverReviewed + dueReviewed;
      }
    }

    deckCards.push({
      id: deck.id,
      title: deck.title,
      subject: deck.subject,
      source_note_id: deck.source_note_id,
      card_count: cards.length,
      due_count: dueCount,
      created_at: deck.created_at,
    });
  }

  return deckCards;
}

/**
 * Get a deck with all its cards.
 */
export async function getDeckWithCards(deckId: string) {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createSupabaseClient();

  const { data: deck, error } = await supabase
    .from("flashcard_decks")
    .select(`
      *,
      flashcards (*)
    `)
    .eq("id", deckId)
    .eq("user_id", userId)
    .single();

  if (error || !deck) return null;

  return deck;
}

/**
 * Get due cards for review — optionally filtered by deck.
 */
export async function getDueCards(
  deckId?: string
): Promise<FlashcardWithReview[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = createSupabaseClient();
  const now = new Date().toISOString();

  // Build the cards query
  let cardsQuery = supabase.from("flashcards").select(`
    *,
    flashcard_decks!inner (user_id)
  `);

  if (deckId) {
    cardsQuery = cardsQuery.eq("deck_id", deckId);
  }

  const { data: allCards, error: cardsError } = await cardsQuery;

  if (cardsError || !allCards) {
    console.error("[practice] Failed to fetch cards:", cardsError?.message);
    return [];
  }

  // Filter to only user's cards
  const userCards = allCards.filter(
    (c: any) => c.flashcard_decks?.user_id === userId
  );

  if (userCards.length === 0) return [];

  const cardIds = userCards.map((c: any) => c.id);

  // Get latest reviews for these cards
  const { data: reviews } = await supabase
    .from("flashcard_reviews")
    .select("*")
    .in("flashcard_id", cardIds)
    .eq("user_id", userId)
    .order("reviewed_at", { ascending: false });

  // Build a map of latest review per card
  const latestReviewByCard = new Map<string, any>();
  if (reviews) {
    for (const r of reviews) {
      if (!latestReviewByCard.has(r.flashcard_id)) {
        latestReviewByCard.set(r.flashcard_id, r);
      }
    }
  }

  // Filter to due cards: never reviewed OR next_review_at <= now
  const dueCards: FlashcardWithReview[] = userCards
    .filter((card: any) => {
      const latestReview = latestReviewByCard.get(card.id);
      if (!latestReview) return true; // Never reviewed
      return latestReview.next_review_at <= now;
    })
    .map((card: any) => {
      const { flashcard_decks, ...cardData } = card;
      return {
        ...cardData,
        latest_review: latestReviewByCard.get(card.id) || null,
      };
    });

  return dueCards;
}

/**
 * Submit a flashcard review and calculate next interval using SM-2.
 */
export async function submitFlashcardReview(
  flashcardId: string,
  rating: ReviewRating
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Authentication required");

  const supabase = createSupabaseClient();

  // Verify card ownership through deck
  const { data: card } = await supabase
    .from("flashcards")
    .select(`
      id,
      flashcard_decks!inner (user_id)
    `)
    .eq("id", flashcardId)
    .single();

  if (!card || (card as any).flashcard_decks?.user_id !== userId) {
    throw new Error("Card not found or access denied");
  }

  // Get the latest review for this card (if any)
  const { data: latestReview } = await supabase
    .from("flashcard_reviews")
    .select("*")
    .eq("flashcard_id", flashcardId)
    .eq("user_id", userId)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .single();

  // Calculate next review using SM-2
  const reviewResult = calculateNextReview({
    rating,
    currentIntervalDays: latestReview?.interval_days ?? 0,
    currentEaseFactor: latestReview?.ease_factor ?? 2.5,
    reviewCount: latestReview?.review_count ?? 0,
  });

  // Insert the review record
  const { error } = await supabase.from("flashcard_reviews").insert({
    flashcard_id: flashcardId,
    user_id: userId,
    rating,
    next_review_at: reviewResult.nextReviewAt.toISOString(),
    interval_days: reviewResult.nextIntervalDays,
    ease_factor: reviewResult.nextEaseFactor,
    review_count: (latestReview?.review_count ?? 0) + 1,
  });

  if (error) {
    console.error("[practice] Failed to save review:", error.message);
    throw new Error("Failed to save review");
  }

  return { success: true, nextReviewAt: reviewResult.nextReviewAt.toISOString() };
}

/**
 * Get a lightweight summary for the Practice hub.
 */
export async function getPracticeSummary(): Promise<PracticeSummary> {
  const { userId } = await auth();
  if (!userId) {
    return {
      due_card_count: 0,
      total_deck_count: 0,
      total_quiz_count: 0,
      recent_decks: [],
      recent_quizzes: [],
    };
  }

  // Fetch decks (reuse getUserDecks for consistency)
  const decks = await getUserDecks();
  const quizzes = await getUserQuizzes();

  const dueCardCount = decks.reduce((sum, d) => sum + d.due_count, 0);

  return {
    due_card_count: dueCardCount,
    total_deck_count: decks.length,
    total_quiz_count: quizzes.length,
    recent_decks: decks.slice(0, 4),
    recent_quizzes: quizzes.slice(0, 4),
  };
}

// ---------------------------------------------------------------------------
// QUIZ ACTIONS
// ---------------------------------------------------------------------------

/**
 * Generate a quiz from an existing learning note.
 * Checks for existing quizzes from the same note.
 */
export async function generateQuizFromNote(noteId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Authentication required");

  const supabase = createSupabaseClient();

  // Load the note and verify ownership
  const { data: note, error: noteError } = await supabase
    .from("learning_notes")
    .select("*")
    .eq("id", noteId)
    .eq("user_id", userId)
    .single();

  if (noteError || !note) {
    throw new Error("Note not found or access denied");
  }

  // Generate quiz with AI
  const result = await generateQuiz({
    subject: note.subject || "General",
    topic: note.title || undefined,
    noteTitle: note.title || undefined,
    summary: note.summary || "",
    keyConcepts: (note.key_concepts as string[]) || [],
    importantPoints: (note.important_points as string[]) || [],
    examples: (note.examples as string[]) || [],
  });

  if (!result.success) {
    console.error("[practice] Quiz generation failed:", result.error);
    throw new Error("Failed to generate quiz");
  }

  // Save the quiz
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      user_id: userId,
      title: result.quiz.title,
      subject: result.quiz.subject,
      source_note_id: noteId,
      source_session_id: note.session_id,
      question_count: result.quiz.questions.length,
    })
    .select("id")
    .single();

  if (quizError || !quiz) {
    console.error("[practice] Failed to save quiz:", quizError?.message);
    throw new Error("Failed to save quiz");
  }

  // Save questions
  const questionRows = result.quiz.questions.map((q, index) => ({
    quiz_id: quiz.id,
    question: q.question,
    question_type: q.type,
    options: q.options,
    correct_answer: q.correctAnswer,
    explanation: q.explanation || null,
    difficulty: q.difficulty,
    position: index,
  }));

  const { error: questionsError } = await supabase
    .from("quiz_questions")
    .insert(questionRows);

  if (questionsError) {
    console.error(
      "[practice] Failed to save questions:",
      questionsError.message
    );
    await supabase.from("quizzes").delete().eq("id", quiz.id);
    throw new Error("Failed to save quiz questions");
  }

  revalidatePath("/practice");
  revalidatePath("/practice/quizzes");

  return { success: true, quizId: quiz.id };
}

/**
 * Get all quizzes for the authenticated user.
 */
export async function getUserQuizzes(): Promise<QuizCard[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = createSupabaseClient();

  const { data: quizzes, error } = await supabase
    .from("quizzes")
    .select(`
      id,
      title,
      subject,
      source_note_id,
      question_count,
      created_at,
      quiz_attempts (
        id,
        score,
        total_questions,
        completed_at
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !quizzes) {
    console.error("[practice] Failed to fetch quizzes:", error?.message);
    return [];
  }

  return quizzes.map((quiz: any) => {
    const attempts = (quiz.quiz_attempts as any[]) || [];
    const completedAttempts = attempts.filter((a: any) => a.completed_at);
    const lastAttempt =
      completedAttempts.length > 0
        ? completedAttempts.sort(
            (a: any, b: any) =>
              new Date(b.completed_at).getTime() -
              new Date(a.completed_at).getTime()
          )[0]
        : null;

    return {
      id: quiz.id,
      title: quiz.title,
      subject: quiz.subject,
      source_note_id: quiz.source_note_id,
      question_count: quiz.question_count,
      last_score: lastAttempt?.score ?? null,
      last_total: lastAttempt?.total_questions ?? null,
      attempt_count: completedAttempts.length,
      created_at: quiz.created_at,
    };
  });
}

/**
 * Get quiz with all questions.
 */
export async function getQuizWithQuestions(quizId: string) {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createSupabaseClient();

  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select(`
      *,
      quiz_questions (*)
    `)
    .eq("id", quizId)
    .eq("user_id", userId)
    .single();

  if (error || !quiz) return null;

  // Sort questions by position
  if (quiz.quiz_questions) {
    (quiz.quiz_questions as any[]).sort(
      (a: any, b: any) => a.position - b.position
    );
  }

  return quiz;
}

/**
 * Start a new quiz attempt.
 */
export async function startQuizAttempt(quizId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Authentication required");

  const supabase = createSupabaseClient();

  // Verify quiz ownership
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, question_count")
    .eq("id", quizId)
    .eq("user_id", userId)
    .single();

  if (!quiz) throw new Error("Quiz not found or access denied");

  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: userId,
      total_questions: quiz.question_count,
    })
    .select("id")
    .single();

  if (error || !attempt) {
    throw new Error("Failed to start quiz attempt");
  }

  return { attemptId: attempt.id };
}

/**
 * Submit a single quiz answer.
 */
export async function submitQuizAnswer(
  attemptId: string,
  questionId: string,
  answer: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Authentication required");

  const supabase = createSupabaseClient();

  // Verify attempt ownership
  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select("id, completed_at")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .single();

  if (!attempt) throw new Error("Attempt not found or access denied");
  if (attempt.completed_at) throw new Error("Quiz already completed");

  // Get the correct answer
  const { data: question } = await supabase
    .from("quiz_questions")
    .select("correct_answer")
    .eq("id", questionId)
    .single();

  if (!question) throw new Error("Question not found");

  const isCorrect = answer === question.correct_answer;

  // Check for existing answer (prevent duplicates)
  const { data: existing } = await supabase
    .from("quiz_answers")
    .select("id")
    .eq("attempt_id", attemptId)
    .eq("question_id", questionId)
    .single();

  if (existing) {
    // Update existing answer
    await supabase
      .from("quiz_answers")
      .update({ answer, is_correct: isCorrect })
      .eq("id", existing.id);
  } else {
    // Insert new answer
    const { error } = await supabase.from("quiz_answers").insert({
      attempt_id: attemptId,
      question_id: questionId,
      answer,
      is_correct: isCorrect,
    });

    if (error) {
      console.error("[practice] Failed to save answer:", error.message);
      throw new Error("Failed to save answer");
    }
  }

  return { success: true, isCorrect };
}

/**
 * Complete a quiz attempt — calculate score and weak topics.
 */
export async function completeQuizAttempt(attemptId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Authentication required");

  const supabase = createSupabaseClient();

  // Verify ownership
  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, completed_at")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .single();

  if (!attempt) throw new Error("Attempt not found or access denied");
  if (attempt.completed_at) {
    return { success: true, alreadyCompleted: true };
  }

  // Get all answers for this attempt
  const { data: answers } = await supabase
    .from("quiz_answers")
    .select(`
      *,
      quiz_questions!inner (question, question_type, correct_answer, explanation)
    `)
    .eq("attempt_id", attemptId);

  if (!answers || answers.length === 0) {
    throw new Error("No answers found for this attempt");
  }

  const score = answers.filter((a: any) => a.is_correct).length;

  // Identify weak topics from incorrect answers
  const incorrectAnswers = answers.filter((a: any) => !a.is_correct);
  const weakTopics = incorrectAnswers.map(
    (a: any) => (a.quiz_questions as any)?.question || "Unknown topic"
  );

  // Update the attempt
  const { error } = await supabase
    .from("quiz_attempts")
    .update({
      score,
      completed_at: new Date().toISOString(),
      weak_topics: weakTopics,
    })
    .eq("id", attemptId)
    .eq("user_id", userId);

  if (error) {
    console.error("[practice] Failed to complete attempt:", error.message);
    throw new Error("Failed to complete quiz");
  }

  revalidatePath("/practice");
  revalidatePath("/practice/quizzes");

  return { success: true, score, total: answers.length };
}

/**
 * Get full quiz attempt results.
 */
export async function getQuizAttemptResults(
  attemptId: string
): Promise<QuizAttemptResult | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createSupabaseClient();

  // Get the attempt
  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .single();

  if (!attempt) return null;

  // Get the quiz
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", attempt.quiz_id)
    .eq("user_id", userId)
    .single();

  if (!quiz) return null;

  // Get answers with questions
  const { data: answers } = await supabase
    .from("quiz_answers")
    .select(`
      *,
      question:quiz_questions (*)
    `)
    .eq("attempt_id", attemptId)
    .order("created_at", { ascending: true });

  return {
    attempt: {
      ...attempt,
      weak_topics: (attempt.weak_topics as string[]) || [],
    },
    quiz,
    answers: (answers || []).map((a: any) => ({
      ...a,
      question: a.question,
    })),
  };
}

/**
 * Check if a note already has generated flashcards/quiz.
 */
export async function getNotesPracticeStatus(noteId: string) {
  const { userId } = await auth();
  if (!userId) return { hasDeck: false, hasQuiz: false, deckId: null, quizId: null };

  const supabase = createSupabaseClient();

  const { data: deck } = await supabase
    .from("flashcard_decks")
    .select("id")
    .eq("source_note_id", noteId)
    .eq("user_id", userId)
    .limit(1)
    .single();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id")
    .eq("source_note_id", noteId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return {
    hasDeck: !!deck,
    hasQuiz: !!quiz,
    deckId: deck?.id || null,
    quizId: quiz?.id || null,
  };
}
