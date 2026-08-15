"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileUp, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatBytes } from "@/lib/files";
import { uploadFileAction } from "@/app/(portal)/files/actions";

export interface FileRefOption {
  id: string;
  name: string;
}

export function FileUploadModal({
  open,
  onClose,
  projectOptions,
  clientOptions,
}: {
  open: boolean;
  onClose: () => void;
  projectOptions: FileRefOption[];
  clientOptions: FileRefOption[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState("");
  const [clientId, setClientId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setFile(null);
    setProjectId("");
    setClientId("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    formData.append("clientId", clientId);

    const result = await uploadFileAction(formData);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    reset();
    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Upload file"
      description="Share a file with the team or a client."
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="file-input">
            File <span className="text-destructive">*</span>
          </Label>
          <input
            id="file-input"
            ref={inputRef}
            type="file"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50"
          >
            <FileUp className="h-6 w-6" />
            {file ? (
              <span className="flex items-center gap-2 font-medium text-foreground">
                {file.name}
                <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                <span
                  role="button"
                  className="text-destructive hover:text-destructive/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </span>
              </span>
            ) : (
              <span>
                Click to choose a file <span className="text-xs">(up to 25 MB)</span>
              </span>
            )}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="file-project">Project</Label>
            <Select
              id="file-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              options={projectOptions.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="No project"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file-client">Client</Label>
            <Select
              id="file-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              options={clientOptions.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="No client"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Upload file
          </Button>
        </div>
      </form>
    </Modal>
  );
}
