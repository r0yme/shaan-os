"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { conversationSchema, messageSchema, parseWithZod } from "@/lib/validation";
import { AppError, NotFoundError } from "@/lib/errors";
import { MessageSenderKind } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/action-result";

function errorResult(error: unknown, label: string): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  logger.error({ err: error }, `${label} action failed`);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function createConversationAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("messages.send");
    const data = parseWithZod(conversationSchema, input);

    const client = await prisma.client.findFirst({
      where: { id: data.clientId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!client) throw new NotFoundError("Client not found.");

    const conversation = await prisma.conversation.create({
      data: {
        subject: data.subject,
        clientId: client.id,
        projectId: data.projectId,
        createdById: user.id,
        messages: {
          create: [{ senderId: user.id, senderKind: MessageSenderKind.USER, body: data.body }],
        },
      },
    });

    await recordAudit({
      actorId: user.id,
      action: "CREATE",
      entity: "Conversation",
      entityId: conversation.id,
      summary: `Conversation started with ${client.name}${data.subject ? `: ${data.subject}` : ""}`,
    });
    revalidatePath("/messages");
    revalidatePath("/c/messages");
    return { ok: true, id: conversation.id };
  } catch (error) {
    return errorResult(error, "createConversation");
  }
}

export async function sendMessageAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("messages.view");
    const data = parseWithZod(messageSchema, input);

    const conversation = await prisma.conversation.findFirst({
      where: { id: data.conversationId, deletedAt: null },
      select: { id: true },
    });
    if (!conversation) throw new NotFoundError("Conversation not found.");

    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: user.id,
          senderKind: MessageSenderKind.USER,
          body: data.body,
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), lastTeamReadAt: new Date() },
      }),
    ]);

    revalidatePath("/messages");
    revalidatePath("/c/messages");
    return { ok: true, id: conversation.id };
  } catch (error) {
    return errorResult(error, "sendMessage");
  }
}

export async function markConversationReadAction(id: string): Promise<ActionResult> {
  try {
    await requirePermission("messages.view");
    await prisma.conversation.update({ where: { id }, data: { lastTeamReadAt: new Date() } });
    revalidatePath("/messages");
    return { ok: true, id };
  } catch (error) {
    return errorResult(error, "markConversationRead");
  }
}
