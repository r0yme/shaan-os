import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { DataTable } from "@/components/ui/data-table";
import {
  ProjectStatusBadge,
  ProjectPriorityBadge,
} from "@/components/projects/status-badges";
import { PaymentMethodBadge } from "@/components/billing/status-badges";
import { ProjectDetailActions } from "@/components/projects/project-detail-actions";
import {
  MilestonesPanel,
  type SerializedMilestone,
} from "@/components/projects/milestones-panel";
import { UserKind } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Project" };

function dateOnly(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleDateString("en-US", { dateStyle: "medium" });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await guardPermission("projects.view");
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      client: { select: { id: true, name: true, kind: true, status: true } },
      manager: { select: { id: true, name: true, email: true } },
      milestones: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) notFound();

  const [clients, managers, projectPayments] = await Promise.all([
    prisma.client.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { kind: UserKind.USER, status: "ACTIVE", deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          { projectId: project.id },
          { task: { projectId: project.id } },
          { invoice: { projectId: project.id } },
        ],
      },
      include: {
        invoice: { select: { number: true } },
        task: { select: { title: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  const canEditProject =
    user.permissions.has("projects.update") || user.permissions.has("projects.delete");
  const canManageMilestones = ["milestones.create", "milestones.update", "milestones.delete"].some(
    (key) => user.permissions.has(key),
  );

  const serializedMilestones: SerializedMilestone[] = project.milestones.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    status: m.status,
    dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    completedAt: m.completedAt ? m.completedAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  }));

  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  const managerOptions = managers.map((m) => ({ id: m.id, name: m.name ?? m.id }));

  const formValue = {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    priority: project.priority,
    clientId: project.clientId,
    managerId: project.managerId,
    budget: project.budget,
    startDate: project.startDate ? project.startDate.toISOString().slice(0, 10) : null,
    deadline: project.deadline ? project.deadline.toISOString().slice(0, 10) : null,
    notes: project.notes,
  };

  return (
    <>
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      <PageHeading
        title={project.name}
        description={
          <span className="flex items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <ProjectPriorityBadge priority={project.priority} />
          </span>
        }
        actions={
          canEditProject ? (
            <ProjectDetailActions
              project={formValue}
              clientOptions={clientOptions}
              managerOptions={managerOptions}
            />
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.description ? (
                <p className="whitespace-pre-wrap text-sm text-foreground">{project.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No description on file.</p>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  {
                    key: "amount",
                    header: "Amount",
                    cell: (payment) => (
                      <span className="font-medium text-foreground">
                        {formatCurrency(payment.amountCents / 100)}
                      </span>
                    ),
                  },
                  {
                    key: "linked",
                    header: "Linked to",
                    cell: (payment) => (
                      <span className="text-muted-foreground">
                        {payment.invoice
                          ? `Invoice ${payment.invoice.number}`
                          : payment.task
                            ? payment.task.title
                            : "Project"}
                      </span>
                    ),
                  },
                  {
                    key: "method",
                    header: "Method",
                    cell: (payment) => <PaymentMethodBadge method={payment.method} />,
                  },
                  {
                    key: "paid",
                    header: "Paid on",
                    cell: (payment) => (
                      <span className="text-muted-foreground">{dateOnly(payment.paidAt)}</span>
                    ),
                  },
                  {
                    key: "proof",
                    header: "Proof",
                    cell: (payment) =>
                      payment.proofFileName ? (
                        <a
                          href={`/api/payments/${payment.id}/proof`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      ),
                  },
                ]}
                data={projectPayments}
                keyExtractor={(payment) => payment.id}
                emptyTitle="No payments on this project"
                emptyDescription="Payments linked to this project, its tasks or its invoices will appear here."
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Client</CardTitle>
            </CardHeader>
            <CardContent>
              {project.client ? (
                <Link
                  href={`/clients/${project.client.id}`}
                  className="flex items-center gap-3 hover:underline"
                >
                  <Avatar name={project.client.name} className="h-8 w-8 text-xs" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{project.client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {project.client.kind === "BUSINESS" ? "Business" : "Individual"}
                    </p>
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Internal project — no client</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Project manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.manager ? (
                <div className="flex items-center gap-3">
                  <Avatar name={project.manager.name} />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {project.manager.name ?? "Unnamed"}
                    </p>
                    <p className="text-xs text-muted-foreground">{project.manager.email}</p>
                  </div>
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
              <div className="flex items-start gap-3">
                <CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="text-sm font-medium text-foreground">
                    {project.budget != null
                      ? `$${(project.budget / 100).toLocaleString()}`
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Start date</p>
                  <p className="text-sm font-medium text-foreground">
                    {dateOnly(project.startDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="text-sm font-medium text-foreground">{dateOnly(project.deadline)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                Created <span className="text-foreground">{formatDate(project.createdAt)}</span>
              </p>
              <p className="text-muted-foreground">
                Updated <span className="text-foreground">{formatDate(project.updatedAt)}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <MilestonesPanel
          projectId={project.id}
          milestones={serializedMilestones}
          canManage={canManageMilestones}
        />
      </div>
    </>
  );
}
