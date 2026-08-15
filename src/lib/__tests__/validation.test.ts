import { describe, expect, it } from "vitest";
import {
  clientSchema,
  emailSchema,
  invoiceItemSchema,
  invoiceSchema,
  leadSchema,
  milestoneSchema,
  nameSchema,
  passwordSchema,
  parseWithZod,
  paymentSchema,
  projectSchema,
  taskSchema,
} from "@/lib/validation";
import { ValidationError } from "@/lib/errors";

describe("emailSchema", () => {
  it("accepts a valid email", () => {
    expect(emailSchema.parse("  User@Example.COM  ")).toBe("user@example.com");
  });

  it("rejects an invalid email", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
  });

  it("accepts a password of at least 8 characters", () => {
    expect(passwordSchema.safeParse("Password123!").success).toBe(true);
  });
});

describe("nameSchema", () => {
  it("trims and accepts a name", () => {
    expect(nameSchema.parse("  Shaan  ")).toBe("Shaan");
  });

  it("rejects an empty name", () => {
    expect(nameSchema.safeParse("   ").success).toBe(false);
  });
});

describe("parseWithZod", () => {
  it("returns parsed data on success", () => {
    expect(parseWithZod(emailSchema, "a@b.co")).toBe("a@b.co");
  });

  it("throws a ValidationError with issues on failure", () => {
    expect(() => parseWithZod(passwordSchema, "x")).toThrow(ValidationError);
  });
});

