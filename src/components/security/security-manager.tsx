"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RoleBadge, UserStatusBadge } from "@/components/employees/status-badges";
import { formatRelativeTime } from "@/lib/utils";
import {
  adminResetPasswordAction,
  forceSignOutAllAction,
} from "@/app/(portal)/security/actions";

export interface SecurityUserRow {
  id: string;
  name: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
  roles: string[];
}

export function SecurityManager({ rows }: { rows: SecurityUserRow[] }) {
  const router = useRouter();
  const [resetting, setResetting] = useState<SecurityUserRow | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  async function confirmReset() {
    if (!resetting) return;
    setBusy(true);
    setError(null);
    const result = await adminResetPasswordAction({
      userId: resetting.id,
      password,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setResetting(null);
    setPassword("");
    router.refresh();
  }

  async function confirmSignOutAll() {
    setBusy(true);
    const result = await forceSignOutAllAction();
    setBusy(false);
    setSigningOutAll(false);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} user{rows.length === 1 ? "" : "s"}
        </p>
        <Button variant="destructive" onClick={() => setSigningOutAll(true)}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign everyone out
        </Button>
      </div>

      <DataTable
        columns={[
          {
            key: "name",
            header: "User",
            cell: (row) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{row.name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.email}</p>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            cell: (row) => <UserStatusBadge status={row.status} />,
          },
          {
            key: "roles",
            header: "Roles",
            cell: (row) => (
              <div className="flex flex-wrap gap-1">
                {row.roles.map((role) => (
                  <RoleBadge key={role} role={role} />
                ))}
              </div>
            ),
          },
          {
            key: "lastLogin",
            header: "Last login",
            cell: (row) => (
              <span className="text-muted-foreground">
                {row.lastLoginAt ? formatRelativeTime(row.lastLoginAt) : "Never"}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            cell: (row) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResetting(row);
                  setPassword("");
                  setError(null);
                }}
              >
                <KeyRound className="mr-2 h-3.5 w-3.5" />
                Reset password
              </Button>
            ),
          },
        ]}
        data={rows}
        keyExtractor={(row) => row.id}
        emptyTitle="No users found"
        emptyDescription="Invite employees from the Team module to see them here."
      />

      <Modal
        open={resetting !== null}
        onClose={() => setResetting(null)}
        title="Reset password"
        description={
          resetting ? `Set a new password for ${resetting.name}.` : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetting(null)} disabled={busy}>
              Cancel
            </Button>
            <Button loading={busy} onClick={confirmReset}>
              Reset password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={signingOutAll}
        onClose={() => setSigningOutAll(false)}
        title="Sign everyone out?"
        description="This invalidates every active session in the workspace, including yours. Everyone will need to sign in again."
        confirmLabel="Sign everyone out"
        loading={busy}
        onConfirm={confirmSignOutAll}
      />
    </>
  );
}
