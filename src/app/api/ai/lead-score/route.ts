import { NextResponse } from "next/server";
import { generateObject, jsonSchema } from "ai";
import { requirePermission } from "@/lib/session";
import { aiEnabled, getModel, leadScoreOutputSchema } from "@/lib/ai";
import { loadAiContext } from "@/lib/ai-context";
import { rateLimit } from "@/lib/rate-limit";
import { parseWithZod, aiLeadScoreSchema } from "@/lib/validation";
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
    const model = getModel();
    const result = await generateObject({
      model,
      schema: jsonSchema({
        type: "object",
        properties: leadScoreOutputSchema,
        required: ["score", "summary", "strengths", "risks", "nextSteps"],
        additionalProperties: false,
      }),
      system: buildScoreSystemPrompt(),
      prompt: context,
    });

    return NextResponse.json(result.object);
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
    return NextResponse.json({ error: "The AI request failed. Please try again." }, { status: 500 });
  }
}

function buildScoreSystemPrompt(): string {
  return (
    "You are a senior sales qualification analyst. Score the lead 0-100 based on fit, " +
    "urgency, budget signal and next-step likelihood. Return only the requested JSON shape."
  );
}