describe("clientSchema", () => {
  it("parses a valid client with defaults", () => {
    const result = clientSchema.parse({ name: "  Acme Corp  " });
    expect(result.name).toBe("Acme Corp");
    expect(result.status).toBe("ACTIVE");
    expect(result.kind).toBe("BUSINESS");
    expect(result.email).toBeNull();
  });

  it("normalizes an empty email to null and lowercases a real one", () => {
    const empty = clientSchema.parse({ name: "X", email: "" });
    expect(empty.email).toBeNull();

    const real = clientSchema.parse({ name: "X", email: "  A@B.com  " });
    expect(real.email).toBe("a@b.com");
  });

  it("rejects an invalid email", () => {
    const result = clientSchema.safeParse({ name: "X", email: "nope" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing name", () => {
    expect(clientSchema.safeParse({}).success).toBe(false);
  });
});

describe("leadSchema", () => {
  it("parses a valid lead and coerces value to cents", () => {
    const result = leadSchema.parse({ name: "Maria", value: "250000" });
    expect(result.value).toBe(250000);
    expect(result.status).toBe("NEW");
    expect(result.source).toBe("OTHER");
  });

  it("treats an empty value as null", () => {
    const result = leadSchema.parse({ name: "Maria", value: "" });
    expect(result.value).toBeNull();
  });

  it("rejects a non-numeric value", () => {
    expect(leadSchema.safeParse({ name: "Maria", value: "abc" }).success).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(leadSchema.safeParse({ name: "Maria", status: "MAYBE" }).success).toBe(false);
  });
});

describe("projectSchema", () => {
  it("parses a valid project with defaults", () => {
    const result = projectSchema.parse({ name: "  Website Redesign  " });
    expect(result.name).toBe("Website Redesign");
    expect(result.status).toBe("PLANNING");
    expect(result.priority).toBe("MEDIUM");
    expect(result.budget).toBeNull();
    expect(result.clientId).toBeNull();
    expect(result.managerId).toBeNull();
  });

  it("parses dates, ids and budget, treating blanks as null", () => {
    const result = projectSchema.parse({
      name: "Fleet Dashboard",
      startDate: "2026-09-01",
      deadline: "",
      budget: "1200000",
      clientId: "",
      managerId: "cm-user",
    });
    expect(result.startDate?.toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(result.deadline).toBeNull();
    expect(result.budget).toBe(1200000);
    expect(result.clientId).toBeNull();
    expect(result.managerId).toBe("cm-user");
  });

  it("rejects an unknown status", () => {
    expect(projectSchema.safeParse({ name: "X", status: "DONE" }).success).toBe(false);
  });

  it("rejects an invalid date", () => {
    expect(projectSchema.safeParse({ name: "X", deadline: "not-a-date" }).success).toBe(false);
  });
});

describe("milestoneSchema", () => {
  it("parses a valid milestone with defaults", () => {
    const result = milestoneSchema.parse({ title: "Launch" });
    expect(result.title).toBe("Launch");
    expect(result.status).toBe("PENDING");
    expect(result.dueDate).toBeNull();
    expect(result.description).toBeNull();
  });

  it("parses a completed milestone with a due date", () => {
    const result = milestoneSchema.parse({
      title: "Design phase",
      status: "COMPLETED",
      dueDate: "2026-07-20",
    });
    expect(result.status).toBe("COMPLETED");
    expect(result.dueDate?.toISOString().slice(0, 10)).toBe("2026-07-20");
  });

  it("rejects a missing title", () => {
    expect(milestoneSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(milestoneSchema.safeParse({ title: "X", status: "DONE" }).success).toBe(false);
  });
});

describe("taskSchema", () => {
  it("parses a valid task with defaults", () => {
    const result = taskSchema.parse({ title: "  Homepage hero  " });
    expect(result.title).toBe("Homepage hero");
    expect(result.status).toBe("TODO");
    expect(result.priority).toBe("MEDIUM");
    expect(result.projectId).toBeNull();
    expect(result.assigneeId).toBeNull();
    expect(result.estimatedHours).toBeNull();
  });

  it("parses assignment, hours and due date, treating blanks as null", () => {
    const result = taskSchema.parse({
      title: "Content migration",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectId: "cm-project",
      assigneeId: "",
      dueDate: "2026-09-05",
      estimatedHours: "20",
    });
    expect(result.status).toBe("IN_PROGRESS");
    expect(result.projectId).toBe("cm-project");
    expect(result.assigneeId).toBeNull();
    expect(result.dueDate?.toISOString().slice(0, 10)).toBe("2026-09-05");
    expect(result.estimatedHours).toBe(20);
  });

  it("rejects zero hours", () => {
    expect(taskSchema.safeParse({ title: "X", estimatedHours: "0" }).success).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(taskSchema.safeParse({ title: "X", status: "SHIPPED" }).success).toBe(false);
  });

  it("rejects a missing title", () => {
    expect(taskSchema.safeParse({}).success).toBe(false);
  });
});

describe("invoiceItemSchema", () => {
  it("defaults quantity to 1 and empty price to 0", () => {
    const result = invoiceItemSchema.parse({ description: "Retainer" });
    expect(result.quantity).toBe(1);
    expect(result.unitPriceCents).toBe(0);
  });

  it("coerces string quantity and cents", () => {
    const result = invoiceItemSchema.parse({
      description: "Retainer",
      quantity: "2",
      unitPriceCents: "150000",
    });
    expect(result.quantity).toBe(2);
    expect(result.unitPriceCents).toBe(150000);
  });

  it("rejects a non-numeric quantity", () => {
    expect(
      invoiceItemSchema.safeParse({ description: "X", quantity: "abc" }).success,
    ).toBe(false);
  });

  it("rejects a missing description", () => {
    expect(invoiceItemSchema.safeParse({ description: "" }).success).toBe(false);
  });
});

describe("invoiceSchema", () => {
  it("parses a valid invoice with defaults", () => {
    const result = invoiceSchema.parse({
      items: [{ description: "Retainer", quantity: "1", unitPriceCents: "150000" }],
    });
    expect(result.status).toBe("DRAFT");
    expect(result.taxRateBps).toBe(0);
    expect(result.clientId).toBeNull();
    expect(result.dueDate).toBeNull();
    expect(result.items).toHaveLength(1);
  });

  it("parses tax rate, dates and optional references", () => {
    const result = invoiceSchema.parse({
      clientId: "cm-client",
      projectId: "cm-project",
      status: "SENT",
      issueDate: "2026-07-01",
      dueDate: "2026-08-01",
      taxRateBps: "500",
      items: [
        { description: "Design", quantity: "1", unitPriceCents: "600000" },
        { description: "Retainer", quantity: "2", unitPriceCents: "150000" },
      ],
    });
    expect(result.clientId).toBe("cm-client");
    expect(result.projectId).toBe("cm-project");
    expect(result.status).toBe("SENT");
    expect(result.taxRateBps).toBe(500);
    expect(result.issueDate?.toISOString().slice(0, 10)).toBe("2026-07-01");
    expect(result.dueDate?.toISOString().slice(0, 10)).toBe("2026-08-01");
    expect(result.items).toHaveLength(2);
  });

  it("rejects an invoice without line items", () => {
    expect(invoiceSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it("rejects a tax rate over 100%", () => {
    expect(
      invoiceSchema.safeParse({
        taxRateBps: "11000",
        items: [{ description: "X", unitPriceCents: "1000" }],
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(
      invoiceSchema.safeParse({
        status: "SHIPPED",
        items: [{ description: "X", unitPriceCents: "1000" }],
      }).success,
    ).toBe(false);
  });
});

describe("paymentSchema", () => {
  it("parses a valid payment with defaults", () => {
    const result = paymentSchema.parse({ amountCents: "400000" });
    expect(result.amountCents).toBe(400000);
    expect(result.method).toBe("BANK_TRANSFER");
    expect(result.paidAt).toBeNull();
    expect(result.reference).toBeNull();
  });

  it("parses method and paid date", () => {
    const result = paymentSchema.parse({
      amountCents: "400000",
      method: "CREDIT_CARD",
      paidAt: "2026-06-20",
      reference: "WIRE-8812",
    });
    expect(result.method).toBe("CREDIT_CARD");
    expect(result.paidAt?.toISOString().slice(0, 10)).toBe("2026-06-20");
    expect(result.reference).toBe("WIRE-8812");
  });

  it("rejects a zero payment", () => {
    expect(paymentSchema.safeParse({ amountCents: "0" }).success).toBe(false);
  });

  it("rejects a non-numeric amount", () => {
    expect(paymentSchema.safeParse({ amountCents: "abc" }).success).toBe(false);
  });

  it("rejects an unknown method", () => {
    expect(paymentSchema.safeParse({ amountCents: "100", method: "PAYPAL" }).success).toBe(false);
  });
});
