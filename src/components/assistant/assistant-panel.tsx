"use client";

import { useRef, useState } from "react";
import { Bot, ClipboardCopy, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export interface EntityOption {
  id: string;
  name: string;
  company?: string | null;
}

export interface LeadScoreResult {
  score: number;
  summary: string;
  strengths: string[];
  risks: string[];
  nextSteps: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

type Mode = "chat" | "draft" | "summary" | "score";

const MODES: Array<{ value: Mode; label: string }> = [
  { value: "chat", label: "Chat" },
  { value: "draft", label: "Draft" },
  { value: "summary", label: "Summary" },
  { value: "score", label: "Score" },
];

const PLACEHOLDERS: Record<Mode, string> = {
  chat: "Ask about your workspace, e.g. “What work is pending for Acme Corporation?”",
  draft: "Describe what to write, e.g. “A friendly follow-up about the overdue invoice.”",
  summary: "Pick a client or project and ask for its current state.",
  score: "Pick a lead and get a score with next steps.",
};

export function AssistantPanel({
  enabled,
  provider,
  clients,
  projects,
  leads,
}: {
  enabled: boolean;
  provider: string;
  clients: EntityOption[];
  projects: EntityOption[];
  leads: EntityOption[];
}) {
  const [mode, setMode] = useState<Mode>("chat");
  const [entityType, setEntityType] = useState<"" | "client" | "project" | "lead">("");
  const [entityId, setEntityId] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<LeadScoreResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const entityOptions = entityType === "client" ? clients : entityType === "project" ? projects : leads;
  const isScore = mode === "score";

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || streaming) return;

    setError(null);
    if (isScore) {
      await runScore();
      return;
    }

    setInput("");
    const history: Message[] = [...messages, { role: "user", content: message }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          message,
          ...(entityId && entityType ? { entityType, entityId } : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => null);
        setError(payload?.error ?? "The AI request failed. Please try again.");
        setMessages(history);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: acc }]);
      }
      if (!acc.trim()) {
        setError("The assistant returned no output. Try a different prompt.");
        setMessages(history);
      }
    } catch {
      setMessages(history);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function runScore() {
    setStreaming(true);
    setScore(null);
    try {
      const res = await fetch("/api/ai/lead-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: entityId }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error ?? "The AI request failed. Please try again.");
        return;
      }
      setScore(payload as LeadScoreResult);
    } catch {
      setError("The AI request failed. Please try again.");
    } finally {
      setStreaming(false);
    }
  }

  function copyDraft() {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    navigator.clipboard?.writeText(last.content);
  }

  if (!enabled) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Bot}
            title="AI is not configured"
            description={`Set AI_ENABLED=true and add a ${provider === "openrouter" ? "OpenRouter" : "Google Gemini"} API key in your .env file to activate the assistant.`}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Mode</CardTitle>
          <CardDescription>Choose what the assistant should do.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1">
            {MODES.map((m) => (
              <Button
                key={m.value}
                type="button"
                size="sm"
                variant={mode === m.value ? "primary" : "outline"}
                onClick={() => {
                  setMode(m.value);
                  setScore(null);
                  setError(null);
                  setEntityType(isScore && m.value !== "score" ? "" : entityType);
                  setEntityId("");
                }}
              >
                {m.label}
              </Button>
            ))}
          </div>

          {!isScore && (
            <div className="space-y-2">
              <Label htmlFor="ai-entity-type">Context (optional)</Label>
              <Select
                id="ai-entity-type"
                value={entityType}
                placeholder="No entity selected"
                onChange={(e) => {
                  setEntityType(e.target.value as "" | "client" | "project" | "lead");
                  setEntityId("");
                }}
                options={[
                  { value: "client", label: "Client" },
                  { value: "project", label: "Project" },
                  { value: "lead", label: "Lead" },
                ]}
              />
              {entityType && (
                <Select
                  aria-label="Select entity"
                  value={entityId}
                  placeholder="Choose…"
                  onChange={(e) => setEntityId(e.target.value)}
                  options={entityOptions.map((option) => ({
                    value: option.id,
                    label: option.company ? `${option.name} — ${option.company}` : option.name,
                  }))}
                />
              )}
            </div>
          )}

          {isScore && (
            <div className="space-y-2">
              <Label htmlFor="ai-score-lead">Lead to score</Label>
              <Select
                id="ai-score-lead"
                value={entityId}
                placeholder="Choose a lead…"
                onChange={(e) => setEntityId(e.target.value)}
                options={leads.map((lead) => ({
                  value: lead.id,
                  label: lead.company ? `${lead.name} — ${lead.company}` : lead.name,
                }))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {isScore ? (
            <ScoreResult score={score} loading={streaming} />
          ) : (
            <ChatThread messages={messages} streaming={streaming} />
          )}

          {!isScore && messages.length > 0 && (
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={copyDraft}>
                <ClipboardCopy className="mr-2 h-3.5 w-3.5" />
                Copy last draft
              </Button>
            </div>
          )}

          <form onSubmit={sendMessage} className="space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={PLACEHOLDERS[mode]}
              rows={3}
              disabled={streaming}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {isScore
                  ? "Uses the lead's profile, deal value and notes."
                  : entityId && entityType
                    ? `Answering with context from the selected ${entityType}.`
                    : "No entity context attached."}
              </p>
              <Button type="submit" loading={streaming} disabled={!input.trim()}>
                {isScore ? <Sparkles className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                {isScore ? "Score lead" : "Send"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ChatThread({ messages, streaming }: { messages: Message[]; streaming: boolean }) {
  if (messages.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="What would you like help with?"
        description="Ask a question, request a draft, or pick an entity on the left for context."
      />
    );
  }
  return (
    <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
      {messages.map((message, index) => (
        <div
          key={index}
          className={cn(
            "flex gap-3",
            message.role === "user" ? "justify-end" : "justify-start",
          )}
        >
          {message.role === "assistant" && (
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
          )}
          <div
            className={cn(
              "max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-muted/40 text-foreground",
            )}
          >
            {message.content}
            {streaming && index === messages.length - 1 && (
              <span className="ml-1 inline-block h-3 w-0.5 animate-pulse align-middle bg-foreground" />
            )}
          </div>
          {message.role === "user" && (
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <UserRound className="h-4 w-4" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ScoreResult({
  score,
  loading,
}: {
  score: LeadScoreResult | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Scoring the lead…</p>
      </div>
    );
  }
  if (!score) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Score a lead"
        description="Pick a lead on the left, then hit “Score lead” for a qualification score and next steps."
      />
    );
  }
  const tone =
    score.score >= 70 ? "success" : score.score >= 40 ? "warning" : ("destructive" as const);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl font-semibold tracking-tight text-foreground">
          {score.score}
        </span>
        <Badge tone={tone}>{score.score >= 70 ? "Hot" : score.score >= 40 ? "Warm" : "Cold"}</Badge>
      </div>
      <p className="text-sm text-foreground">{score.summary}</p>
      <ScoreList title="Strengths" items={score.strengths} tone="success" />
      <ScoreList title="Risks" items={score.risks} tone="destructive" />
      <ScoreList title="Next steps" items={score.nextSteps} tone="primary" />
    </div>
  );
}

function ScoreList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "success" | "destructive" | "primary";
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-sm text-foreground">
            <Badge tone={tone} className="mt-1 h-2 w-2 rounded-full p-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
