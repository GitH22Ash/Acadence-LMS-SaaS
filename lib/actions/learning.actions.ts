"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "@/lib/supabase";
import { generateLearningNotes } from "@/lib/ai/generate-notes";
import {
  createSessionSchema,
  persistConversationSchema,
} from "@/lib/schemas/learning-notes";

// ---------------------------------------------------------------------------
// 1. Create a new learning session when a Vapi call starts
// ---------------------------------------------------------------------------
export async function createLearningSession(input: {
  companionId: string;
  subject: string;
  topic?: string;
  title?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Authentication required");

  const parsed = createSessionSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid session input");

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("learning_sessions")
    .insert({
      user_id: userId,
      companion_id: parsed.data.companionId,
      subject: parsed.data.subject,
      topic: parsed.data.topic || null,
      title: parsed.data.title || `${parsed.data.subject} Session`,
      status: "active",
      notes_status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[learning] Failed to create session:", error?.message);
    throw new Error("Failed to create learning session");
  }

  return { sessionId: data.id };
}

// ---------------------------------------------------------------------------
// 2. Associate the Vapi call ID with an Acadence session
// ---------------------------------------------------------------------------
export async function updateSessionCallId(
  sessionId: string,
  vapiCallId: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Authentication required");

  const supabase = await createSupabaseClient();

  const { error } = await supabase
    .from("learning_sessions")
    .update({ vapi_call_id: vapiCallId })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    console.error("[learning] Failed to update call ID:", error.message);
    // Non-critical — don't throw, log the error
  }
}

// ---------------------------------------------------------------------------
// 3. Persist finalized conversation when a Vapi call ends
// ---------------------------------------------------------------------------
export async function persistConversation(input: {
  sessionId: string;
  messages: { role: "user" | "assistant"; content: string; sequenceNumber: number; timestamp?: string }[];
  vapiCallId?: string;
  durationSeconds?: number;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Authentication required");

  const parsed = persistConversationSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[learning] Invalid conversation input:", parsed.error.flatten());
    throw new Error("Invalid conversation data");
  }

  const supabase = await createSupabaseClient();

  // ── Verify session ownership ──────────────────────────────────────────
  const { data: session, error: sessionError } = await supabase
    .from("learning_sessions")
    .select("id, user_id, status, companion_id, subject, topic")
    .eq("id", parsed.data.sessionId)
    .eq("user_id", userId)
    .single();

  if (sessionError || !session) {
    throw new Error("Session not found or access denied");
  }

  // ── Idempotency check ─────────────────────────────────────────────────
  if (session.status === "completed") {
    console.log("[learning] Session already completed, skipping:", session.id);
    return { success: true, alreadyProcessed: true };
  }

  // ── Insert finalized messages ─────────────────────────────────────────
  const messageRows = parsed.data.messages.map((m) => ({
    session_id: session.id,
    role: m.role,
    content: m.content,
    sequence_number: m.sequenceNumber,
    message_timestamp: m.timestamp || null,
  }));

  const { error: messagesError } = await supabase
    .from("conversation_messages")
    .insert(messageRows);

  if (messagesError) {
    console.error("[learning] Failed to insert messages:", messagesError.message);
    // If duplicate constraint violation, it's idempotent — still ok
    if (!messagesError.message.includes("duplicate")) {
      throw new Error("Failed to save conversation messages");
    }
  }

  // ── Update session status ─────────────────────────────────────────────
  const updateData: Record<string, unknown> = {
    status: "completed",
    ended_at: new Date().toISOString(),
  };
  if (parsed.data.vapiCallId) {
    updateData.vapi_call_id = parsed.data.vapiCallId;
  }
  if (parsed.data.durationSeconds) {
    updateData.duration_seconds = parsed.data.durationSeconds;
  }

  const { error: updateError } = await supabase
    .from("learning_sessions")
    .update(updateData)
    .eq("id", session.id)
    .eq("user_id", userId);

  if (updateError) {
    console.error("[learning] Failed to update session:", updateError.message);
  }

  // ── Trigger async note generation (fire-and-forget) ───────────────────
  // We don't await this — the user shouldn't wait for AI generation
  triggerNoteGeneration(session.id, userId).catch((err) => {
    console.error("[learning] Background note generation failed:", err);
  });

  return { success: true, alreadyProcessed: false };
}

// ---------------------------------------------------------------------------
// 4. Generate and save AI notes (called internally)
// ---------------------------------------------------------------------------
async function triggerNoteGeneration(sessionId: string, userId: string) {
  const supabase = await createSupabaseClient();

  // Update status to 'generating'
  await supabase
    .from("learning_sessions")
    .update({ notes_status: "generating" })
    .eq("id", sessionId)
    .eq("user_id", userId);

  // Fetch session details
  const { data: session } = await supabase
    .from("learning_sessions")
    .select("subject, topic, companion_id")
    .eq("id", sessionId)
    .single();

  if (!session) {
    console.error("[learning] Session not found for note generation:", sessionId);
    return;
  }

  // Fetch companion name
  const { data: companion } = await supabase
    .from("companions")
    .select("name")
    .eq("id", session.companion_id)
    .single();

  // Fetch finalized conversation messages
  const { data: messages } = await supabase
    .from("conversation_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("sequence_number", { ascending: true });

  if (!messages || messages.length === 0) {
    console.error("[learning] No messages found for note generation:", sessionId);
    await supabase
      .from("learning_sessions")
      .update({ notes_status: "failed" })
      .eq("id", sessionId);
    return;
  }

  // Generate notes with AI
  const result = await generateLearningNotes({
    subject: session.subject,
    topic: session.topic || undefined,
    companionName: companion?.name || undefined,
    messages: messages as { role: "user" | "assistant"; content: string }[],
  });

  if (!result.success) {
    console.error("[learning] AI generation failed:", result.error);
    await supabase
      .from("learning_sessions")
      .update({ notes_status: "failed" })
      .eq("id", sessionId);
    return;
  }

  // Upsert notes (session_id is UNIQUE, so this handles retries)
  const { data: insertedNote, error: notesError } = await supabase
    .from("learning_notes")
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        title: result.notes.title,
        subject: result.notes.subject,
        summary: result.notes.summary,
        key_concepts: result.notes.keyConcepts,
        important_points: result.notes.importantPoints,
        examples: result.notes.examples,
        questions_to_review: result.notes.questionsToReview,
        misconceptions: result.notes.misconceptions,
        next_steps: result.notes.nextSteps,
        model_name: result.modelName,
      },
      { onConflict: "session_id" }
    )
    .select("id")
    .single();

  if (notesError || !insertedNote) {
    console.error("[learning] Failed to save notes:", notesError?.message);
    await supabase
      .from("learning_sessions")
      .update({ notes_status: "failed" })
      .eq("id", sessionId);
    return;
  }

  // Mark notes as completed
  await supabase
    .from("learning_sessions")
    .update({ notes_status: "completed" })
    .eq("id", sessionId);

  // Extract and sync topics for learning intelligence
  const { extractAndSyncTopics } = await import("./topic.actions");
  await extractAndSyncTopics(insertedNote.id);

  console.log("[learning] Notes generated successfully for session:", sessionId);
  
  // Clear Next.js cache so the UI updates
  revalidatePath("/notes");
  revalidatePath(`/notes/${sessionId}`);
}

