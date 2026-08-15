import { describe, expect, it } from "vitest";
import {
  emailSchema,
  nameSchema,
  passwordSchema,
  parseWithZod,
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
