import { NextResponse } from "next/server";
import { generateObject, NoObjectGeneratedError, TypeValidationError, zodSchema } from "ai";
import { requirePermission } from "@/lib/session";
import { aiEnabled, getModel, leadScoreOutputSchema } from "@/lib/ai";
import { loadAiContext } from "@/lib/ai-context";
import { rateLimit } from "@/lib/rate-limit";
import {
  parseWithZod,
  aiLeadScoreSchema,
  leadScoreResultSchema,
  type LeadScoreResult,
} from "@/lib/validation";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("ai.use");
    if (!aiEnabled()) {
      return NextResponse.json({ error: "AI is not configured yet." }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const data = parseWithZod(aiLeadScoreSchema, body);

    const rl = rateLimit({ key: `ai:score:${user.id}`, limit: 20, windowMs: 60_000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const context = await loadAiContext("lead", data.leadId);
    const score = await generateLeadScore(context);
    return NextResponse.json(score);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    logger.error({ err: error }, "AI lead score request failed");
    return NextResponse.json(
      { error: "The AI model could not produce a valid lead score. Please try again." },
      { status: 502 },
    );
  }
}

async function generateLeadScore(context: string): Promise<LeadScoreResult> {
  const model = getModel();
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await generateObject({
        model,
        schema: zodSchema(leadScoreResultSchema),
        system:
          buildScoreSystemPrompt() +
          (attempt > 1
            ? "\nReturn ONLY a JSON object with exactly these keys: score, summary, strengths, risks, nextSteps."
            : ""),
        prompt: context,
      });
      const parsed = leadScoreResultSchema.safeParse(result.object);
      if (parsed.success) return parsed.data;
      logger.warn({ attempt, value: result.object }, "Lead score output failed validation");
    } catch (error) {
      if (
        error instanceof NoObjectGeneratedError ||
        error instanceof TypeValidationError
      ) {
        logger.warn({ attempt, err: error }, "Lead score generation failed validation");
        continue;
      }
      throw error;
    }
  }
  throw new Error("Model returned an invalid lead score twice.");
}

function buildScoreSystemPrompt(): string {
  return (
    "You are a senior sales qualification analyst. Score the lead 0-100 based on fit, " +
    "urgency, budget signal and next-step likelihood. Return a JSON object with: " +
    `score (0-100 integer), summary, strengths (array), risks (array), nextSteps (array). ` +
    `Schema: ${JSON.stringify(leadScoreOutputSchema)}`
  );
}