// ---------------------------------------------------------------------------
// 5. Retry note generation for a failed session
// ---------------------------------------------------------------------------
export async function retryNoteGeneration(sessionId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Authentication required");

  const supabase = await createSupabaseClient();

  // Verify ownership and failed status
  const { data: session } = await supabase
    .from("learning_sessions")
    .select("id, notes_status")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (!session) throw new Error("Session not found or access denied");

  if (session.notes_status !== "failed") {
    return { success: true, message: "Notes are not in a failed state" };
  }

  // Trigger regeneration
  await triggerNoteGeneration(sessionId, userId);
  return { success: true };
}

// ---------------------------------------------------------------------------
// 6. Get all notes for the authenticated user (for My Notes page)
// ---------------------------------------------------------------------------
export async function getUserNotes(search?: string): Promise<LearningNoteCard[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = await createSupabaseClient();

  // Query learning_sessions with their notes and companion info
  let query = supabase
    .from("learning_sessions")
    .select(`
      id,
      subject,
      topic,
      notes_status,
      started_at,
      companion_id,
      companions:companion_id (name),
      learning_notes (
        id,
        title,
        subject,
        summary,
        key_concepts,
        created_at
      )
    `)
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("started_at", { ascending: false });

  const { data: sessions, error } = await query;

  if (error) {
    console.error("[learning] Failed to fetch user notes:", error.message);
    return [];
  }

  if (!sessions) return [];

  // Transform into LearningNoteCard format, filtering out completed sessions with deleted notes
  const cards: LearningNoteCard[] = sessions
    .filter((session: any) => {
      const note = Array.isArray(session.learning_notes)
        ? session.learning_notes[0]
        : session.learning_notes;
        
      // If the note was deleted, it will have notes_status 'completed' but no note record
      if (session.notes_status === "completed" && !note) {
        return false;
      }
      return true;
    })
    .map((session: any) => {
      const note = Array.isArray(session.learning_notes)
        ? session.learning_notes[0]
        : session.learning_notes;
      const companion = session.companions as any;

      return {
        id: note?.id || session.id,
        session_id: session.id,
        title: note?.title || `${session.subject} Session`,
        subject: note?.subject || session.subject,
        summary: note?.summary || null,
        key_concepts: note?.key_concepts || [],
        created_at: note?.created_at || session.started_at,
        companion_name: companion?.name || null,
        notes_status: session.notes_status,
      };
    });

  // Client-side search filter (for simple text search)
  if (search && search.trim()) {
    const term = search.toLowerCase().trim();
    return cards.filter(
      (card) =>
        (card.title?.toLowerCase().includes(term)) ||
        (card.subject?.toLowerCase().includes(term)) ||
        (card.summary?.toLowerCase().includes(term))
    );
  }

  return cards;
}

