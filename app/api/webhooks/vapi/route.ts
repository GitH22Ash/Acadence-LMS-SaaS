import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateLearningNotes } from "@/lib/ai/generate-notes";

/**
 * Vapi Webhook — End-of-Call Report Handler
 *
 * This is a BACKUP mechanism for persisting conversations.
 * The primary path is the client-side server action in CompanionComponent.
 *
 * This endpoint:
 * 1. Receives Vapi's end-of-call-report server message
 * 2. Finds the matching Acadence learning session by vapi_call_id
 * 3. Persists conversation messages (if not already done)
 * 4. Triggers AI note generation
 *
 * Uses the Supabase service role key (server-side only) since there is
 * no Clerk user session in a webhook context.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Vapi sends different message types — we only care about end-of-call-report
    const messageType = body?.message?.type;
    if (messageType !== "end-of-call-report") {
      return NextResponse.json({ received: true, skipped: true });
    }

    const callId = body?.message?.call?.id;
    const messages = body?.message?.artifact?.messages;

    if (!callId) {
      console.error("[webhook/vapi] Missing call ID in payload");
      return NextResponse.json({ error: "Missing call ID" }, { status: 400 });
    }

    // Use service-role client for webhook context (no user session)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[webhook/vapi] Missing Supabase service role configuration");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the matching Acadence session
    const { data: session } = await supabase
      .from("learning_sessions")
      .select("id, user_id, status, notes_status, subject, topic, companion_id")
      .eq("vapi_call_id", callId)
      .single();

    if (!session) {
      // No matching session — this call wasn't tracked by Acadence
      console.log("[webhook/vapi] No session found for call:", callId);
      return NextResponse.json({ received: true, noSession: true });
    }

    // ── Idempotency check ─────────────────────────────────────────────────
    if (session.status === "completed") {
      console.log("[webhook/vapi] Session already completed:", session.id);
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    // ── Extract and normalize messages ────────────────────────────────────
    if (Array.isArray(messages) && messages.length > 0) {
      const normalizedMessages = messages
        .filter(
          (m: any) =>
            m.role === "user" || m.role === "assistant" || m.role === "bot"
        )
        .map((m: any, index: number) => ({
          session_id: session.id,
          role: m.role === "bot" ? "assistant" : m.role,
          content: m.message || m.content || "",
          sequence_number: index,
          message_timestamp: m.time ? new Date(m.time * 1000).toISOString() : null,
        }))
        .filter((m: any) => m.content.trim().length > 0);

      if (normalizedMessages.length > 0) {
        const { error: insertError } = await supabase
          .from("conversation_messages")
          .insert(normalizedMessages);

        if (insertError && !insertError.message.includes("duplicate")) {
          console.error("[webhook/vapi] Failed to insert messages:", insertError.message);
        }
      }
    }

    // ── Update session status ─────────────────────────────────────────────
    const callDuration = body?.message?.call?.duration;
    await supabase
      .from("learning_sessions")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        ...(callDuration ? { duration_seconds: Math.round(callDuration) } : {}),
      })
      .eq("id", session.id);

    // ── Trigger note generation ───────────────────────────────────────────
    try {
      // Fetch companion name
      const { data: companion } = await supabase
        .from("companions")
        .select("name")
        .eq("id", session.companion_id)
        .single();

      // Fetch messages we just saved
      const { data: savedMessages } = await supabase
        .from("conversation_messages")
        .select("role, content")
        .eq("session_id", session.id)
        .order("sequence_number", { ascending: true });

      // Skip note generation if already being handled by the client-side path
      if (session.notes_status === "completed" || session.notes_status === "generating") {
        console.log(`[webhook/vapi] Notes already ${session.notes_status}, skipping generation:`, session.id);
        return NextResponse.json({ received: true, processed: true, notesSkipped: true });
      }

      if (savedMessages && savedMessages.length > 0) {
        await supabase
          .from("learning_sessions")
          .update({ notes_status: "generating" })
          .eq("id", session.id);

        const result = await generateLearningNotes({
          subject: session.subject,
          topic: session.topic || undefined,
          companionName: companion?.name || undefined,
          messages: savedMessages as { role: "user" | "assistant"; content: string }[],
        });

        if (result.success) {
          await supabase.from("learning_notes").upsert(
            {
              session_id: session.id,
              user_id: session.user_id,
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
          );

          await supabase
            .from("learning_sessions")
            .update({ notes_status: "completed" })
            .eq("id", session.id);
        } else {
          await supabase
            .from("learning_sessions")
            .update({ notes_status: "failed" })
            .eq("id", session.id);
        }
      }
    } catch (noteError) {
      console.error("[webhook/vapi] Note generation failed:", noteError);
      await supabase
        .from("learning_sessions")
        .update({ notes_status: "failed" })
        .eq("id", session.id);
    }

    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error("[webhook/vapi] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** GET is not supported — return method not allowed */
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
