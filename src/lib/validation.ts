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

export function parseWithZod<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError("The submitted data could not be validated.", result.error.flatten());
  }
  return result.data;
}
