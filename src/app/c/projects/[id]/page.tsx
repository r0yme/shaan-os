import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CircleDollarSign, Flag } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  ProjectStatusBadge,
  ProjectPriorityBadge,
  MilestoneStatusBadge,
} from "@/components/projects/status-badges";

export const metadata: Metadata = { title: "Project" };

function dateOnly(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleDateString("en-US", { dateStyle: "medium" });
}

export default async function ClientProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const clientProfile = await prisma.client.findFirst({
    where: { portalUserId: user.id, deletedAt: null },
    select: { id: true },
  });

  const project = clientProfile
    ? await prisma.project.findFirst({
        where: { id, clientId: clientProfile.id, deletedAt: null },
        include: {
          manager: { select: { id: true, name: true, email: true } },
          milestones: { orderBy: { createdAt: "asc" } },
        },
      })
    : null;

  if (!project) notFound();

  const infoRows = [
    { label: "Start date", value: dateOnly(project.startDate) },
    { label: "Deadline", value: dateOnly(project.deadline) },
    {
      label: "Budget",
      value: project.budget != null ? `$${(project.budget / 100).toLocaleString()}` : "—",
    },
  ];

  return (
    <>
      <Link
        href="/c"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to overview
      </Link>

      <PageHeading
        title={project.name}
        description={
          <span className="flex items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <ProjectPriorityBadge priority={project.priority} />
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                About this project
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.description ? (
                <p className="whitespace-pre-wrap text-sm text-foreground">{project.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No description provided.</p>
              )}
            </CardContent>
          </Card>

          {project.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-foreground">{project.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Project manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.manager ? (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {project.manager.name ?? "Unnamed"}
                  </p>
                  {project.manager.email && (
                    <p className="text-xs text-muted-foreground">{project.manager.email}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unassigned</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  {row.label === "Budget" ? (
                    <CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">{row.label}</p>
                    <p className="text-sm font-medium text-foreground">{row.value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                Updated <span className="text-foreground">{formatDate(project.updatedAt)}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          <Flag className="h-5 w-5 text-muted-foreground" />
          Milestones
        </h2>
        <DataTable
          columns={[
            {
              key: "title",
              header: "Milestone",
              cell: (m) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{m.title}</p>
                  {m.description && (
                    <p className="truncate text-xs text-muted-foreground">{m.description}</p>
                  )}
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              cell: (m) => <MilestoneStatusBadge status={m.status} />,
            },
            {
              key: "due",
              header: "Due date",
              cell: (m) => (
                <span className="text-muted-foreground">{dateOnly(m.dueDate)}</span>
              ),
            },
          ]}
          data={project.milestones}
          keyExtractor={(m) => m.id}
          emptyIcon={Flag}
          emptyTitle="No milestones"
          emptyDescription="Milestones for this project will appear here."
        />
      </div>
    </>
  );
}
