import { z } from "zod";
import { ValidationError } from "@/lib/errors";
import { CURRENCIES, TIMEZONES } from "@/lib/settings";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("A valid email address is required.")
  .max(254, "Email address is too long.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(120, "Name must be at most 120 characters.");

export const idSchema = z.string().trim().min(1).max(64);

export const clientStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);
export const clientKindSchema = z.enum(["BUSINESS", "INDIVIDUAL"]);
export const leadSourceSchema = z.enum([
  "WEBSITE",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "EMAIL",
  "CALL",
  "OUTREACH",
  "OTHER",
]);
export const leadStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
]);

export const optionalEmailSchema = z
  .union([z.literal(""), emailSchema])
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v));

export function optionalTextSchema(max: number, field: string) {
  return z
    .string()
    .trim()
    .max(max, `${field} must be at most ${max} characters.`)
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v));
}

export const optionalCentsSchema = z
  .union([
    z.literal(""),
    z.string().trim().regex(/^\d+$/, "Value must be a whole number."),
  ])
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : Number(v)))
  .refine((v) => v === null || v <= 1_000_000_000, "Value is too large.");

export const optionalIdSchema = z
  .string()
  .trim()
  .max(64)
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v));

export const optionalDateSchema = z
  .union([z.literal(""), z.coerce.date()])
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v));

export const clientSchema = z.object({
  name: nameSchema,
  email: optionalEmailSchema,
  phone: optionalTextSchema(30, "Phone"),
  company: optionalTextSchema(120, "Company"),
  website: optionalTextSchema(200, "Website"),
  address: optionalTextSchema(300, "Address"),
  notes: optionalTextSchema(2000, "Notes"),
  status: clientStatusSchema.default("ACTIVE"),
  kind: clientKindSchema.default("BUSINESS"),
});

export const leadSchema = z.object({
  name: nameSchema,
  email: optionalEmailSchema,
  phone: optionalTextSchema(30, "Phone"),
  company: optionalTextSchema(120, "Company"),
  source: leadSourceSchema.default("OTHER"),
  status: leadStatusSchema.default("NEW"),
  value: optionalCentsSchema,
  notes: optionalTextSchema(2000, "Notes"),
  assigneeId: z.string().trim().min(1).max(64).optional(),
  clientId: z.string().trim().min(1).max(64).optional(),
});

export const projectStatusSchema = z.enum([
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
]);
export const projectPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const milestoneStatusSchema = z.enum(["PENDING", "COMPLETED"]);

export const projectSchema = z.object({
  name: nameSchema,
  description: optionalTextSchema(4000, "Description"),
  status: projectStatusSchema.default("PLANNING"),
  priority: projectPrioritySchema.default("MEDIUM"),
  clientId: optionalIdSchema,
  managerId: optionalIdSchema,
  budget: optionalCentsSchema,
  startDate: optionalDateSchema,
  deadline: optionalDateSchema,
  notes: optionalTextSchema(2000, "Notes"),
});

export const milestoneSchema = z.object({
  title: nameSchema,
  description: optionalTextSchema(2000, "Description"),
  status: milestoneStatusSchema.default("PENDING"),
  dueDate: optionalDateSchema,
});

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const optionalHoursSchema = z
  .union([
    z.literal(""),
    z.string().trim().regex(/^\d+$/, "Hours must be a whole number."),
  ])
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : Number(v)))
  .refine((v) => v === null || (v >= 1 && v <= 10000), "Hours must be between 1 and 10,000.");

export const taskSchema = z.object({
  title: nameSchema,
  description: optionalTextSchema(4000, "Description"),
  status: taskStatusSchema.default("TODO"),
  priority: taskPrioritySchema.default("MEDIUM"),
  projectId: optionalIdSchema,
  assigneeId: optionalIdSchema,
  dueDate: optionalDateSchema,
  estimatedHours: optionalHoursSchema,
});

export const invoiceStatusSchema = z.enum(["DRAFT", "SENT", "PAID", "VOID"]);
export const paymentMethodSchema = z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "OTHER"]);

export const invoiceItemSchema = z.object({
  description: nameSchema,
  quantity: z
    .union([
      z.literal(""),
      z.string().trim().regex(/^\d+$/, "Quantity must be a whole number."),
    ])
    .optional()
    .transform((v) => (v === undefined || v === "" ? 1 : Number(v)))
    .refine((v) => v >= 1 && v <= 100000, "Quantity must be between 1 and 100,000."),
  unitPriceCents: z
    .union([
      z.literal(""),
      z.string().trim().regex(/^\d+$/, "Price must be a whole number."),
    ])
    .optional()
    .transform((v) => (v === undefined || v === "" ? 0 : Number(v)))
    .refine((v) => v >= 0 && v <= 100_000_000_000, "Price is too large."),
});

