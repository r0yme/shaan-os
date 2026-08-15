import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { visibleTasksWhere } from "@/lib/task-scope";
import { PageHeading } from "@/components/page-heading";
import { TasksBoard, type SerializedTask } from "@/components/tasks/tasks-board";
import { UserKind } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await guardPermission("tasks.view");
  const { project } = await searchParams;

  const [tasks, projects, assignees] = await Promise.all([
    prisma.task.findMany({
      where: {
        deletedAt: null,
        ...visibleTasksWhere(user),
        ...(project ? { projectId: project } : {}),
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { kind: UserKind.USER, status: "ACTIVE", deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized: SerializedTask[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId,
    projectName: task.project?.name ?? null,
    assigneeId: task.assigneeId,
    assigneeName: task.assignee?.name ?? null,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    estimatedHours: task.estimatedHours,
    createdAt: task.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeading
        title="Tasks"
        description="Track and move work across the team."
      />
      <TasksBoard
        tasks={serialized}
        projectFilter={project ?? ""}
        projectOptions={projects.map((p) => ({ id: p.id, name: p.name }))}
        assigneeOptions={assignees.map((a) => ({ id: a.id, name: a.name ?? a.id }))}
        canCreate={user.permissions.has("tasks.create")}
        canEdit={user.permissions.has("tasks.update")}
        canAssign={user.permissions.has("tasks.assign")}
        canDelete={user.permissions.has("tasks.delete")}
      />
    </>
  );
}
