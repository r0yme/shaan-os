"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createEmployeeAction, updateEmployeeAction } from "@/app/(portal)/employees/actions";
import type { ActionResult } from "@/lib/action-result";

export interface EmployeeFormValue {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  status: string;
  roleKeys: string[];
}

export interface RoleOption {
  key: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INVITED", label: "Invited" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "INACTIVE", label: "Inactive" },
];

export function EmployeeFormModal({
  open,
  onClose,
  employee,
  roleOptions,
}: {
  open: boolean;
  onClose: () => void;
  employee?: EmployeeFormValue | null;
  roleOptions: RoleOption[];
}) {
  const router = useRouter();
  const isEdit = Boolean(employee);

  const [name, setName] = useState(employee?.name ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [jobTitle, setJobTitle] = useState(employee?.jobTitle ?? "");
  const [status, setStatus] = useState(employee?.status ?? "INVITED");
  const [password, setPassword] = useState("");
  const [roleKeys, setRoleKeys] = useState<string[]>(employee?.roleKeys ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleRole(key: string) {
    setRoleKeys((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const base = { name, phone, jobTitle, status, roleKeys };
    const result: ActionResult = employee
      ? await updateEmployeeAction(employee.id, base)
      : await createEmployeeAction({ ...base, email, password });
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
      title={isEdit ? "Edit employee" : "Add employee"}
      description={
        isEdit ? "Update the employee's profile and roles." : "Create a team member account."
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
            <Label htmlFor="emp-name">
              Full name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="emp-name"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="emp-email"
              type="email"
              required
              disabled={isEdit}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-title">Job title</Label>
            <Input
              id="emp-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Product Designer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-phone">Phone</Label>
            <Input
              id="emp-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emp-status">Status</Label>
            <Select
              id="emp-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="emp-password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="emp-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ characters"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Roles</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {roleOptions.map((role) => {
              const checked = roleKeys.includes(role.key);
              return (
                <label
                  key={role.key}
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
                    onChange={() => toggleRole(role.key)}
                    className="h-4 w-4 accent-primary"
                  />
                  {role.name}
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Create employee"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