export const invoiceSchema = z.object({
  clientId: optionalIdSchema,
  projectId: optionalIdSchema,
  status: invoiceStatusSchema.default("DRAFT"),
  issueDate: optionalDateSchema,
  dueDate: optionalDateSchema,
  // Tax rate in basis points (500 = 5%). Handled as bps to avoid float errors.
  taxRateBps: z
    .union([
      z.literal(""),
      z.string().trim().regex(/^\d+$/, "Tax rate must be a whole number."),
    ])
    .optional()
    .transform((v) => (v === undefined || v === "" ? 0 : Number(v)))
    .refine((v) => v >= 0 && v <= 10000, "Tax rate cannot exceed 100%."),
  notes: optionalTextSchema(2000, "Notes"),
  items: z
    .array(invoiceItemSchema)
    .min(1, "Add at least one line item.")
    .max(50, "Too many line items."),
});

export const paymentSchema = z.object({
  amountCents: z
    .string()
    .trim()
    .regex(/^\d+$/, "Amount must be a whole number.")
    .transform((v) => Number(v))
    .refine((v) => v > 0, "Payment amount must be greater than zero.")
    .refine((v) => v <= 1_000_000_000_000, "Amount is too large."),
  method: paymentMethodSchema.default("BANK_TRANSFER"),
  paidAt: optionalDateSchema,
  reference: optionalTextSchema(100, "Reference"),
  notes: optionalTextSchema(500, "Notes"),
  invoiceId: optionalIdSchema,
  projectId: optionalIdSchema,
  taskId: optionalIdSchema,
  proofFileName: optionalTextSchema(255, "File name"),
  proofMimeType: optionalTextSchema(120, "File type"),
  proofSizeBytes: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(100 * 1024 * 1024)])
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v)),
});

/**
 * A payment must be linked to at least one of invoice, project or task.
 */
export const linkedPaymentSchema = paymentSchema.refine(
  (data) => data.invoiceId || data.projectId || data.taskId,
  "Link the payment to an invoice, project or task.",
);

/**
 * Client-portal payment: must be linked to at least one of invoice,
 * project or task, and may carry an uploaded proof of payment.
 */
export const clientPaymentSchema = linkedPaymentSchema;

export const expenseCategorySchema = z.enum([
  "SOFTWARE",
  "HARDWARE",
  "SERVICES",
  "TRAVEL",
  "MEALS",
  "OFFICE",
  "OTHER",
]);

export const expenseSchema = z.object({
  amountCents: z
    .string()
    .trim()
    .regex(/^\d+$/, "Amount must be a whole number.")
    .transform((v) => Number(v))
    .refine((v) => v > 0, "Expense amount must be greater than zero.")
    .refine((v) => v <= 1_000_000_000_000, "Amount is too large."),
  category: expenseCategorySchema.default("OTHER"),
  merchant: optionalTextSchema(120, "Merchant"),
  description: optionalTextSchema(4000, "Description"),
  incurredAt: optionalDateSchema,
  projectId: optionalIdSchema,
  clientId: optionalIdSchema,
});

export const userStatusSchema = z.enum(["ACTIVE", "INVITED", "SUSPENDED", "INACTIVE"]);

const employeeBaseSchema = z.object({
  name: nameSchema,
  phone: optionalTextSchema(30, "Phone"),
  jobTitle: optionalTextSchema(80, "Job title"),
  status: userStatusSchema.default("INVITED"),
  roleKeys: z
    .array(z.string().trim().min(1, "Role is required."))
    .min(1, "Assign at least one role.")
    .max(10, "Too many roles."),
});

export const createEmployeeSchema = employeeBaseSchema.extend({
  email: emailSchema,
  password: passwordSchema,
});

export const updateEmployeeSchema = employeeBaseSchema;

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, "Message is required.")
  .max(4000, "Message must be at most 4000 characters.");

export const messageSchema = z.object({
  conversationId: idSchema,
  body: messageBodySchema,
});

export const conversationSchema = z.object({
  clientId: idSchema,
  projectId: optionalIdSchema,
  subject: z
    .string()
    .trim()
    .max(120, "Subject must be at most 120 characters.")
    .optional()
    .transform((value) => (value === undefined || value === "" ? null : value)),
  body: messageBodySchema,
});

export const approvalTypeSchema = z.enum(["INVOICE", "EXPENSE", "MILESTONE"]);

