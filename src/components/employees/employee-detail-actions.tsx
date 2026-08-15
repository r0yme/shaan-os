"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  EmployeeFormModal,
  type EmployeeFormValue,
  type RoleOption,
} from "@/components/employees/employee-form-modal";
import { deleteEmployeeAction } from "@/app/(portal)/employees/actions";

export function EmployeeDetailActions({
  employee,
  isSelf,
  roleOptions,
  canEdit,
  canDelete,
}: {
  employee: EmployeeFormValue;
  isSelf: boolean;
  roleOptions: RoleOption[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setDeleting(true);
    const result = await deleteEmployeeAction(employee.id);
    setDeleting(false);
    if (result.ok) {
      router.push("/employees");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {canEdit && (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
        {canDelete && !isSelf && (
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <EmployeeFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        employee={employee}
        roleOptions={roleOptions}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete employee"
        description={`${employee.name} will be deactivated and removed from the team.`}
        loading={deleting}
        onConfirm={onDelete}
      />
    </>
  );
}
