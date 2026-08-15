"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ProjectFormModal,
  type ProjectFormValue,
  type RefOption,
} from "@/components/projects/project-form-modal";
import { deleteProjectAction } from "@/app/(portal)/projects/actions";

export function ProjectDetailActions({
  project,
  clientOptions,
  managerOptions,
}: {
  project: ProjectFormValue;
  clientOptions: RefOption[];
  managerOptions: RefOption[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setDeleting(true);
    const result = await deleteProjectAction(project.id);
    setDeleting(false);
    if (result.ok) {
      router.push("/projects");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <ProjectFormModal
        key="detail-edit"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
        clientOptions={clientOptions}
        managerOptions={managerOptions}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete project"
        description={`"${project.name}" will be removed from the workspace.`}
        loading={deleting}
        onConfirm={onDelete}
      />
    </>
  );
}
