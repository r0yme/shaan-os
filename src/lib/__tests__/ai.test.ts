import { afterEach, describe, expect, it, vi } from "vitest";
import {
  aiEnabled,
  aiProvider,
  buildSystemPrompt,
  formatClientContext,
  formatLeadContext,
  formatProjectContext,
  hasAiCredentials,
  modeSupportsEntity,
} from "@/lib/ai";

describe("ai provider selection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to google when AI_PROVIDER is unset or invalid", () => {
    expect(aiProvider()).toBe("google");
    vi.stubEnv("AI_PROVIDER", "nonsense");
    expect(aiProvider()).toBe("google");
  });

  it("reads the openrouter provider", () => {
    vi.stubEnv("AI_PROVIDER", "openrouter");
    expect(aiProvider()).toBe("openrouter");
  });

  it("detects credentials for the active provider only", () => {
    vi.stubEnv("AI_PROVIDER", "google");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "sk-test");
    expect(hasAiCredentials()).toBe(true);

    vi.stubEnv("AI_PROVIDER", "openrouter");
    expect(hasAiCredentials()).toBe(false);

    vi.stubEnv("OPENROUTER_API_KEY", "sk-test");
    expect(hasAiCredentials()).toBe(true);
  });

  it("requires both AI_ENABLED=true and credentials", () => {
    vi.stubEnv("AI_PROVIDER", "google");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "sk-test");
    vi.stubEnv("AI_ENABLED", "true");
    expect(aiEnabled()).toBe(true);

    vi.stubEnv("AI_ENABLED", "false");
    expect(aiEnabled()).toBe(false);
  });
});

describe("context formatters", () => {
  it("formats a client with money in dollars", () => {
    const output = formatClientContext({
      name: "Acme Corp",
      company: "Acme Inc",
      email: "billing@acme.test",
      status: "ACTIVE",
      kind: "RETAINER",
      projectCount: 2,
      openInvoiceCount: 1,
      outstandingCents: 124500,
    });
    expect(output).toContain("Client name: Acme Corp");
    expect(output).toContain("Outstanding balance: $1245.00");
    expect(output).toContain("Active projects: 2");
    expect(output).not.toContain("Account manager:");
  });

  it("formats a project with budget and counts", () => {
    const output = formatProjectContext({
      name: "Website rebuild",
      status: "IN_PROGRESS",
      priority: "HIGH",
      client: "Acme Corp",
      budgetCents: 500000,
      milestoneCount: 4,
      completedMilestones: 1,
      taskCount: 10,
      openTaskCount: 3,
    });
    expect(output).toContain("Budget: $5000.00");
    expect(output).toContain("Open tasks: 3");
    expect(output).toContain("Completed milestones: 1");
  });

  it("omits unset money from the lead context", () => {
    const output = formatLeadContext({
      name: "Jane",
      source: "WEBSITE",
      status: "NEW",
      valueCents: null,
    });
    expect(output).not.toContain("Deal value:");
    expect(output).toContain("Lead name: Jane");
  });
});

describe("buildSystemPrompt", () => {
  it("embeds mode instructions", () => {
    expect(buildSystemPrompt("draft")).toContain("Mode: DRAFT");
    expect(buildSystemPrompt("draft")).toContain("Output only the draft text");
  });

  it("appends workspace data when context is provided", () => {
    const prompt = buildSystemPrompt("summary", "Client name: Acme Corp");
    expect(prompt).toContain("Workspace data:\nClient name: Acme Corp");
    expect(buildSystemPrompt("chat")).not.toContain("Workspace data:");
  });
});

describe("modeSupportsEntity", () => {
  it("allows entities for chat, draft and summary but not score", () => {
    expect(modeSupportsEntity("chat")).toBe(true);
    expect(modeSupportsEntity("draft")).toBe(true);
    expect(modeSupportsEntity("summary")).toBe(true);
    expect(modeSupportsEntity("score")).toBe(false);
  });
});
