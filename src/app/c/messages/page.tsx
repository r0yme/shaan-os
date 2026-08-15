import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { countUnread, latestMessagePreview } from "@/lib/messages";
import { PageHeading } from "@/components/page-heading";
import {
  ClientMessagesView,
  type ClientSerializedConversationDetail,
  type ClientSerializedConversationSummary,
  type ClientSerializedMessage,
} from "@/components/messages/client-messages-view";

export const metadata: Metadata = { title: "Messages" };

export default async function ClientMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const user = await requireUser();
  const { id } = await searchParams;

  const clientProfile = await prisma.client.findFirst({
    where: { portalUserId: user.id, deletedAt: null },
    select: { id: true, name: true },
  });

  if (!clientProfile) {
    return (
      <>
        <PageHeading title="Messages" description="Conversations with your service provider." />
        <ClientMessagesView
          conversations={[]}
          selected={null}
          clientName={user.name ?? "Client"}
        />
      </>
    );
  }

  const [conversations, selected] = await Promise.all([
    prisma.conversation.findMany({
      where: { clientId: clientProfile.id, deletedAt: null },
      include: {
        project: { select: { name: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, senderKind: true, body: true, createdAt: true },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    }),
    id
      ? prisma.conversation.findFirst({
          where: { id, clientId: clientProfile.id, deletedAt: null },
          include: {
            project: { select: { name: true } },
            messages: {
              orderBy: { createdAt: "asc" },
              include: { sender: { select: { name: true } } },
            },
          },
        })
      : null,
  ]);

  const serialized: ClientSerializedConversationSummary[] = conversations.map((conversation) => {
    const preview = latestMessagePreview(conversation.messages);
    return {
      id: conversation.id,
      subject: conversation.subject,
      projectName: conversation.project?.name ?? null,
      preview: preview?.preview ?? "",
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      unread: countUnread(conversation.messages, conversation.lastClientReadAt, "CLIENT"),
    };
  });

  const selectedSerialized: ClientSerializedConversationDetail | null = selected
    ? {
        id: selected.id,
        subject: selected.subject,
        projectName: selected.project?.name ?? null,
        messages: selected.messages.map((message): ClientSerializedMessage => ({
          id: message.id,
          senderKind: message.senderKind,
          senderName:
            message.senderKind === "CLIENT"
              ? clientProfile.name
              : (message.sender?.name ?? "Team"),
          body: message.body,
          createdAt: message.createdAt.toISOString(),
        })),
      }
    : null;

  return (
    <>
      <PageHeading
        title="Messages"
        description="Conversations with your service provider."
      />
      <ClientMessagesView
        conversations={serialized}
        selected={selectedSerialized}
        clientName={clientProfile.name}
      />
    </>
  );
}
