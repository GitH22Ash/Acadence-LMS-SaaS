import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { quizOutputSchema, type QuizOutput } from "@/lib/schemas/quiz";

const MODEL_NAME = "gemini-3.6-flash";

interface GenerateQuizParams {
  subject: string;
  topic?: string;
  noteTitle?: string;
  summary: string;
  keyConcepts: string[];
  importantPoints: string[];
  examples: string[];
  adaptiveContext?: {
    weakTopics: string[];
    strongTopics: string[];
  };
}

interface GenerateQuizResult {
  success: true;
  quiz: QuizOutput;
  modelName: string;
}

interface GenerateQuizError {
  success: false;
  error: string;
}

/**
 * Generate a structured quiz from learning notes.
 *
 * Uses Vercel AI SDK's `generateObject()` with Zod schema validation
 * to ensure the AI output matches the expected structure.
 *
 * Runs server-side only — never expose to the browser.
 */
export async function generateQuiz(
  params: GenerateQuizParams
): Promise<GenerateQuizResult | GenerateQuizError> {
  const {
    subject,
    topic,
    noteTitle,
    summary,
    keyConcepts,
    importantPoints,
    examples,
  } = params;

  if (!summary && keyConcepts.length === 0 && importantPoints.length === 0) {
    return {
      success: false,
      error: "Not enough learning material to generate a quiz",
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

  const learningMaterial = materialParts.join("\n\n");

  let adaptiveInstructions = "";
  if (params.adaptiveContext) {
    const { weakTopics, strongTopics } = params.adaptiveContext;
    if (weakTopics.length > 0) {
      adaptiveInstructions = `\nADAPTIVE QUIZ INSTRUCTIONS:\n- These are the student's weak topics: ${weakTopics.join(", ")}.\n- These are strong topics: ${strongTopics.join(", ")}.\n- Construct a focused quiz. For example, if generating 6 questions, generate ~4 focused on weak topics, 1 moderate topic, 1 reinforcement question.\n- Questions must remain grounded in the student's learning material.`;
    }
  }

  const systemPrompt = `You are an expert educational quiz designer. Your task is to create a quiz from structured learning notes that tests a student's understanding of the material.

Guidelines:
- Questions must test understanding of material ACTUALLY discussed — do NOT introduce unrelated facts.
- Mix question types: use both multiple_choice and true_false.
- For multiple_choice: provide exactly 4 options. Make distractors plausible but clearly distinguishable from the correct answer.
- For true_false: options must be exactly ["True", "False"].
- The correct answer MUST exactly match one of the provided options.
- Avoid questions where multiple options could reasonably be correct.
- Each explanation should be educational — briefly explain WHY the answer is correct.
- Infer difficulty from conceptual complexity.
- Generate 5–10 questions depending on material richness. Do not create 10 questions from thin material.
- Order questions from easier to harder when possible.${adaptiveInstructions}`;

  const userPrompt = `Subject: ${subject}${topic ? `\nTopic: ${topic}` : ""}${noteTitle ? `\nNote Title: ${noteTitle}` : ""}

Here is the learning material from the student's session:

${learningMaterial}

Generate a quiz that tests the student's understanding of these concepts.`;

  try {
    const { object } = await generateObject({
      model: google(MODEL_NAME),
      schema: quizOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return {
      success: true,
      quiz: object,
      modelName: MODEL_NAME,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown AI generation error";
    console.error("[generate-quiz] AI generation failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
