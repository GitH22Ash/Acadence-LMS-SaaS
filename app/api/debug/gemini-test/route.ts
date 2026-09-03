import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

/**
 * Temporary diagnostic route — verifies Gemini API connectivity.
 *
 * DEVELOPMENT ONLY — returns 404 in production.
 * Remove after debugging is complete.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
  };

  // Step 1: Check if API key is configured
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  diagnostics.apiKeyConfigured = !!apiKey && apiKey.trim().length > 0;
  diagnostics.apiKeyLength = apiKey?.length ?? 0;
  diagnostics.apiKeyPrefix = apiKey?.slice(0, 4) ?? "N/A";

  if (!diagnostics.apiKeyConfigured) {
    diagnostics.error = "GOOGLE_GENERATIVE_AI_API_KEY is not set";
    return NextResponse.json(diagnostics);
  }

  // Step 2: Try a minimal generateObject call
  const modelName = "gemini-3.6-flash";
  diagnostics.model = modelName;

  try {
    const { object } = await generateObject({
      model: google(modelName),
      schema: z.object({ ok: z.boolean() }),
      prompt: "Respond with ok: true",
      abortSignal: AbortSignal.timeout(15_000),
    });

    diagnostics.modelReachable = true;
    diagnostics.authWorks = true;
    diagnostics.structuredGenerationWorks = true;
    diagnostics.response = object;
  } catch (error) {
    diagnostics.modelReachable = false;
    const msg = error instanceof Error ? error.message : String(error);
    const lower = msg.toLowerCase();

    if (lower.includes("api key") || lower.includes("401") || lower.includes("unauthorized") || lower.includes("403")) {
      diagnostics.errorCategory = "auth";
    } else if (lower.includes("model") && (lower.includes("not found") || lower.includes("404"))) {
      diagnostics.errorCategory = "model";
    } else if (lower.includes("quota") || lower.includes("429")) {
      diagnostics.errorCategory = "quota";
    } else if (lower.includes("timeout") || lower.includes("abort")) {
      diagnostics.errorCategory = "timeout";
    } else if (lower.includes("network") || lower.includes("econnrefused") || lower.includes("fetch")) {
      diagnostics.errorCategory = "network";
    } else {
      diagnostics.errorCategory = "unknown";
    }

    // Sanitize: only first 300 chars of error message
    diagnostics.error = msg.slice(0, 300);
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
