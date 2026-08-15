"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Avatar } from "@/components/ui/avatar";
import { RoleBadge, UserStatusBadge } from "@/components/employees/status-badges";
import {
  EmployeeFormModal,
  type EmployeeFormValue,
  type RoleOption,
} from "@/components/employees/employee-form-modal";
import { deleteEmployeeAction } from "@/app/(portal)/employees/actions";

export interface SerializedEmployee {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  status: string;
  roleKeys: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INVITED", label: "Invited" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "INACTIVE", label: "Inactive" },
];

function toFormValue(employee: SerializedEmployee): EmployeeFormValue {
  return {
    id: employee.id,
    name: employee.name ?? "",
    email: employee.email,
    phone: employee.phone,
    jobTitle: employee.jobTitle,
    status: employee.status,
    roleKeys: employee.roleKeys,
  };
}

export function EmployeesManager({
  employees,
  statusFilter,
  currentUserId,
  roleOptions,
  canCreate,
  canEdit,
  canDelete,
}: {
  employees: SerializedEmployee[];
  statusFilter: string;
  currentUserId: string;
  roleOptions: RoleOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [filter, setFilter] = useState(statusFilter);
  const [modal, setModal] = useState<"none" | "create" | "edit">("none");
  const [editing, setEditing] = useState<EmployeeFormValue | null>(null);
  const [deleting, setDeleting] = useState<SerializedEmployee | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(timer);
  }, [filter, pathname, router]);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteEmployeeAction(deleting.id);
    setBusy(false);
    if (result.ok) {
      setDeleting(null);
      router.refresh();
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {employees.length} employee{employees.length === 1 ? "" : "s"}
          </p>
          <div className="sm:w-44">
            <Select
              aria-label="Filter by status"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditing(null);
              setModal("create");
            }}
          >
            <Plus className="h-4 w-4" />
            Add employee
          </Button>
        )}
      </div>

      <DataTable<SerializedEmployee>
        columns={[
          {
            key: "name",
            header: "Employee",
            cell: (employee) => (
              <div className="flex items-center gap-3">
                <Avatar name={employee.name} className="h-8 w-8 text-xs" />
                <div>
                  <p className="font-medium text-foreground">
                    {employee.name ?? "Unnamed"}
                    {employee.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{employee.email}</p>
                </div>
              </div>
            ),
          },
          {
            key: "title",
            header: "Job title",
            cell: (employee) => (
              <span className="text-muted-foreground">{employee.jobTitle ?? "—"}</span>
            ),
          },
          {
            key: "roles",
            header: "Roles",
            cell: (employee) => (
              <div className="flex flex-wrap gap-1">
                {employee.roleKeys.map((role) => (
                  <RoleBadge key={role} role={role} />
                ))}
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (employee) => <UserStatusBadge status={employee.status} />,
          },
          {
            key: "lastLogin",
            header: "Last login",
            cell: (employee) => (
              <span className="text-muted-foreground">
                {employee.lastLoginAt
                  ? new Date(employee.lastLoginAt).toLocaleDateString("en-US", {
                      dateStyle: "medium",
                    })
                  : "Never"}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "w-10",
            cell: (employee) => (
              <DropdownMenu
                label={`Actions for ${employee.name ?? "employee"}`}
                trigger={<span className="font-semibold">···</span>}
                items={[
                  {
                    label: "View profile",
                    icon: <Users className="h-4 w-4" />,
                    onSelect: () => router.push(`/employees/${employee.id}`),
                  },
                  ...(canEdit
                    ? [
                        {
                          label: "Edit",
                          icon: <Pencil className="h-4 w-4" />,
                          onSelect: () => {
                            setEditing(toFormValue(employee));
                            setModal("edit");
                          },
                        },
                      ]
                    : []),
                  ...(canDelete && employee.id !== currentUserId
                    ? [
                        {
                          label: "Delete",
                          destructive: true,
                          icon: <Trash2 className="h-4 w-4" />,
                          onSelect: () => setDeleting(employee),
                        },
                      ]
                    : []),
                ]}
              />
            ),
          },
        ]}
        data={employees}
        keyExtractor={(employee) => employee.id}
        emptyIcon={Users}
        emptyTitle="No employees found"
        emptyDescription="Add your first team member to get started."
      />

      <EmployeeFormModal
        key={modal === "edit" ? editing?.id ?? "edit" : "create"}
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal("none")}
        employee={modal === "edit" ? editing : null}
        roleOptions={roleOptions}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete employee"
        description={
          deleting
            ? `${deleting.name ?? "This employee"} will be deactivated and removed from the team.`
            : undefined
        }
        loading={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