export const approvalDecisionSchema = z.enum(["APPROVED", "REJECTED"]);

const approvalCommentSchema = z
  .string()
  .trim()
  .max(1000, "Comment must be at most 1000 characters.")
  .optional()
  .transform((value) => (value === undefined || value === "" ? null : value));

export const requestApprovalSchema = z.object({
  type: approvalTypeSchema,
  entityId: idSchema,
  comment: approvalCommentSchema,
});

export const decideApprovalSchema = z.object({
  id: idSchema,
  decision: approvalDecisionSchema,
  comment: approvalCommentSchema,
});

export const cancelApprovalSchema = z.object({
  id: idSchema,
});

export const timeEntrySchema = z.object({
  taskId: optionalIdSchema,
  date: z.coerce.date(),
  minutes: z
    .number()
    .int("Time must be a whole number of minutes.")
    .min(15, "Time must be at least 15 minutes.")
    .max(1440, "Time must be at most 24 hours per entry."),
  note: optionalTextSchema(1000, "Note"),
});

export const calendarEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Event title is required.")
      .max(120, "Event title must be at most 120 characters."),
    description: optionalTextSchema(2000, "Description"),
    location: optionalTextSchema(120, "Location"),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    allDay: z.boolean().optional().default(false),
    projectId: optionalIdSchema,
    clientId: optionalIdSchema,
  })
  .refine((value) => value.endsAt > value.startsAt, "End time must be after the start time.");

export const MAX_SHARED_FILE_BYTES = 25 * 1024 * 1024;

export const sharedFileMetadataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Filename is required.")
    .max(255, "Filename is too long."),
  mimeType: optionalTextSchema(200, "MIME type"),
  size: z
    .number()
    .int()
    .nonnegative()
    .max(MAX_SHARED_FILE_BYTES, "File exceeds the 25 MB upload limit."),
  projectId: optionalIdSchema,
  clientId: optionalIdSchema,
});

export const contractorStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const contractorSchema = z.object({
  name: nameSchema,
  email: optionalEmailSchema,
  phone: optionalTextSchema(30, "Phone"),
  company: optionalTextSchema(120, "Company"),
  specialty: optionalTextSchema(120, "Specialty"),
  rate: optionalCentsSchema,
  status: contractorStatusSchema.default("ACTIVE"),
  notes: optionalTextSchema(2000, "Notes"),
  projectIds: z.array(idSchema).optional().default([]),
});

export const notificationActionSchema = z.object({
  id: idSchema,
});

export const businessProfileSchema = z.object({
  name: optionalTextSchema(120, "Business name"),
  email: optionalEmailSchema,
  phone: optionalTextSchema(30, "Phone"),
  website: optionalTextSchema(200, "Website"),
  address: optionalTextSchema(500, "Address"),
  country: optionalTextSchema(60, "Country"),
  currency: z.enum(CURRENCIES).default("USD"),
  timezone: z.enum(TIMEZONES).default("UTC"),
  invoicePrefix: optionalTextSchema(8, "Invoice prefix"),
});

export function parseWithZod<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError("The submitted data could not be validated.", result.error.flatten());
  }
  return result.data;
}

export const aiModeSchema = z.enum(["chat", "draft", "summary", "score"]);

export const aiEntityTypeSchema = z.enum(["client", "project", "lead"]);

export const aiMessageSchema = z
  .string()
  .trim()
  .min(1, "Message is required.")
  .max(4000, "Message is too long.");

export const aiChatSchema = z.object({
  mode: aiModeSchema,
  message: aiMessageSchema,
  entityType: aiEntityTypeSchema.optional(),
  entityId: idSchema.optional(),
});

export const aiLeadScoreSchema = z.object({
  leadId: idSchema,
});

export const loginSecuritySchema = z.object({
  lockoutEnabled: z.boolean(),
  maxFailedLogins: z.number().int().min(3).max(20),
  lockDurationMin: z.number().int().min(1).max(1440),
  rateLimitEnabled: z.boolean(),
  ipAttemptLimit: z.number().int().min(5).max(200),
  ipAttemptWindowMin: z.number().int().min(1).max(1440),
  failLimitPerEmailIp: z.number().int().min(1).max(10),
  failWindowMin: z.number().int().min(1).max(1440),
});

export type LoginSecuritySettings = z.infer<typeof loginSecuritySchema>;

export const leadScoreResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  strengths: z.array(z.string()).max(12),
  risks: z.array(z.string()).max(12),
  nextSteps: z.array(z.string()).max(12),
});

export type LeadScoreResult = z.infer<typeof leadScoreResultSchema>;
