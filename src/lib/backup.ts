import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const execFileAsync = promisify(execFile);

export const BACKUP_SUFFIX = ".dump";

export function backupRoot(): string {
  return process.env.BACKUP_DIR || path.join(process.cwd(), "storage", "backups");
}

export function pgBinDir(): string {
  return process.env.PG_BIN || path.join(process.env.LOCALAPPDATA ?? "", "PostgreSQL", "pgsql", "bin");
}

function parseDatabaseUrl(url: string): {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
} {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "127.0.0.1",
    port: parsed.port || "5432",
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
  };
}

export async function createBackup(now = new Date()): Promise<string> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  const conn = parseDatabaseUrl(url);
  const root = backupRoot();
  await mkdir(root, { recursive: true });

  const stamp = now.toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const filename = `shaan_os_${stamp}${BACKUP_SUFFIX}`;
  const target = path.join(root, filename);

  const bin = path.join(pgBinDir(), process.platform === "win32" ? "pg_dump.exe" : "pg_dump");
  const env = {
    ...process.env,
    PGHOST: conn.host,
    PGPORT: conn.port,
    PGUSER: conn.user,
    PGPASSWORD: conn.password,
    PGDATABASE: conn.database,
  };

  try {
    await execFileAsync(
      bin,
      ["--format=custom", "--no-owner", "--no-privileges", "--file", target],
      { env, timeout: 5 * 60 * 1000 },
    );
  } catch (error) {
    logger.error({ err: error }, "Database backup failed");
    throw new Error("Database backup failed. Check that PostgreSQL binaries are available.");
  }
  return filename;
}

export interface BackupInfo {
  name: string;
  sizeBytes: number;
  createdAt: string;
}

export async function listBackups(): Promise<BackupInfo[]> {
  const root = backupRoot();
  let names: string[];
  try {
    names = await readdir(root);
  } catch {
    return [];
  }
  const backups: BackupInfo[] = [];
  for (const name of names) {
    if (!name.endsWith(BACKUP_SUFFIX)) continue;
    const info = await stat(path.join(root, name));
    if (info.size === 0) continue;
    backups.push({
      name,
      sizeBytes: info.size,
      createdAt: info.mtime.toISOString(),
    });
  }
  return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function resolveBackupPath(name: string): string {
  const root = path.resolve(backupRoot());
  const resolved = path.resolve(root, name);
  if (!name.endsWith(BACKUP_SUFFIX) || !resolved.startsWith(root + path.sep)) {
    throw new NotFoundError("Backup not found.");
  }
  return resolved;
}

export async function readBackup(name: string): Promise<Buffer> {
  const target = resolveBackupPath(name);
  try {
    return await readFile(target);
  } catch {
    throw new NotFoundError("Backup not found.");
  }
}

export async function removeBackup(name: string): Promise<void> {
  const target = resolveBackupPath(name);
  try {
    await rm(target, { force: true });
  } catch {
    throw new NotFoundError("Backup not found.");
  }
}
