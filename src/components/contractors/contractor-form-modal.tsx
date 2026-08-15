"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  createContractorAction,
  updateContractorAction,
} from "@/app/(portal)/contractors/actions";
import type { ActionResult } from "@/lib/action-result";

export interface ContractorFormValue {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  specialty: string | null;
  rate: number | null;
  status: string;
  notes: string | null;
  projectIds: string[];
}

export interface ProjectOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export function ContractorFormModal({
  open,
  onClose,
  contractor,
  projectOptions,
}: {
  open: boolean;
  onClose: () => void;
  contractor?: ContractorFormValue | null;
  projectOptions: ProjectOption[];
}) {
  const router = useRouter();
  const isEdit = Boolean(contractor);

  const [name, setName] = useState(contractor?.name ?? "");
  const [email, setEmail] = useState(contractor?.email ?? "");
  const [phone, setPhone] = useState(contractor?.phone ?? "");
  const [company, setCompany] = useState(contractor?.company ?? "");
  const [specialty, setSpecialty] = useState(contractor?.specialty ?? "");
  const [rate, setRate] = useState(contractor?.rate != null ? String(contractor.rate / 100) : "");
  const [status, setStatus] = useState(contractor?.status ?? "ACTIVE");
  const [notes, setNotes] = useState(contractor?.notes ?? "");
  const [projectIds, setProjectIds] = useState<string[]>(contractor?.projectIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleProject(id: string) {
    setProjectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const input = {
      name,
      email,
      phone,
      company,
      specialty,
      rate: rate ? String(Math.round(Number(rate) * 100)) : "",
      status,
      notes,
      projectIds,
    };

    const result: ActionResult = contractor
      ? await updateContractorAction(contractor.id, input)
      : await createContractorAction(input);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit contractor" : "Add contractor"}
      description={
        isEdit
          ? "Update the contractor's details and project assignments."
          : "Add an external specialist to your roster."
      }
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ctr-name">
              Full name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ctr-name"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctr-email">Email</Label>
            <Input
              id="ctr-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ada@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctr-company">Company</Label>
            <Input
              id="ctr-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Studio"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctr-phone">Phone</Label>
            <Input
              id="ctr-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctr-specialty">Specialty</Label>
            <Input
              id="ctr-specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="UI Designer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctr-rate">Hourly rate (USD)</Label>
            <Input
              id="ctr-rate"
              type="number"
              min={0}
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="85.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctr-status">Status</Label>
            <Select
              id="ctr-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ctr-notes">Notes</Label>
          <Textarea
            id="ctr-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Engagement details, terms, references…"
          />
        </div>

        <div className="space-y-2">
          <Label>Assigned projects</Label>
          {projectOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active projects yet. Create a project to assign contractors.
            </p>
          ) : (
            <div className="grid max-h-48 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {projectOptions.map((project) => {
                const checked = projectIds.includes(project.id);
                return (
                  <label
                    key={project.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors",
                      checked
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProject(project.id)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="truncate">{project.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Add contractor"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
