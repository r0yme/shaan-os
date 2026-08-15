import { describe, expect, it } from "vitest";
import {
  clientSchema,
  conversationSchema,
  createEmployeeSchema,
  emailSchema,
  expenseSchema,
  invoiceItemSchema,
  invoiceSchema,
  leadSchema,
  messageSchema,
  milestoneSchema,
  nameSchema,
  parseWithZod,
  passwordSchema,
  paymentSchema,
  projectSchema,
  taskSchema,
  updateEmployeeSchema,
  userStatusSchema,
  requestApprovalSchema,
  decideApprovalSchema,
  cancelApprovalSchema,
  timeEntrySchema,
  calendarEventSchema,
  sharedFileMetadataSchema,
  contractorSchema,
  businessProfileSchema,
  leadScoreResultSchema,
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

describe("expenseSchema", () => {
  it("parses a valid expense with defaults", () => {
    const result = expenseSchema.parse({ amountCents: "120000" });
    expect(result.amountCents).toBe(120000);
    expect(result.category).toBe("OTHER");
    expect(result.merchant).toBeNull();
    expect(result.projectId).toBeNull();
    expect(result.clientId).toBeNull();
  });

  it("parses category, date and optional references", () => {
    const result = expenseSchema.parse({
      amountCents: "89900",
      category: "HARDWARE",
      merchant: "Best Buy",
      incurredAt: "2026-06-18",
      projectId: "cm-project",
      clientId: "",
    });
    expect(result.category).toBe("HARDWARE");
    expect(result.merchant).toBe("Best Buy");
    expect(result.incurredAt?.toISOString().slice(0, 10)).toBe("2026-06-18");
    expect(result.projectId).toBe("cm-project");
    expect(result.clientId).toBeNull();
  });

  it("rejects a zero amount", () => {
    expect(expenseSchema.safeParse({ amountCents: "0" }).success).toBe(false);
  });

  it("rejects a non-numeric amount", () => {
    expect(expenseSchema.safeParse({ amountCents: "abc" }).success).toBe(false);
  });

  it("rejects an unknown category", () => {
    expect(expenseSchema.safeParse({ amountCents: "100", category: "MISC" }).success).toBe(false);
  });
});

describe("userStatusSchema", () => {
  it("accepts each employee status", () => {
    for (const status of ["ACTIVE", "INVITED", "SUSPENDED", "INACTIVE"]) {
      expect(userStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects an unknown status", () => {
    expect(userStatusSchema.safeParse("DELETED").success).toBe(false);
  });
});

describe("createEmployeeSchema", () => {
  it("parses a valid employee with defaults", () => {
    const result = createEmployeeSchema.parse({
      name: "  Riya Sharma  ",
      email: "riya@example.com",
      password: "Password123!",
      roleKeys: ["EMPLOYEE"],
    });
    expect(result.name).toBe("Riya Sharma");
    expect(result.email).toBe("riya@example.com");
    expect(result.status).toBe("INVITED");
    expect(result.phone).toBeNull();
    expect(result.jobTitle).toBeNull();
  });

  it("rejects an invalid email", () => {
    expect(
      createEmployeeSchema.safeParse({
        name: "Riya",
        email: "not-an-email",
        password: "Password123!",
        roleKeys: ["EMPLOYEE"],
      }).success
    ).toBe(false);
  });

  it("rejects a weak password", () => {
    expect(
      createEmployeeSchema.safeParse({
        name: "Riya",
        email: "riya@example.com",
        password: "short",
        roleKeys: ["EMPLOYEE"],
      }).success
    ).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(
      createEmployeeSchema.safeParse({
        name: "Riya",
        email: "riya@example.com",
        password: "Password123!",
        roleKeys: ["EMPLOYEE"],
        status: "DELETED",
      }).success
    ).toBe(false);
  });
});

describe("updateEmployeeSchema", () => {
  it("parses a valid update", () => {
    const result = updateEmployeeSchema.parse({
      name: "Riya Sharma",
      phone: "555-0100",
      jobTitle: "Designer",
      status: "ACTIVE",
      roleKeys: ["EMPLOYEE", "PROJECT_MANAGER"],
    });
    expect(result.jobTitle).toBe("Designer");
    expect(result.roleKeys).toEqual(["EMPLOYEE", "PROJECT_MANAGER"]);
  });

  it("rejects empty roleKeys", () => {
    expect(
      updateEmployeeSchema.safeParse({ name: "Riya", status: "ACTIVE", roleKeys: [] }).success
    ).toBe(false);
  });

  it("rejects empty role entries", () => {
    expect(
      updateEmployeeSchema.safeParse({ name: "Riya", status: "ACTIVE", roleKeys: ["  "] }).success
    ).toBe(false);
  });
});

describe("messageSchema", () => {
  it("parses a valid message", () => {
    const result = messageSchema.parse({
      conversationId: "cm-convo",
      body: "  Please send over the updated timeline.  ",
    });
    expect(result.conversationId).toBe("cm-convo");
    expect(result.body).toBe("Please send over the updated timeline.");
  });

  it("rejects an empty body", () => {
    expect(messageSchema.safeParse({ conversationId: "cm-convo", body: "  " }).success).toBe(false);
  });

  it("rejects a body that is too long", () => {
    expect(
      messageSchema.safeParse({ conversationId: "cm-convo", body: "x".repeat(4001) }).success,
    ).toBe(false);
  });
});

describe("conversationSchema", () => {
  it("parses a valid conversation with defaults", () => {
    const result = conversationSchema.parse({
      clientId: "cm-client",
      body: "Welcome aboard!",
    });
    expect(result.subject).toBeNull();
    expect(result.projectId).toBeNull();
    expect(result.body).toBe("Welcome aboard!");
  });

  it("parses subject and project link and normalizes empty strings", () => {
    const result = conversationSchema.parse({
      clientId: "cm-client",
      projectId: "",
      subject: "Website redesign",
      body: "Kickoff notes.",
    });
    expect(result.subject).toBe("Website redesign");
    expect(result.projectId).toBeNull();
  });

  it("rejects a missing client", () => {
    expect(conversationSchema.safeParse({ body: "Hi" }).success).toBe(false);
  });

  it("rejects an over-long subject", () => {
    expect(
      conversationSchema.safeParse({ clientId: "c", subject: "x".repeat(121), body: "Hi" }).success,
    ).toBe(false);
  });
});

describe("requestApprovalSchema", () => {
  it("parses a valid request", () => {
    const result = requestApprovalSchema.parse({
      type: "EXPENSE",
      entityId: "cm-expense",
    });
    expect(result.type).toBe("EXPENSE");
    expect(result.entityId).toBe("cm-expense");
    expect(result.comment).toBeNull();
  });

  it("normalizes empty and over-long comments", () => {
    expect(
      requestApprovalSchema.parse({ type: "INVOICE", entityId: "cm-inv", comment: "  " }).comment,
    ).toBeNull();
    expect(
      requestApprovalSchema.safeParse({
        type: "INVOICE",
        entityId: "cm-inv",
        comment: "x".repeat(1001),
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown type or missing entity", () => {
    expect(requestApprovalSchema.safeParse({ type: "PAYROLL", entityId: "x" }).success).toBe(false);
    expect(requestApprovalSchema.safeParse({ type: "EXPENSE" }).success).toBe(false);
  });
});

describe("decideApprovalSchema", () => {
  it("parses a valid decision", () => {
    const result = decideApprovalSchema.parse({ id: "cm-approval", decision: "REJECTED" });
    expect(result.decision).toBe("REJECTED");
  });

  it("rejects an invalid decision", () => {
    expect(
      decideApprovalSchema.safeParse({ id: "cm-approval", decision: "PENDING" }).success,
    ).toBe(false);
  });
});

describe("cancelApprovalSchema", () => {
  it("parses a valid cancel payload", () => {
    expect(cancelApprovalSchema.parse({ id: "cm-approval" }).id).toBe("cm-approval");
  });

  it("rejects a missing id", () => {
    expect(cancelApprovalSchema.safeParse({}).success).toBe(false);
  });
});

describe("timeEntrySchema", () => {
  it("parses a valid time entry and coerces the date", () => {
    const result = timeEntrySchema.parse({
      taskId: "cm-task",
      date: "2026-08-14",
      minutes: 90,
      note: "  Design review call  ",
    });
    expect(result.date).toBeInstanceOf(Date);
    expect(result.minutes).toBe(90);
    expect(result.note).toBe("Design review call");
  });

  it("normalizes an empty task id and note", () => {
    const result = timeEntrySchema.parse({ date: "2026-08-14", minutes: 30 });
    expect(result.taskId).toBeNull();
    expect(result.note).toBeNull();
  });

  it("rejects entries shorter than 15 minutes", () => {
    expect(
      timeEntrySchema.safeParse({ date: "2026-08-14", minutes: 10 }).success,
    ).toBe(false);
  });

  it("rejects entries over 24 hours", () => {
    expect(
      timeEntrySchema.safeParse({ date: "2026-08-14", minutes: 1500 }).success,
    ).toBe(false);
  });

  it("rejects fractional minutes", () => {
    expect(
      timeEntrySchema.safeParse({ date: "2026-08-14", minutes: 1.5 }).success,
    ).toBe(false);
  });

  it("rejects a missing date", () => {
    expect(timeEntrySchema.safeParse({ minutes: 60 }).success).toBe(false);
  });
});

describe("calendarEventSchema", () => {
  it("parses a valid event and coerces datetimes", () => {
    const result = calendarEventSchema.parse({
      title: "  Kickoff call  ",
      startsAt: "2026-08-20T10:00",
      endsAt: "2026-08-20T11:00",
    });
    expect(result.title).toBe("Kickoff call");
    expect(result.startsAt).toBeInstanceOf(Date);
    expect(result.allDay).toBe(false);
    expect(result.projectId).toBeNull();
  });

  it("keeps an explicit all-day flag", () => {
    const result = calendarEventSchema.parse({
      title: "Team offsite",
      startsAt: "2026-09-01T09:00",
      endsAt: "2026-09-01T17:00",
      allDay: true,
      location: "  ",
    });
    expect(result.allDay).toBe(true);
    expect(result.location).toBeNull();
  });

  it("rejects an event whose end is not after its start", () => {
    expect(
      calendarEventSchema.safeParse({
        title: "Bad",
        startsAt: "2026-08-20T11:00",
        endsAt: "2026-08-20T11:00",
      }).success,
    ).toBe(false);
  });

  it("rejects an empty title", () => {
    expect(
      calendarEventSchema.safeParse({
        title: "  ",
        startsAt: "2026-08-20T10:00",
        endsAt: "2026-08-20T11:00",
      }).success,
    ).toBe(false);
  });

  it("rejects a missing start time", () => {
    expect(
      calendarEventSchema.safeParse({ title: "X", endsAt: "2026-08-20T11:00" }).success,
    ).toBe(false);
  });
});

describe("sharedFileMetadataSchema", () => {
  it("accepts a minimal upload", () => {
    const result = sharedFileMetadataSchema.parse({
      name: "report.pdf",
      size: 1024,
    });
    expect(result.name).toBe("report.pdf");
    expect(result.mimeType).toBeNull();
    expect(result.projectId).toBeNull();
    expect(result.clientId).toBeNull();
  });

  it("trims the filename and keeps optional links", () => {
    const result = sharedFileMetadataSchema.parse({
      name: "  brief v2.docx  ",
      size: 2048,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      projectId: "proj_1",
      clientId: "client_1",
    });
    expect(result.name).toBe("brief v2.docx");
    expect(result.projectId).toBe("proj_1");
    expect(result.clientId).toBe("client_1");
  });

  it("rejects an empty filename", () => {
    expect(sharedFileMetadataSchema.safeParse({ name: "  ", size: 10 }).success).toBe(false);
  });

  it("rejects a negative size", () => {
    expect(sharedFileMetadataSchema.safeParse({ name: "x", size: -1 }).success).toBe(false);
  });

  it("rejects an oversized file", () => {
    expect(
      sharedFileMetadataSchema.safeParse({ name: "big.bin", size: 25 * 1024 * 1024 + 1 }).success,
    ).toBe(false);
  });

  it("rejects a non-integer size", () => {
    expect(sharedFileMetadataSchema.safeParse({ name: "x", size: 1.5 }).success).toBe(false);
  });
});

describe("contractorSchema", () => {
  it("accepts a minimal contractor", () => {
    const result = contractorSchema.parse({ name: "Ada Lovelace" });
    expect(result.name).toBe("Ada Lovelace");
    expect(result.status).toBe("ACTIVE");
    expect(result.rate).toBeNull();
    expect(result.projectIds).toEqual([]);
  });

  it("keeps contact details, rate and project assignments", () => {
    const result = contractorSchema.parse({
      name: "  Linus Torvalds  ",
      email: "linus@kernel.org",
      phone: "+1 555 000 0000",
      company: "Linux Foundation",
      specialty: "Kernel engineering",
      rate: "8500",
      status: "INACTIVE",
      notes: "Core contributor",
      projectIds: ["p_1", "p_2"],
    });
    expect(result.name).toBe("Linus Torvalds");
    expect(result.email).toBe("linus@kernel.org");
    expect(result.rate).toBe(8500);
    expect(result.status).toBe("INACTIVE");
    expect(result.projectIds).toEqual(["p_1", "p_2"]);
  });

  it("turns an empty email into null", () => {
    const result = contractorSchema.parse({ name: "X", email: "" });
    expect(result.email).toBeNull();
  });

  it("rejects a blank non-empty email", () => {
    expect(contractorSchema.safeParse({ name: "X", email: "   " }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(contractorSchema.safeParse({ name: "X", email: "not-an-email" }).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(contractorSchema.safeParse({ name: "  " }).success).toBe(false);
  });

  it("rejects a negative rate", () => {
    expect(contractorSchema.safeParse({ name: "X", rate: "-5" }).success).toBe(false);
  });
});

describe("businessProfileSchema", () => {
  it("applies default currency and timezone", () => {
    const result = businessProfileSchema.parse({});
    expect(result.currency).toBe("USD");
    expect(result.timezone).toBe("UTC");
    expect(result.invoicePrefix).toBeNull();
  });

  it("keeps the workspace values", () => {
    const result = businessProfileSchema.parse({
      name: "  Shaan Studio  ",
      email: "hello@shaan.example",
      phone: "+1 555 000 0000",
      currency: "BDT",
      timezone: "Asia/Dhaka",
      invoicePrefix: "inv",
    });
    expect(result.name).toBe("Shaan Studio");
    expect(result.email).toBe("hello@shaan.example");
    expect(result.currency).toBe("BDT");
    expect(result.timezone).toBe("Asia/Dhaka");
    expect(result.invoicePrefix).toBe("inv");
  });

  it("rejects an unsupported currency", () => {
    expect(businessProfileSchema.safeParse({ currency: "XYZ" }).success).toBe(false);
  });

  it("rejects an unsupported timezone", () => {
    expect(businessProfileSchema.safeParse({ timezone: "Mars/Olympus" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(businessProfileSchema.safeParse({ email: "nope" }).success).toBe(false);
  });

  it("rejects an overlong invoice prefix", () => {
    expect(businessProfileSchema.safeParse({ invoicePrefix: "ABCDEFGHIJK" }).success).toBe(false);
  });
});

describe("leadScoreResultSchema", () => {
  it("accepts a complete score object", () => {
    const result = leadScoreResultSchema.safeParse({
      score: 72,
      summary: "Promising inbound lead.",
      strengths: ["High intent"],
      risks: [],
      nextSteps: ["Send discovery email"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a score outside 0-100", () => {
    const result = leadScoreResultSchema.safeParse({
      score: 150,
      summary: "Promising inbound lead.",
      strengths: [],
      risks: [],
      nextSteps: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer score", () => {
    const result = leadScoreResultSchema.safeParse({
      score: 72.5,
      summary: "Promising inbound lead.",
      strengths: [],
      risks: [],
      nextSteps: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing required key", () => {
    const result = leadScoreResultSchema.safeParse({
      score: 72,
      summary: "Promising inbound lead.",
      strengths: ["High intent"],
      risks: [],
    });
    expect(result.success).toBe(false);
  });
});
