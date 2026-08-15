"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logger } from "@/lib/logger";
import { messageSchema, parseWithZod } from "@/lib/validation";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { MessageSenderKind } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

async function scopedConversation(
  userId: string,
  conversationId: string,
): Promise<{ id: string }> {
  const clientProfile = await prisma.client.findFirst({
    where: { portalUserId: userId, deletedAt: null },
    select: { id: true },
  });
  if (!clientProfile) throw new ForbiddenError("Client profile not found.");

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, clientId: clientProfile.id, deletedAt: null },
    select: { id: true },
  });
  if (!conversation) throw new NotFoundError("Conversation not found.");
  return conversation;
}

export async function clientSendMessageAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = parseWithZod(messageSchema, input);
    const conversation = await scopedConversation(user.id, data.conversationId);

    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: user.id,
          senderKind: MessageSenderKind.CLIENT,
          body: data.body,
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), lastClientReadAt: new Date() },
      }),
    ]);

    revalidatePath("/c/messages");
    return { ok: true, id: conversation.id };
  } catch (error) {
    return errorResult(error, "clientSendMessage");
  }
}

export async function clientMarkConversationReadAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const conversation = await scopedConversation(user.id, id);
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastClientReadAt: new Date() },
    });
    revalidatePath("/c/messages");
    return { ok: true, id: conversation.id };
  } catch (error) {
    return errorResult(error, "clientMarkConversationRead");
  }
}
