import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { learningNotesSchema, type LearningNotesOutput } from "@/lib/schemas/learning-notes";

const MODEL_NAME = "gemini-3.6-flash";

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
}

/**
 * Generate structured learning notes from a finalized conversation.
 *
 * Uses Vercel AI SDK's `generateObject()` with Zod schema validation
 * to ensure the AI output matches the expected structure.
 *
 * Runs server-side only — never expose to the browser.
 */
export async function generateLearningNotes(
  params: GenerateNotesParams
): Promise<GenerateNotesResult | GenerateNotesError> {
  const { subject, topic, companionName, messages } = params;

  if (messages.length === 0) {
    return { success: false, error: "No conversation messages to generate notes from" };
  }

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
    const { object } = await generateObject({
      model: google(MODEL_NAME),
      schema: learningNotesSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return {
      success: true,
      notes: object,
      modelName: MODEL_NAME,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown AI generation error";
    console.error("[generate-notes] AI generation failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
