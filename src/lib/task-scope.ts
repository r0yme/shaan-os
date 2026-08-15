import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/session";

/**
 * Users holding tasks.view_all (owner, admin, project manager, or anyone
 * explicitly granted the permission) can see and touch every task in the
 * workspace. Everyone else is scoped to tasks assigned to them or created
 * by them — enforced server-side in both reads and writes.
 */
export function canViewAllTasks(user: CurrentUser): boolean {
  return user.permissions.has("tasks.view_all");
}

export function visibleTasksWhere(user: CurrentUser): Prisma.TaskWhereInput {
  if (canViewAllTasks(user)) return {};
  return { OR: [{ assigneeId: user.id }, { createdById: user.id }] };
}

/** Returns true when the user may access a task that is not theirs to see. */
export function canAccessTask(user: CurrentUser, task: {
  assigneeId: string | null;
  createdById: string | null;
}): boolean {
  if (canViewAllTasks(user)) return true;
  return task.assigneeId === user.id || task.createdById === user.id;
}
