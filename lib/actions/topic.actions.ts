"use server";

import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export type TopicPerformanceEventType = "quiz" | "flashcard_review" | "session";

/**
 * Extracts topics from a newly generated note and upserts them into learning_topics.
 *
 * @param noteId - The ID of the note to extract topics from.
 * @param callerUserId - Optional. If provided, skips auth() lookup. Use this when
 *   calling from background contexts (e.g., after()) where Clerk auth is unavailable.
 */
export async function extractAndSyncTopics(noteId: string, callerUserId?: string) {
  const userId = callerUserId || (await auth()).userId;
  if (!userId) return { success: false, error: "Authentication required" };

  const supabase = createSupabaseClient();

  const { data: note, error: noteError } = await supabase
    .from("learning_notes")
    .select("subject, key_concepts, created_at")
    .eq("id", noteId)
    .eq("user_id", userId)
    .single();

  if (noteError || !note) {
    return { success: false, error: "Note not found" };
  }

  const subject = note.subject || "General";
  const concepts: string[] = (note.key_concepts as string[]) || [];

  if (concepts.length === 0) {
    return { success: true, message: "No concepts to extract" };
  }

  // Ensure topics exist for each concept
  for (const concept of concepts) {
    const { data: existingTopic } = await supabase
      .from("learning_topics")
      .select("id")
      .eq("user_id", userId)
      .eq("subject", subject)
      .eq("name", concept)
      .single();

    if (!existingTopic) {
      await supabase.from("learning_topics").insert({
        user_id: userId,
        subject,
        name: concept,
        last_studied_at: note.created_at || new Date().toISOString(),
      });
    } else {
      await supabase
        .from("learning_topics")
        .update({ last_studied_at: new Date().toISOString() })
        .eq("id", existingTopic.id);
    }
  }

  return { success: true };
}

/**
 * Records a performance event for a topic and recalculates its mastery.
 */
export async function recordTopicPerformance(
  topicId: string,
  sourceType: TopicPerformanceEventType,
  sourceId: string | null,
  score: number // 0 to 100
) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Authentication required" };

  const supabase = createSupabaseClient();

  // Insert event
  const { error: eventError } = await supabase
    .from("topic_performance_events")
    .insert({
      topic_id: topicId,
      user_id: userId,
      source_type: sourceType,
      source_id: sourceId,
      score,
    });

  if (eventError) {
    console.error("[topic] Failed to record performance:", eventError.message);
    return { success: false, error: "Failed to record event" };
  }

  // Recalculate mastery
  await calculateTopicMastery(topicId);

  return { success: true };
}

/**
 * Recalculates and updates the mastery score for a given topic based on recent events.
 */
export async function calculateTopicMastery(topicId: string) {
  const { userId } = await auth();
  if (!userId) return { success: false };

  const supabase = createSupabaseClient();

  // Get recent events for this topic
  const { data: events, error: eventsError } = await supabase
    .from("topic_performance_events")
    .select("source_type, score, created_at")
    .eq("topic_id", topicId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (eventsError || !events || events.length === 0) {
    return { success: false };
  }

  // Deterministic formula for mastery
  // We can separate events by type and weight them
  const quizEvents = events.filter((e: any) => e.source_type === "quiz");
  const flashcardEvents = events.filter((e: any) => e.source_type === "flashcard_review");

  const avgQuizScore =
    quizEvents.length > 0
      ? quizEvents.reduce((acc: number, e: any) => acc + e.score, 0) / quizEvents.length
      : null;

  const avgFlashcardScore =
    flashcardEvents.length > 0
      ? flashcardEvents.reduce((acc: number, e: any) => acc + e.score, 0) / flashcardEvents.length
      : null;

  let masteryScore = 0;

  if (avgQuizScore !== null && avgFlashcardScore !== null) {
    masteryScore = avgQuizScore * 0.5 + avgFlashcardScore * 0.5;
  } else if (avgQuizScore !== null) {
    masteryScore = avgQuizScore;
  } else if (avgFlashcardScore !== null) {
    masteryScore = avgFlashcardScore;
  }

  // Determine if it needs review (e.g. score < 60)
  const needsReview = masteryScore < 60;

  // Update the topic
  await supabase
    .from("learning_topics")
    .update({
      mastery_score: Math.round(masteryScore),
      needs_review: needsReview,
    })
    .eq("id", topicId);

  return { success: true, masteryScore, needsReview };
}

/**
 * Gets all topics for the authenticated user, grouped by subject if needed.
 */
export async function getUserTopics() {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = createSupabaseClient();

  const { data: topics, error } = await supabase
    .from("learning_topics")
    .select("*")
    .eq("user_id", userId)
    .order("subject", { ascending: true })
    .order("mastery_score", { ascending: true });

  if (error || !topics) return [];

  return topics;
}

/**
 * Identify topic IDs from a list of names/subjects (creates them if they don't exist).
 */
export async function ensureTopicsExist(subject: string, topicNames: string[]) {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = createSupabaseClient();
  const topicIds: string[] = [];

  for (const name of topicNames) {
    const { data: existingTopic } = await supabase
      .from("learning_topics")
      .select("id")
      .eq("user_id", userId)
      .eq("subject", subject)
      .eq("name", name)
      .single();

    if (existingTopic) {
      topicIds.push(existingTopic.id);
    } else {
      const { data: newTopic } = await supabase
        .from("learning_topics")
        .insert({
          user_id: userId,
          subject,
          name,
        })
        .select("id")
        .single();
      
      if (newTopic) {
        topicIds.push(newTopic.id);
      }
    }
  }

  return topicIds;
}
