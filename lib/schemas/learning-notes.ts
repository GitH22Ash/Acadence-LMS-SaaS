import { z } from "zod";

/**
 * Zod schema for AI-generated learning notes.
 * Used to validate structured output from the AI model.
 */
export const learningNotesSchema = z.object({
  title: z
    .string()
    .describe("A clear, descriptive title for the learning session notes"),
  subject: z
    .string()
    .describe("The academic subject covered"),
  summary: z
    .string()
    .describe(
      "A detailed, educational summary of what was discussed. " +
      "Retain useful information — do not over-summarize."
    ),
  keyConcepts: z
    .array(z.string())
    .describe("Key concepts and ideas that were discussed"),
  importantPoints: z
    .array(z.string())
    .describe("Important explanations or points made during the conversation"),
  examples: z
    .array(z.string())
    .describe("Specific examples that were used to illustrate concepts"),
  questionsToReview: z
    .array(z.string())
    .describe(
      "Questions the student should review, including unanswered questions " +
      "and questions for self-assessment"
    ),
  misconceptions: z
    .array(z.string())
    .describe(
      "Any misconceptions identified in the conversation. " +
      "Only include when clearly supported by the conversation."
    ),
  nextSteps: z
    .array(z.string())
    .describe("Suggested next learning steps based on the conversation"),
});

export type LearningNotesOutput = z.infer<typeof learningNotesSchema>;

/**
 * Input schema for creating a learning session.
 */
export const createSessionSchema = z.object({
  companionId: z.string().uuid(),
  subject: z.string().min(1),
  topic: z.string().optional(),
  title: z.string().optional(),
});

/**
 * Input schema for a single finalized conversation message.
 */
export const conversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  sequenceNumber: z.number().int().min(0),
  timestamp: z.string().optional(),
});

/**
 * Input schema for persisting a conversation after call ends.
 */
export const persistConversationSchema = z.object({
  sessionId: z.string().uuid(),
  messages: z.array(conversationMessageSchema).min(1),
  vapiCallId: z.string().optional(),
  durationSeconds: z.number().int().optional(),
});
