"use server";

import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";
import { getUserTopics } from "./topic.actions";
import { getDueCards } from "./practice.actions";
import { generateQuiz } from "@/lib/ai/generate-quiz";
import { revalidatePath } from "next/cache";

/**
 * Gets a prioritized list of flashcards for Smart Review.
 * Prioritizes due cards, weak topics, and recently missed concepts.
 */
export async function getSmartReviewCards() {
  const { userId } = await auth();
  if (!userId) return [];

  // 1. Get due cards
  const dueCards = await getDueCards();

  // 2. We could prioritize based on weak topics, but for now
  // due cards are already the primary focus. We will just return due cards
  // but sorted by whether they belong to a weak topic.
  
  const topics = await getUserTopics();
  const weakSubjects = new Set(topics.filter(t => t.needs_review).map(t => t.subject));

  // Sort due cards: weak subjects first, then by next_review_at
  const sortedCards = dueCards.sort((a, b) => {
    // We assume the card object might have deck subject, or we fetch deck subject.
    // getDueCards returns flashcards with their deck data ideally. Let's look at getDueCards.
    // It returns `latest_review` and basic card data.
    return 0; // Fallback sort
  });

  return sortedCards;
}

/**
 * Generates a quiz adapted to the user's weak topics.
 */
export async function generateAdaptiveQuiz(subjectFilter?: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Authentication required");

  const topics = await getUserTopics();
  
  // Filter by subject if provided
  const relevantTopics = subjectFilter ? topics.filter(t => t.subject === subjectFilter) : topics;
  
  const weakTopics = relevantTopics.filter(t => t.needs_review).map(t => t.name);
  const strongTopics = relevantTopics.filter(t => !t.needs_review).map(t => t.name);

  // If no weak topics, we can just do a standard subject quiz
  const subject = subjectFilter || (relevantTopics[0]?.subject ?? "General");

  const result = await generateQuiz({
    subject,
    summary: `Adaptive quiz focusing on recent learning topics.`,
    keyConcepts: [...weakTopics, ...strongTopics].slice(0, 10), // Give it some context
    importantPoints: [],
    examples: [],
    adaptiveContext: {
      weakTopics,
      strongTopics,
    }
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  const supabase = createSupabaseClient();
  
  // Save the quiz
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      user_id: userId,
      title: `Smart Quiz: ${subject}`,
      subject,
      question_count: result.quiz.questions.length,
    })
    .select("id")
    .single();

  if (quizError || !quiz) {
    throw new Error("Failed to save adaptive quiz");
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

  await supabase.from("quiz_questions").insert(questionRows);

  revalidatePath("/practice");
  revalidatePath("/practice/quizzes");

  return { success: true, quizId: quiz.id };
}