// ---------------------------------------------------------------------------
// 7. Get a single note detail with full content
// ---------------------------------------------------------------------------
export async function getNoteDetail(
  noteIdOrSessionId: string
): Promise<LearningNoteDetail | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await createSupabaseClient();

  // Try to find by note ID first, then by session ID
  let { data: note, error } = await supabase
    .from("learning_notes")
    .select("*")
    .eq("id", noteIdOrSessionId)
    .eq("user_id", userId)
    .single();

  if (error || !note) {
    // Try by session_id
    const result = await supabase
      .from("learning_notes")
      .select("*")
      .eq("session_id", noteIdOrSessionId)
      .eq("user_id", userId)
      .single();

    note = result.data;
    if (!note) return null;
  }

  // Fetch session and companion context
  const { data: session } = await supabase
    .from("learning_sessions")
    .select("started_at, duration_seconds, status, companion_id")
    .eq("id", note.session_id)
    .single();

  let companionName: string | null = null;
  let companionSubject: string | null = null;
  if (session?.companion_id) {
    const { data: companion } = await supabase
      .from("companions")
      .select("name, subject")
      .eq("id", session.companion_id)
      .single();
    companionName = companion?.name || null;
    companionSubject = companion?.subject || null;
  }

  return {
    ...note,
    companion_name: companionName,
    companion_subject: companionSubject,
    session_started_at: session?.started_at || null,
    session_duration_seconds: session?.duration_seconds || null,
    session_status: session?.status || null,
  };
}

// ---------------------------------------------------------------------------
// 8. Get session detail (for viewing conversation or pending notes)
// ---------------------------------------------------------------------------
export async function getSessionDetail(sessionId: string) {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await createSupabaseClient();

  const { data: session } = await supabase
    .from("learning_sessions")
    .select(`
      *,
      companions:companion_id (name, subject, topic),
      learning_notes (id)
    `)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  return session || null;
}

// ---------------------------------------------------------------------------
// AI Notes - Delete & Notifications
// ---------------------------------------------------------------------------

export async function deleteNote(noteId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const supabase = createSupabaseClient();

  // The delete operation is protected by RLS on learning_notes 
  // (user_id = auth.jwt() ->> 'sub')
  const { error } = await supabase
    .from("learning_notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to delete note:", error);
    throw new Error("Failed to delete note");
  }

  // Clear caches
  revalidatePath("/notes");
  return { success: true };
}

export async function getNotesStatuses(sessionIds: string[]) {
  if (!sessionIds || sessionIds.length === 0) return [];
  
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("learning_sessions")
    .select("id, notes_status")
    .in("id", sessionIds)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to fetch note statuses:", error);
    return [];
  }

  return data;
}
