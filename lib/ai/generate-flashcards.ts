import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { flashcardOutputSchema, type FlashcardOutput } from "@/lib/schemas/flashcards";

const MODEL_NAME = "gemini-3.6-flash";

interface GenerateFlashcardsParams {
  subject: string;
  topic?: string;
  noteTitle?: string;
  summary: string;
  keyConcepts: string[];
  importantPoints: string[];
  examples: string[];
  questionsToReview: string[];
}

interface GenerateFlashcardsResult {
  success: true;
  flashcards: FlashcardOutput;
  modelName: string;
}

interface GenerateFlashcardsError {
  success: false;
  error: string;
}

/**
 * Generate structured flashcards from learning notes.
 *
 * Uses Vercel AI SDK's `generateObject()` with Zod schema validation
 * to ensure the AI output matches the expected structure.
 *
 * Runs server-side only — never expose to the browser.
 */
export async function generateFlashcards(
  params: GenerateFlashcardsParams
): Promise<GenerateFlashcardsResult | GenerateFlashcardsError> {
  const {
    subject,
    topic,
    noteTitle,
    summary,
    keyConcepts,
    importantPoints,
    examples,
    questionsToReview,
  } = params;

  if (!summary && keyConcepts.length === 0 && importantPoints.length === 0) {
    return {
      success: false,
      error: "Not enough learning material to generate flashcards",
    };
  }

  // Build the learning material context
  const materialParts: string[] = [];

  if (summary) {
    materialParts.push(`Summary:\n${summary}`);
  }
  if (keyConcepts.length > 0) {
    materialParts.push(
      `Key Concepts:\n${keyConcepts.map((c) => `- ${c}`).join("\n")}`
    );
  }
  if (importantPoints.length > 0) {
    materialParts.push(
      `Important Points:\n${importantPoints.map((p) => `- ${p}`).join("\n")}`
    );
  }
  if (examples.length > 0) {
    materialParts.push(
      `Examples:\n${examples.map((e) => `- ${e}`).join("\n")}`
    );
  }
  if (questionsToReview.length > 0) {
    materialParts.push(
      `Questions to Review:\n${questionsToReview.map((q) => `- ${q}`).join("\n")}`
    );
  }

  const learningMaterial = materialParts.join("\n\n");

  const systemPrompt = `You are an expert educational flashcard creator. Your task is to generate high-quality flashcards from structured learning notes that help students practice active recall.

Guidelines:
- Create cards that TEST RECALL — not cards that simply restate information.
- Each card should focus on a single concept or fact.
- The front should be a clear question or prompt.
- The back should be a concise, accurate answer.
- Include hints only when useful (e.g., for harder concepts).
- Infer difficulty from conceptual complexity — do NOT assign randomly.
- Prefer: definitions, important facts, relationships, distinctions, causes/effects, examples.
- Avoid trivial wording or overly broad questions.
- Only create cards from concepts ACTUALLY covered in the material — do NOT invent unrelated content.

Bad card:
  Front: "Tell me about history."
  Back: "History is the study of the past."

Good card:
  Front: "What was cuneiform?"
  Back: "One of the earliest known writing systems, developed in ancient Mesopotamia."

Generate between 5–15 cards depending on the richness of the material. Do not generate 15 cards from thin material.`;

  const userPrompt = `Subject: ${subject}${topic ? `\nTopic: ${topic}` : ""}${noteTitle ? `\nNote Title: ${noteTitle}` : ""}

Here is the learning material from the student's session:

${learningMaterial}

Generate flashcards that will help the student practice recall of these concepts.`;

  try {
    const { object } = await generateObject({
      model: google(MODEL_NAME),
      schema: flashcardOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return {
      success: true,
      flashcards: object,
      modelName: MODEL_NAME,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown AI generation error";
    console.error("[generate-flashcards] AI generation failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
