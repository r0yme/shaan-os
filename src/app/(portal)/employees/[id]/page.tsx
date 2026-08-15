import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, CalendarDays, Mail, Phone } from "lucide-react";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { formatDate } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { RoleBadge, UserStatusBadge } from "@/components/employees/status-badges";
import { EmployeeDetailActions } from "@/components/employees/employee-detail-actions";
import type { EmployeeFormValue } from "@/components/employees/employee-form-modal";
import { UserKind } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Employee" };

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await guardPermission("employees.view");
  const { id } = await params;

  const employee = await prisma.user.findFirst({
    where: { id, kind: UserKind.USER, deletedAt: null },
    include: { roles: { include: { role: { select: { key: true } } } } },
  });

  if (!employee) notFound();

  const [roles, taskCount, projectCount, leadCount] = await Promise.all([
    prisma.role.findMany({
      where: { key: { not: "CLIENT" } },
      select: { key: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.count({ where: { assigneeId: id, deletedAt: null } }),
    prisma.project.count({ where: { managerId: id, deletedAt: null } }),
    prisma.lead.count({ where: { assigneeId: id, deletedAt: null } }),
  ]);

  const roleKeys = employee.roles.map((r) => r.role.key);

  const formValue: EmployeeFormValue = {
    id: employee.id,
    name: employee.name ?? "",
    email: employee.email,
    phone: employee.phone,
    jobTitle: employee.jobTitle,
    status: employee.status,
    roleKeys,
  };

  const infoRows = [
    { icon: Mail, label: "Email", value: employee.email ?? "—" },
    { icon: Phone, label: "Phone", value: employee.phone ?? "—" },
    { icon: Briefcase, label: "Job title", value: employee.jobTitle ?? "—" },
    { icon: CalendarDays, label: "Joined", value: formatDate(employee.createdAt) },
  ];

  const stats = [
    { label: "Assigned tasks", value: taskCount },
    { label: "Managed projects", value: projectCount },
    { label: "Assigned leads", value: leadCount },
  ];

  return (
    <>
      <Link
        href="/employees"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to employees
      </Link>

      <PageHeading
        title={employee.name ?? "Unnamed"}
        description={<UserStatusBadge status={employee.status} />}
        actions={
          <EmployeeDetailActions
            employee={formValue}
            isSelf={employee.id === user.id}
            roleOptions={roles.map((role) => ({ key: role.key, name: role.name }))}
            canEdit={user.permissions.has("employees.update")}
            canDelete={user.permissions.has("employees.delete")}
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar name={employee.name} className="h-10 w-10" />
                <div>
                  <p className="font-medium text-foreground">{employee.name ?? "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{employee.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                {infoRows.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium text-foreground">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Roles</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {roleKeys.length > 0 ? (
                roleKeys.map((role) => <RoleBadge key={role} role={role} />)
              ) : (
                <p className="text-sm text-muted-foreground">No roles assigned.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Activity summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-md border border-border px-3 py-4 text-center">
                  <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
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
                Created <span className="text-foreground">{formatDate(employee.createdAt)}</span>
              </p>
              <p className="text-muted-foreground">
                Last login{" "}
                <span className="text-foreground">
                  {employee.lastLoginAt ? formatDate(employee.lastLoginAt) : "Never"}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
