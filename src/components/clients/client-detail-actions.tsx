"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClientFormModal, type ClientFormValue } from "@/components/clients/client-form-modal";
import { deleteClientAction } from "@/app/(portal)/clients/actions";

export function ClientDetailActions({ client }: { client: ClientFormValue }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setDeleting(true);
    const result = await deleteClientAction(client.id);
    setDeleting(false);
    if (result.ok) {
      router.push("/clients");
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

      <ClientFormModal
        key="detail-edit"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete client"
        description={`"${client.name}" will be removed from the workspace.`}
        loading={deleting}
        onConfirm={onDelete}
      />
    </>
  );
}
