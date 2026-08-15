export type MessageSide = "USER" | "CLIENT";

export interface UnreadSource {
  senderKind: string;
  createdAt: Date;
}

export function countUnread(
  messages: UnreadSource[],
  lastReadAt: Date | null,
  ownKind: MessageSide,
): number {
  return messages.filter(
    (message) => message.senderKind !== ownKind && (!lastReadAt || message.createdAt > lastReadAt),
  ).length;
}

export function latestMessagePreview(
  messages: Array<{ body: string; createdAt: Date; senderKind: string }>,
): { preview: string; at: Date | null; fromClient: boolean } | null {
  const latest = messages.length > 0 ? messages[messages.length - 1] : null;
  if (!latest) return null;
  const preview = latest.body.replace(/\s+/g, " ").trim();
  return {
    preview: preview.length > 120 ? `${preview.slice(0, 120)}…` : preview,
    at: latest.createdAt,
    fromClient: latest.senderKind === "CLIENT",
  };
}
