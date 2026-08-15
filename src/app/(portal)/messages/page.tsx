import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { countUnread, latestMessagePreview } from "@/lib/messages";
import { PageHeading } from "@/components/page-heading";
import {
  MessagesView,
  type SerializedConversationDetail,
  type SerializedConversationSummary,
  type SerializedMessage,
} from "@/components/messages/messages-view";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const user = await guardPermission("messages.view");
  const { id } = await searchParams;

  const [conversations, clients] = await Promise.all([
    prisma.conversation.findMany({
      where: { deletedAt: null },
      include: {
        client: { select: { name: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, senderKind: true, body: true, createdAt: true },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    }),
    prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized: SerializedConversationSummary[] = conversations.map((conversation) => {
    const preview = latestMessagePreview(conversation.messages);
    return {
      id: conversation.id,
      subject: conversation.subject,
      clientName: conversation.client.name,
      preview: preview?.preview ?? "",
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      unread: countUnread(
        conversation.messages,
        conversation.lastTeamReadAt,
        "USER",
      ),
    };
  });

  let selected: SerializedConversationDetail | null = null;
  if (id) {
    const conversation = await prisma.conversation.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: { select: { name: true } },
        project: { select: { name: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { name: true } } },
        },
      },
    });
    if (conversation) {
      selected = {
        id: conversation.id,
        subject: conversation.subject,
        clientName: conversation.client.name,
        projectName: conversation.project?.name ?? null,
        messages: conversation.messages.map((message): SerializedMessage => ({
          id: message.id,
          senderKind: message.senderKind,
          senderName:
            message.senderKind === "CLIENT"
              ? conversation.client.name
              : (message.sender?.name ?? "Team"),
          body: message.body,
          createdAt: message.createdAt.toISOString(),
        })),
      };
    }
  }

  return (
    <>
      <PageHeading
        title="Messages"
        description="Client conversations in one place."
      />
      <MessagesView
        conversations={serialized}
        selected={selected}
        canCreate={user.permissions.has("messages.send")}
        clientOptions={clients.map((client) => ({ id: client.id, name: client.name }))}
      />
    </>
  );
}
