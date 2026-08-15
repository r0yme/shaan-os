import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import { monthEnd, monthKey, monthStart } from "@/lib/calendar";
import {
  CalendarView,
  type SerializedCalendarEvent,
} from "@/components/calendar/calendar-view";

export const metadata: Metadata = { title: "Calendar" };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await guardPermission("calendar.view");
  const { month: monthParam } = await searchParams;
  const month = monthParam && MONTH_RE.test(monthParam) ? monthParam : monthKey(new Date());

  const start = monthStart(month);
  const end = monthEnd(month);
  const offset = (start.getDay() + 6) % 7;
  const tailOffset = 6 - ((end.getDay() + 6) % 7);
  const rangeStart = new Date(start.getFullYear(), start.getMonth(), 1 - offset);
  const rangeEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate() + tailOffset);

  const [events, projects, clients] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: { deletedAt: null, startsAt: { gte: rangeStart, lte: rangeEnd } },
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
      orderBy: [{ startsAt: "asc" }],
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized: SerializedCalendarEvent[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    allDay: event.allDay,
    projectId: event.projectId,
    clientId: event.clientId,
    projectName: event.project?.name ?? null,
    createdById: event.createdById,
  }));

  return (
    <>
      <PageHeading title="Calendar" description="Schedule events across projects and clients." />
      <CalendarView
        events={serialized}
        month={month}
        projectOptions={projects.map((p) => ({ id: p.id, name: p.name }))}
        clientOptions={clients.map((c) => ({ id: c.id, name: c.name }))}
        currentUserId={user.id}
        canCreate={user.permissions.has("calendar.create")}
        canDelete={user.permissions.has("calendar.delete")}
        canManageAny={user.permissions.has("employees.view")}
      />
    </>
  );
}
