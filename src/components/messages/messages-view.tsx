"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, MessageSquareText, Plus, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import {
  createConversationAction,
  markConversationReadAction,
  sendMessageAction,
} from "@/app/(portal)/messages/actions";

export interface SerializedMessage {
  id: string;
  senderKind: string;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface SerializedConversationSummary {
  id: string;
  subject: string | null;
  clientName: string;
  preview: string;
  lastMessageAt: string;
  unread: number;
}

export interface SerializedConversationDetail {
  id: string;
  subject: string | null;
  clientName: string;
  projectName: string | null;
  messages: SerializedMessage[];
}

export interface ClientOption {
  id: string;
  name: string;
}

function timeLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return date.toLocaleString("en-US", {
    ...(sameDay ? {} : { month: "short", day: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessagesView({
  conversations,
  selected,
  canCreate,
  clientOptions,
}: {
  conversations: SerializedConversationSummary[];
  selected: SerializedConversationDetail | null;
  canCreate: boolean;
  clientOptions: ClientOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [newOpen, setNewOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messageCount = selected?.messages.length ?? 0;

  useEffect(() => {
    if (selected) {
      markConversationReadAction(selected.id).then((result) => {
        if (result.ok) router.refresh();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messageCount, selected?.id]);

  function selectConversation(id: string) {
    if (selected?.id === id) return;
    router.push(`${pathname}?id=${id}`);
  }

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setError(null);
    setSending(true);
    const result = await sendMessageAction({ conversationId: selected.id, body: reply });
    setSending(false);
    if (result.ok) {
      setReply("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function submitNewConversation(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const result = await createConversationAction({ clientId, subject, body });
    setSending(false);
    if (result.ok) {
      setNewOpen(false);
      setClientId("");
      setSubject("");
      setBody("");
      router.push(`${pathname}?id=${result.id}`);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[28rem] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <aside className="flex w-full max-w-xs shrink-0 flex-col border-r border-border">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            Conversations ({conversations.length})
          </p>
          {canCreate && (
            <Button variant="outline" size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />
              New
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <MessageSquareText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground">
                Start a thread with a client to begin.
              </p>
            </div>
          ) : (
            conversations.map((conversation) => {
              const active = selected?.id === conversation.id;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => selectConversation(conversation.id)}
                  className={cn(
                    "block w-full border-b border-border px-4 py-3 text-left transition-colors",
                    active ? "bg-accent" : "hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {conversation.clientName}
                    </p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {timeLabel(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {conversation.subject ?? (conversation.preview || "No messages yet")}
                  </p>
                  {conversation.unread > 0 && (
                    <span className="mt-1.5 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      {conversation.unread} new
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <MessageSquareText className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Select a conversation</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Choose a thread from the list to read and reply to the client.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Avatar name={selected.clientName} className="h-9 w-9 text-sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {selected.clientName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[selected.subject, selected.projectName].filter(Boolean).join(" · ") || "General"}
                </p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {selected.messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No messages in this thread yet.
                </p>
              ) : (
                selected.messages.map((message) => {
                  const fromClient = message.senderKind === "CLIENT";
                  return (
                    <div
                      key={message.id}
                      className={cn("flex", fromClient ? "justify-start" : "justify-end")}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm",
                          fromClient
                            ? "rounded-tl-sm bg-muted text-foreground"
                            : "rounded-tr-sm bg-primary/15 text-primary",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <p className="mt-1 text-[11px] opacity-60">
                          {message.senderName} · {timeLabel(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={submitReply} className="border-t border-border p-3">
              {error && (
                <div
                  role="alert"
                  className="mb-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex items-end gap-2">
                <Textarea
                  aria-label="Reply to client"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Write a reply…"
                  rows={2}
                  className="max-h-40 min-h-[3rem] flex-1"
                />
                <Button type="submit" loading={sending} disabled={!reply.trim()}>
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </form>
          </>
        )}
      </section>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New conversation"
        description="Start a thread with a client."
        size="md"
      >
        <form onSubmit={submitNewConversation} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="msg-client">
              Client <span className="text-destructive">*</span>
            </Label>
            <Select
              id="msg-client"
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Select a client"
              options={clientOptions.map((client) => ({ value: client.id, label: client.name }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-subject">Subject</Label>
            <Input
              id="msg-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Website redesign kickoff"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-body">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="msg-body"
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your first message…"
              rows={5}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={sending} disabled={!clientId || !body.trim()}>
              Start conversation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
