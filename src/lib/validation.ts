import { z } from "zod";
import { ValidationError } from "@/lib/errors";

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

export function parseWithZod<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError("The submitted data could not be validated.", result.error.flatten());
  }
  return result.data;
}
