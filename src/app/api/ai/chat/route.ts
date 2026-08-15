import { NextResponse } from "next/server";
import { streamText } from "ai";
import { requirePermission } from "@/lib/session";
import { aiEnabled, buildSystemPrompt, getModel } from "@/lib/ai";
import { loadAiContext, modeSupportsEntity } from "@/lib/ai-context";
import { rateLimit } from "@/lib/rate-limit";
import { parseWithZod, aiChatSchema } from "@/lib/validation";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AiMode } from "@/lib/ai";

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
    const data = parseWithZod(aiChatSchema, body);

    const rl = rateLimit({ key: `ai:chat:${user.id}`, limit: 30, windowMs: 60_000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    let context: string | undefined;
    if (data.entityId && data.entityType) {
      if (!modeSupportsEntity(data.mode)) {
        throw new ValidationError("That mode does not accept an entity.");
      }
      context = await loadAiContext(data.entityType, data.entityId);
    }

    const system = buildSystemPrompt(data.mode as AiMode, context);
    const model = getModel();
    const result = streamText({ model, system, prompt: data.message });
    return result.toTextStreamResponse();
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
    logger.error({ err: error }, "AI chat request failed");
    return NextResponse.json({ error: "The AI request failed. Please try again." }, { status: 500 });
  }
}
