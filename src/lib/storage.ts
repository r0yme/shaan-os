import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function uploadRoot(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads");
}

export function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f/\\]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 255) || "file";
}

function resolveWithinRoot(storageKey: string): string {
  const root = path.resolve(uploadRoot());
  const resolved = path.resolve(root, storageKey);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Invalid storage key.");
  }
  return resolved;
}

export async function saveUploadBytes(bytes: Uint8Array): Promise<string> {
  const root = uploadRoot();
  const now = new Date();
  const monthDir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const storageKey = `${monthDir}/${randomBytes(16).toString("hex")}`;
  await mkdir(path.join(root, monthDir), { recursive: true });
  await writeFile(path.join(root, storageKey), bytes);
  return storageKey;
}

export async function readStoredFile(storageKey: string): Promise<Buffer> {
  return readFile(resolveWithinRoot(storageKey));
}

export async function removeStoredFile(storageKey: string): Promise<void> {
  try {
    await rm(resolveWithinRoot(storageKey), { force: true });
  } catch {
    // Best-effort cleanup; a missing blob must never break the record.
  }
}
