import { describe, expect, it } from "vitest";
import {
  clientSchema,
  emailSchema,
  leadSchema,
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
