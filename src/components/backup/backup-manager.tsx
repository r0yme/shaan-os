"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Database, HardDrive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBytes } from "@/lib/files";
import { formatDate } from "@/lib/utils";
import { createBackupAction, deleteBackupAction } from "@/app/(portal)/backup/actions";

export interface SerializedBackup {
  name: string;
  sizeBytes: number;
  createdAt: string;
}

export function BackupManager({ backups }: { backups: SerializedBackup[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<SerializedBackup | null>(null);
  const [busy, setBusy] = useState(false);

  async function createBackup() {
    setCreating(true);
    setCreateError(null);
    const result = await createBackupAction();
    setCreating(false);
    if (!result.ok) {
      setCreateError(result.error);
      return;
    }
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteBackupAction(deleting.name);
    setBusy(false);
    if (result.ok) {
      setDeleting(null);
      router.refresh();
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {backups.length} backup{backups.length === 1 ? "" : "s"} on disk
        </p>
        <Button loading={creating} onClick={createBackup}>
          <HardDrive className="mr-2 h-4 w-4" />
          Create backup
        </Button>
      </div>

      {createError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{createError}</p>
      )}

      {backups.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No backups yet"
          description="Create your first backup to capture a point-in-time snapshot of the database."
        />
      ) : (
        <DataTable
          columns={[
            {
              key: "name",
              header: "File",
              cell: (row) => (
                <span className="font-medium text-foreground">{row.name}</span>
              ),
            },
            {
              key: "size",
              header: "Size",
              cell: (row) => (
                <span className="text-muted-foreground">{formatBytes(row.sizeBytes)}</span>
              ),
            },
            {
              key: "created",
              header: "Created",
              cell: (row) => (
                <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              cell: (row) => (
                <div className="flex items-center justify-end gap-2">
                  <a
                    href={`/api/backups/${encodeURIComponent(row.name)}/download`}
                    className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(row)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ),
            },
          ]}
          data={backups}
          keyExtractor={(row) => row.name}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this backup?"
        description={
          deleting
            ? `This permanently removes ${deleting.name}. This cannot be undone.`
            : undefined
        }
        loading={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
