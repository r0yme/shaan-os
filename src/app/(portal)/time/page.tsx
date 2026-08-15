import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import {
  TimeManager,
  type SerializedTimeEntry,
} from "@/components/time/time-manager";

export const metadata: Metadata = { title: "Time" };

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; task?: string }>;
}) {
  const user = await guardPermission("time.view");
  const { user: userFilter, task: taskFilter } = await searchParams;

  const [teamMembers, tasks] = await Promise.all([
    prisma.user.findMany({
      where: { kind: "USER", deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { deletedAt: null },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const userIds = new Set(teamMembers.map((u) => u.id));
  const taskIds = new Set(tasks.map((t) => t.id));

  const [entries, allEntries] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        deletedAt: null,
        ...(userFilter && userIds.has(userFilter) ? { userId: userFilter } : {}),
        ...(taskFilter && taskIds.has(taskFilter) ? { taskId: taskFilter } : {}),
      },
      include: {
        user: { select: { name: true } },
        task: { select: { title: true, project: { select: { name: true } } } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.timeEntry.findMany({
      where: { deletedAt: null },
      select: { minutes: true, date: true },
    }),
  ]);

  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let weekMinutes = 0;
  let monthMinutes = 0;
  let allTimeMinutes = 0;
  for (const entry of allEntries) {
    allTimeMinutes += entry.minutes;
    if (entry.date >= weekStart) weekMinutes += entry.minutes;
    if (entry.date >= monthStart) monthMinutes += entry.minutes;
  }

  const serialized: SerializedTimeEntry[] = entries.map((entry) => ({
    id: entry.id,
    userId: entry.userId,
    taskId: entry.taskId,
    minutes: entry.minutes,
    date: entry.date.toISOString(),
    note: entry.note,
    userName: entry.user?.name ?? null,
    taskName: entry.task?.title ?? null,
    projectName: entry.task?.project?.name ?? null,
    createdAt: entry.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeading title="Time" description="Track hours across tasks and projects." />
      <TimeManager
        entries={serialized}
        userFilter={userFilter && userIds.has(userFilter) ? userFilter : ""}
        taskFilter={taskFilter && taskIds.has(taskFilter) ? taskFilter : ""}
        weekMinutes={weekMinutes}
        monthMinutes={monthMinutes}
        allTimeMinutes={allTimeMinutes}
        userOptions={teamMembers.map((u) => ({ id: u.id, name: u.name ?? u.id }))}
        taskOptions={tasks.map((t) => ({ id: t.id, name: t.title }))}
        currentUserId={user.id}
        canCreate={user.permissions.has("time.create")}
        canManageAny={user.permissions.has("employees.view")}
      />
    </>
  );
}
