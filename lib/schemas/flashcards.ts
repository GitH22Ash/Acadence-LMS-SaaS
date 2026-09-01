import { z } from "zod";

/**
 * Zod schema for a single AI-generated flashcard.
 */
export const flashcardItemSchema = z.object({
  front: z
    .string()
    .describe(
      "The question or prompt on the front of the card. Should test recall of a specific concept."
    ),
  back: z
    .string()
    .describe(
      "The answer on the back of the card. Should be concise but complete."
    ),
  hint: z
    .string()
    .optional()
    .describe("An optional hint to help the student recall the answer"),
  difficulty: z
    .enum(["easy", "medium", "hard"])
    .describe(
      "Inferred difficulty based on conceptual complexity. " +
      "'easy' for basic definitions, 'medium' for relationships and processes, " +
      "'hard' for multi-step reasoning or subtle distinctions."
    ),
});

/**
 * Zod schema for the complete AI-generated flashcard deck output.
 * Used with `generateObject()` to validate structured AI output.
 */
export const flashcardOutputSchema = z.object({
  title: z
    .string()
    .describe("A clear, descriptive title for the flashcard deck"),
  subject: z.string().describe("The academic subject covered"),
  cards: z
    .array(flashcardItemSchema)
    .min(3)
    .max(20)
    .describe(
      "An array of 5–15 flashcards that test recall of key concepts. " +
      "Prefer definitions, important facts, relationships, distinctions, " +
      "causes/effects, and conceptual understanding. Avoid trivial wording."
    ),
});

export type FlashcardOutputItem = z.infer<typeof flashcardItemSchema>;
export type FlashcardOutput = z.infer<typeof flashcardOutputSchema>;
