import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { learningNotesSchema, type LearningNotesOutput } from "@/lib/schemas/learning-notes";

const MODEL_NAME = "gemini-3.6-flash";
const GENERATION_TIMEOUT_MS = 60_000; // 60 seconds

interface ConversationInput {
  role: "user" | "assistant";
  content: string;
}

interface GenerateNotesParams {
  subject: string;
  topic?: string;
  companionName?: string;
  messages: ConversationInput[];
}

interface GenerateNotesResult {
  success: true;
  notes: LearningNotesOutput;
  modelName: string;
}

interface GenerateNotesError {
  success: false;
  error: string;
  errorCategory: "auth" | "model" | "quota" | "timeout" | "network" | "schema" | "unknown";
}

/**
 * Classify an AI generation error into a user-friendly category.
 * Does NOT expose raw API details — only sanitized categories.
 */
function classifyError(error: unknown): { message: string; category: GenerateNotesError["errorCategory"] } {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("401") || lower.includes("permission") || lower.includes("forbidden") || lower.includes("403")) {
    return { message: "Invalid or missing API key", category: "auth" };
  }
  if (lower.includes("model") && (lower.includes("not found") || lower.includes("does not exist") || lower.includes("404"))) {
    return { message: `Model "${MODEL_NAME}" not found or unavailable`, category: "model" };
  }
  if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("429") || lower.includes("resource exhausted")) {
    return { message: "API quota or rate limit exceeded", category: "quota" };
  }
  if (lower.includes("timeout") || lower.includes("aborted") || lower.includes("abort") || lower.includes("deadline")) {
    return { message: "Generation timed out", category: "timeout" };
  }
  if (lower.includes("network") || lower.includes("econnrefused") || lower.includes("enotfound") || lower.includes("fetch failed") || lower.includes("socket")) {
    return { message: "Network error contacting AI provider", category: "network" };
  }
  if (lower.includes("schema") || lower.includes("validation") || lower.includes("parse") || lower.includes("structured")) {
    return { message: "AI output did not match expected schema", category: "schema" };
  }

  return { message: msg.slice(0, 200), category: "unknown" };
}

/**
 * Generate structured learning notes from a finalized conversation.
 *
 * Uses Vercel AI SDK's `generateObject()` with Zod schema validation
 * to ensure the AI output matches the expected structure.
 *
 * Includes a 60-second timeout via AbortSignal.
 *
 * Runs server-side only — never expose to the browser.
 */
export async function generateLearningNotes(
  params: GenerateNotesParams
): Promise<GenerateNotesResult | GenerateNotesError> {
  const { subject, topic, companionName, messages } = params;

  if (messages.length === 0) {
    return { success: false, error: "No conversation messages to generate notes from", errorCategory: "unknown" };
  }

  // Verify API key is present (don't log the value)
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    console.error("[notes-debug] GOOGLE_GENERATIVE_AI_API_KEY is not configured");
    return { success: false, error: "AI API key is not configured", errorCategory: "auth" };
  }
  console.log(`[notes-debug] API key configured: true, length: ${apiKey.length}`);

  // Format conversation for the AI prompt
  const formattedConversation = messages
    .map(
      (m) =>
        `${m.role === "assistant" ? (companionName || "Tutor") : "Student"}: ${m.content}`
    )
    .join("\n\n");

  const systemPrompt = `You are an expert educational note-taking assistant. Your task is to analyze a completed voice learning session and create comprehensive, structured study notes.

Guidelines:
- Extract concepts that were ACTUALLY discussed — do not invent content not present in the conversation.
- Provide a detailed summary that retains useful educational information. Do NOT over-summarize.
- Identify important explanations, examples, and teaching moments.
- Note any questions that were left unanswered or that the student should review.
- Only identify misconceptions when they are clearly demonstrated in the conversation.
- Suggest reasonable next learning steps based on what was covered.
- Do not add unrelated information or pretend the student understood something they did not demonstrate.
- The notes should serve as useful study material — they should be detailed enough to be valuable for review.

Bad summary: "The student learned about languages."
Good summary: "The conversation covered early forms of human communication, including spoken, written, and sign-based systems, and discussed the emergence of early written languages and their historical significance."`;

  const userPrompt = `Subject: ${subject}${topic ? `\nTopic: ${topic}` : ""}

Here is the complete conversation from the learning session:

${formattedConversation}

Generate comprehensive, structured learning notes from this conversation.`;

  try {
    console.log(`[notes-debug] 6 calling Gemini model=${MODEL_NAME} messageCount=${messages.length}`);

    const { object } = await generateObject({
      model: google(MODEL_NAME),
      schema: learningNotesSchema,
      system: systemPrompt,
      prompt: userPrompt,
      abortSignal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
    });

    console.log("[notes-debug] 7 Gemini returned successfully");

    return {
      success: true,
      notes: object,
      modelName: MODEL_NAME,
    };
  } catch (error) {
    const classified = classifyError(error);
    console.error(`[notes-debug] Gemini generation failed: category=${classified.category} message=${classified.message}`);
    return { success: false, error: classified.message, errorCategory: classified.category };
  }
}
