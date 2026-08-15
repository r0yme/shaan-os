import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import {
  EmployeesManager,
  type SerializedEmployee,
} from "@/components/employees/employees-manager";
import { UserKind, UserStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Employees" };

const STATUSES = new Set<string>(["ACTIVE", "INVITED", "SUSPENDED", "INACTIVE"]);

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await guardPermission("employees.view");
  const { status } = await searchParams;

  const [employees, roles] = await Promise.all([
    prisma.user.findMany({
      where: {
        kind: UserKind.USER,
        deletedAt: null,
        ...(status && STATUSES.has(status) ? { status: status as UserStatus } : {}),
      },
      include: { roles: { include: { role: { select: { key: true } } } } },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.role.findMany({
      where: { key: { not: "CLIENT" } },
      select: { key: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized: SerializedEmployee[] = employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    jobTitle: employee.jobTitle,
    status: employee.status,
    roleKeys: employee.roles.map((r) => r.role.key),
    lastLoginAt: employee.lastLoginAt ? employee.lastLoginAt.toISOString() : null,
    createdAt: employee.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeading
        title="Employees"
        description="Manage your team and their access."
      />
      <EmployeesManager
        employees={serialized}
        statusFilter={status && STATUSES.has(status) ? status : ""}
        currentUserId={user.id}
        roleOptions={roles.map((role) => ({ key: role.key, name: role.name }))}
        canCreate={user.permissions.has("employees.create")}
        canEdit={user.permissions.has("employees.update")}
        canDelete={user.permissions.has("employees.delete")}
      />
    </>
  );
}
