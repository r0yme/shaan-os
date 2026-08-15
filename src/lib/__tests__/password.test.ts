import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes a password and verifies the correct plaintext", async () => {
    const hash = await hashPassword("Password123!");
    expect(hash).not.toBe("Password123!");
    expect(await verifyPassword("Password123!", hash)).toBe(true);
  });

  it("rejects the wrong plaintext", async () => {
    const hash = await hashPassword("Password123!");
    expect(await verifyPassword("WrongPassword1!", hash)).toBe(false);
  });

  it("produces unique salts", async () => {
    const a = await hashPassword("Password123!");
    const b = await hashPassword("Password123!");
    expect(a).not.toBe(b);
  });
});
