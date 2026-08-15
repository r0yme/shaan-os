"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download, File, FolderOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatBytes } from "@/lib/files";
import {
  FileUploadModal,
  type FileRefOption,
} from "@/components/files/file-upload-modal";
import { deleteFileAction } from "@/app/(portal)/files/actions";

export interface SerializedSharedFile {
  id: string;
  name: string;
  mimeType: string | null;
  size: number;
  createdAt: string;
  projectName: string | null;
  clientName: string | null;
  uploadedByName: string | null;
}

export function FilesManager({
  files,
  projectFilter,
  clientFilter,
  totalBytes,
  weekBytes,
  projectOptions,
  clientOptions,
  canUpload,
  canDelete,
}: {
  files: SerializedSharedFile[];
  projectFilter: string;
  clientFilter: string;
  totalBytes: number;
  weekBytes: number;
  projectOptions: FileRefOption[];
  clientOptions: FileRefOption[];
  canUpload: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [project, setProject] = useState(projectFilter);
  const [client, setClient] = useState(clientFilter);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState<SerializedSharedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (project) params.set("project", project);
      if (client) params.set("client", client);
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(timer);
  }, [project, client, pathname, router]);

  const summaryCards = [
    { label: "Total files", value: String(files.length), tone: "text-foreground" },
    { label: "Total size", value: formatBytes(totalBytes), tone: "text-muted-foreground" },
    { label: "Added this week", value: formatBytes(weekBytes), tone: "text-warning" },
  ];

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await deleteFileAction(deleting.id);
    setBusy(false);
    if (result.ok) {
      setDeleting(null);
      router.refresh();
    } else {
      setDeleting(null);
      setError(result.error);
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className="shadow-none">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className={`mt-1 text-xl font-semibold ${card.tone}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            {files.length} file{files.length === 1 ? "" : "s"}
          </p>
          <div className="sm:w-56">
            <Select
              aria-label="Filter by project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              options={projectOptions.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="All projects"
            />
          </div>
          <div className="sm:w-56">
            <Select
              aria-label="Filter by client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              options={clientOptions.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="All clients"
            />
          </div>
        </div>
        {canUpload && (
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" />
            Upload file
          </Button>
        )}
      </div>

      <DataTable<SerializedSharedFile>
        columns={[
          {
            key: "name",
            header: "Name",
            cell: (file) => (
              <a
                href={`/api/files/${file.id}/download`}
                className="flex items-center gap-2 font-medium text-foreground hover:text-primary"
              >
                <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="max-w-64 truncate">{file.name}</span>
              </a>
            ),
          },
          {
            key: "project",
            header: "Project",
            cell: (file) => (
              <span className="text-muted-foreground">{file.projectName ?? "—"}</span>
            ),
          },
          {
            key: "client",
            header: "Client",
            cell: (file) => (
              <span className="text-muted-foreground">{file.clientName ?? "—"}</span>
            ),
          },
          {
            key: "uploadedBy",
            header: "Uploaded by",
            cell: (file) => (
              <span className="text-muted-foreground">{file.uploadedByName ?? "—"}</span>
            ),
          },
          {
            key: "size",
            header: "Size",
            className: "text-right",
            cell: (file) => (
              <span className="font-medium text-foreground">{formatBytes(file.size)}</span>
            ),
          },
          {
            key: "uploadedAt",
            header: "Uploaded",
            className: "text-right",
            cell: (file) => (
              <span className="text-muted-foreground">
                {new Date(file.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "w-10",
            cell: (file) => (
              <div className="flex items-center justify-end gap-1">
                <a
                  href={`/api/files/${file.id}/download`}
                  aria-label={`Download ${file.name}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Download className="h-4 w-4" />
                </a>
                {canDelete && (
                  <DropdownMenu
                    label={`Actions for ${file.name}`}
                    trigger={<span className="font-semibold">···</span>}
                    items={[
                      {
                        label: "Delete",
                        destructive: true,
                        icon: <Trash2 className="h-4 w-4" />,
                        onSelect: () => setDeleting(file),
                      },
                    ]}
                  />
                )}
              </div>
            ),
          },
        ]}
        data={files}
        keyExtractor={(file) => file.id}
        emptyIcon={FolderOpen}
        emptyTitle="No files found"
        emptyDescription="Upload the first file to share it with your team or clients."
      />

      <FileUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        projectOptions={projectOptions}
        clientOptions={clientOptions}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete file"
        description={
          deleting ? `"${deleting.name}" will be permanently removed.` : undefined
        }
        loading={busy}
        onConfirm={confirmDelete}
      />
    </>
  );
}
