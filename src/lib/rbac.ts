import { prisma } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";

/**
 * Returns the effective permission set for a user across all assigned roles.
 * Permissions are always resolved server-side from the database. Never trust
 * client-supplied roles or permissions.
 */
export async function getUserPermissions(userId: string): Promise<Set<string>> {
  const rows = await prisma.userRole.findMany({
    where: { userId },
    select: {
      role: {
        select: {
          key: true,
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  });

  const permissions = new Set<string>();
  for (const userRole of rows) {
    for (const rp of userRole.role.permissions) {
      permissions.add(rp.permission.key);
    }
  }
  return permissions;
}

export async function getUserRoleKeys(userId: string): Promise<string[]> {
  const rows = await prisma.userRole.findMany({
    where: { userId },
    select: { role: { select: { key: true } } },
  });
  return rows.map((r) => r.role.key);
}

export function hasPermission(permissions: Set<string>, key: string): boolean {
  return permissions.has(key);
}

export function assertPermission(permissions: Set<string>, key: string): void {
  if (!permissions.has(key)) {
    throw new ForbiddenError(`Missing required permission: ${key}`);
  }
}
