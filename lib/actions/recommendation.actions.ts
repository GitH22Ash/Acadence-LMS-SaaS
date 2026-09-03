"use server";

import { auth } from "@clerk/nextjs/server";
import { getDueCards } from "./practice.actions";
import { getUserTopics } from "./topic.actions";
import { getUserSessions } from "./companion.actions";

export type RecommendationType =
  | "flashcard_review"
  | "weak_topic"
  | "quiz"
  | "continue_session"
  | "new_session";

export interface LearningRecommendation {
  type: RecommendationType;
  title: string;
  description: string;
  priority: number;
  href: string;
  subject?: string;
}

/**
 * Deterministic recommendation engine that suggests the next best learning actions.
 */
export async function getLearningRecommendations(): Promise<LearningRecommendation[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const recommendations: LearningRecommendation[] = [];

  // 1. Due flashcards
  const dueCards = await getDueCards();
  if (dueCards.length > 0) {
    recommendations.push({
      type: "flashcard_review",
      title: "Review your flashcards",
      description: `${dueCards.length} cards are due today.`,
      priority: 1,
      href: "/practice/flashcards/review",
    });
  }

  // 2. Weak topics
  const topics = await getUserTopics();
  const weakTopics = topics.filter((t) => t.needs_review);
  if (weakTopics.length > 0) {
    // Pick the most weak one
    const weakest = weakTopics.sort((a, b) => a.mastery_score - b.mastery_score)[0];
    recommendations.push({
      type: "weak_topic",
      title: `Review ${weakest.name}`,
      description: `Your mastery is ${weakest.mastery_score}%. Practice to improve.`,
      priority: 2,
      href: `/practice/quizzes?adaptive=true`, // Suggest adaptive quiz
      subject: weakest.subject,
    });
  }

  // 3. Continue last session
  const sessions = await getUserSessions(userId);
  if (sessions && sessions.length > 0) {
    const lastSession = sessions[0];
    // Suggest continuing the last subject
    recommendations.push({
      type: "continue_session",
      title: `Continue ${lastSession.subject}`,
      description: lastSession.topic 
        ? `You were learning: ${lastSession.topic}` 
        : `Continue your recent session.`,
      priority: 3,
      href: `/companions`, // Or direct link to companion if appropriate
      subject: lastSession.subject,
    });
  } else {
    recommendations.push({
      type: "new_session",
      title: "Start Learning",
      description: "Create a new companion to start a learning session.",
      priority: 4,
      href: "/companions/new",
    });
  }

  // Sort by priority and return top 3
  return recommendations.sort((a, b) => a.priority - b.priority).slice(0, 3);
}
