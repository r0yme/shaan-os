import { redirect } from "next/navigation";
import {
  requireUser as requireUserBase,
  requirePermission as requirePermissionBase,
  requireRole as requireRoleBase,
} from "@/lib/session";
import type { CurrentUser } from "@/lib/session";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

/**
 * Page-level guards. Unlike the raw session guards (which throw AppError for
 * route handlers / server actions), these translate auth failures into
 * redirects so a browser hitting a page never receives a raw 500.
 */
export async function guardUser(): Promise<CurrentUser> {
  try {
    return await requireUserBase();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    if (error instanceof ForbiddenError) redirect("/forbidden");
    throw error;
  }
}

export async function guardPermission(key: string): Promise<CurrentUser> {
  try {
    return await requirePermissionBase(key);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    if (error instanceof ForbiddenError) redirect("/forbidden");
    throw error;
  }
}

export async function guardRole(roleKey: string): Promise<CurrentUser> {
  try {
    return await requireRoleBase(roleKey);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/login");
    if (error instanceof ForbiddenError) redirect("/forbidden");
    throw error;
  }
}
