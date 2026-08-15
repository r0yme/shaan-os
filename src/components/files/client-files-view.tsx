import { Download, File, FolderOpen } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { formatBytes } from "@/lib/files";

export interface ClientSerializedFile {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  projectName: string | null;
  uploadedByName: string | null;
}

export function ClientFilesView({ files }: { files: ClientSerializedFile[] }) {
  return (
    <DataTable<ClientSerializedFile>
      columns={[
        {
          key: "name",
          header: "File",
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
            <a
              href={`/api/files/${file.id}/download`}
              aria-label={`Download ${file.name}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Download className="h-4 w-4" />
            </a>
          ),
        },
      ]}
      data={files}
      keyExtractor={(file) => file.id}
      emptyIcon={FolderOpen}
      emptyTitle="No files shared with you"
      emptyDescription="Files shared with your account will appear here."
    />
  );
}
