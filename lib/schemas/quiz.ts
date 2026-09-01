import { z } from "zod";

/**
 * Zod schema for a single AI-generated quiz question.
 */
export const quizQuestionSchema = z.object({
  question: z
    .string()
    .describe("The quiz question text"),
  type: z
    .enum(["multiple_choice", "true_false"])
    .describe("The type of question"),
  options: z
    .array(z.string())
    .describe(
      "Answer options. For multiple_choice: 4 options. For true_false: ['True', 'False']."
    ),
  correctAnswer: z
    .string()
    .describe(
      "The correct answer — must exactly match one of the options."
    ),
  explanation: z
    .string()
    .describe(
      "A brief educational explanation of why this answer is correct."
    ),
  difficulty: z
    .enum(["easy", "medium", "hard"])
    .describe(
      "Inferred difficulty based on conceptual complexity."
    ),
});

/**
 * Zod schema for the complete AI-generated quiz output.
 * Used with `generateObject()` to validate structured AI output.
 */
export const quizOutputSchema = z.object({
  title: z
    .string()
    .describe("A clear, descriptive title for the quiz"),
  subject: z.string().describe("The academic subject covered"),
  questions: z
    .array(quizQuestionSchema)
    .min(3)
    .max(15)
    .describe(
      "An array of 5–10 quiz questions that test understanding of material " +
      "actually discussed. Mix multiple_choice and true_false. " +
      "The correct answer must be unambiguous."
    ),
});

export type QuizQuestionOutput = z.infer<typeof quizQuestionSchema>;
export type QuizOutput = z.infer<typeof quizOutputSchema>;
