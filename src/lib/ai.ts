import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

/**
 * AI provider layer. `AI_PROVIDER` picks the backend:
 *   - "google"     → Gemini (free tier, or paid later) via @ai-sdk/google
 *   - "openrouter" → OpenRouter (free `:free` model variants) via the
 *                    OpenAI-compatible endpoint
 * Swapping providers later (OpenAI / Anthropic paid) is a one-line change
 * here plus an env var — every call site goes through getModel().
 */

export type AiProvider = "google" | "openrouter";

export const AI_PROVIDERS: AiProvider[] = ["google", "openrouter"];

export function aiProvider(): AiProvider {
  const value = process.env.AI_PROVIDER;
  return AI_PROVIDERS.includes(value as AiProvider) ? (value as AiProvider) : "google";
}

export function hasAiCredentials(): boolean {
  return aiProvider() === "openrouter"
    ? Boolean(process.env.OPENROUTER_API_KEY)
    : Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export function aiEnabled(): boolean {
  return process.env.AI_ENABLED === "true" && hasAiCredentials();
}

export function getModel(): LanguageModel {
  if (aiProvider() === "openrouter") {
    const provider = createOpenAICompatible({
      name: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    return provider(
      process.env.AI_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free",
    );
  }
  return google(process.env.AI_MODEL ?? "gemini-2.5-flash");
}

export type AiMode = "chat" | "draft" | "summary" | "score";

export function modeSupportsEntity(mode: AiMode): boolean {
  return mode === "chat" || mode === "draft" || mode === "summary";
}

export interface ClientContextData {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  status: string;
  kind: string;
  accountManager?: string | null;
  projectCount?: number;
  openInvoiceCount?: number;
  outstandingCents?: number;
}

export interface ProjectContextData {
  name: string;
  description?: string | null;
  status: string;
  priority: string;
  client?: string | null;
  manager?: string | null;
  budgetCents?: number | null;
  startDate?: string | null;
  deadline?: string | null;
  notes?: string | null;
  milestoneCount?: number;
  completedMilestones?: number;
  taskCount?: number;
  openTaskCount?: number;
}

export interface LeadContextData {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source: string;
  status: string;
  valueCents?: number | null;
  notes?: string | null;
  assignee?: string | null;
  ageDays?: number;
}

function money(cents?: number | null): string {
  return cents == null ? "not set" : `$${(cents / 100).toFixed(2)}`;
}

function line(label: string, value?: string | number | null): string {
  if (value == null || value === "") return "";
  return `${label}: ${value}`;
}

export function formatClientContext(client: ClientContextData): string {
  return [
    `Client name: ${client.name}`,
    line("Company", client.company),
    line("Email", client.email),
    line("Phone", client.phone),
    line("Address", client.address),
    line("Status", client.status),
    line("Kind", client.kind),
    line("Account manager", client.accountManager),
    line("Active projects", client.projectCount),
    line("Open invoices", client.openInvoiceCount),
    line("Outstanding balance", client.outstandingCents != null ? money(client.outstandingCents) : undefined),
    line("Notes", client.notes),
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatProjectContext(project: ProjectContextData): string {
  return [
    `Project name: ${project.name}`,
    line("Status", project.status),
    line("Priority", project.priority),
    line("Client", project.client),
    line("Manager", project.manager),
    line("Budget", project.budgetCents != null ? money(project.budgetCents) : undefined),
    line("Start date", project.startDate),
    line("Deadline", project.deadline),
    line("Milestones", project.milestoneCount),
    line("Completed milestones", project.completedMilestones),
    line("Tasks", project.taskCount),
    line("Open tasks", project.openTaskCount),
    line("Description", project.description),
    line("Notes", project.notes),
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatLeadContext(lead: LeadContextData): string {
  return [
    `Lead name: ${lead.name}`,
    line("Company", lead.company),
    line("Email", lead.email),
    line("Phone", lead.phone),
    line("Source", lead.source),
    line("Status", lead.status),
    line("Deal value", lead.valueCents != null ? money(lead.valueCents) : undefined),
    line("Assignee", lead.assignee),
    line("Age (days)", lead.ageDays),
    line("Notes", lead.notes),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSystemPrompt(mode: AiMode, context?: string): string {
  const base =
    "You are a helpful assistant for an internal client-management workspace. " +
    "Be concise, professional and factual. If the answer is not available in the " +
    "provided workspace data, say so plainly instead of guessing.\n";

  const instruction: Record<AiMode, string> = {
    chat: "Answer the user's question about their workspace using the context below.",
    draft: "Draft the requested email or update for the user. Output only the draft text — no preamble, no signature block.",
    summary: "Summarize the workspace data below. Use short bullet points grouped by topic.",
    score: "Qualify the lead below and recommend next steps.",
  };

  const contextBlock = context ? `\nWorkspace data:\n${context}` : "";
  return `${base}\nMode: ${mode.toUpperCase()}. ${instruction[mode]}${contextBlock}`;
}

export const leadScoreOutputSchema = {
  score: {
    type: "number",
    description: "Lead quality score from 0 to 100.",
  },
  summary: {
    type: "string",
    description: "One or two sentence summary of the lead's potential.",
  },
  strengths: {
    type: "array",
    items: { type: "string" },
    description: "Reasons the lead looks promising.",
  },
  risks: {
    type: "array",
    items: { type: "string" },
    description: "Reasons the lead may not convert.",
  },
  nextSteps: {
    type: "array",
    items: { type: "string" },
    description: "Recommended next actions, in order.",
  },
} as const;
