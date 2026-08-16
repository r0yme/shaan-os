"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Save, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { LoginSecuritySettings } from "@/lib/validation";
import { updateLoginSecurityAction } from "@/app/(portal)/security/actions";
import type { ActionResult } from "@/lib/action-result";

function NumberField({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        min={1}
        className="mt-1.5 max-w-[160px]"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export function LoginSecurityForm({ initial }: { initial: LoginSecuritySettings }) {
  const router = useRouter();
  const [settings, setSettings] = useState<LoginSecuritySettings>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  function patch(patch: Partial<LoginSecuritySettings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    const result: ActionResult = await updateLoginSecurityAction(settings);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const securityOff = !settings.lockoutEnabled && !settings.rateLimitEnabled;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {saved && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-600"
        >
          <span>Login security settings saved.</span>
        </div>
      )}
      {securityOff && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-600"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Both protections are off. Anyone can attempt to sign in without any lockout or rate
            limiting. Turn at least one on after you are back in.
          </span>
        </div>
      )}

      <div className="space-y-4">
        <ToggleField
          label="Account lockout"
          description="Lock an account for a set time after too many failed attempts."
          checked={settings.lockoutEnabled}
          onChange={(checked) => patch({ lockoutEnabled: checked })}
        />
        <ToggleField
          label="Rate limiting"
          description="Limit how often a single IP can attempt to sign in and how many failures per account it can cause."
          checked={settings.rateLimitEnabled}
          onChange={(checked) => patch({ rateLimitEnabled: checked })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Failed attempts before lock"
          value={settings.maxFailedLogins}
          onChange={(value) => patch({ maxFailedLogins: value })}
          disabled={!settings.lockoutEnabled}
          hint="Between 3 and 20."
        />
        <NumberField
          label="Lock duration (minutes)"
          value={settings.lockDurationMin}
          onChange={(value) => patch({ lockDurationMin: value })}
          disabled={!settings.lockoutEnabled}
          hint="Between 1 and 1440."
        />
        <NumberField
          label="Login attempts per IP"
          value={settings.ipAttemptLimit}
          onChange={(value) => patch({ ipAttemptLimit: value })}
          disabled={!settings.rateLimitEnabled}
          hint="Per 10-minute window."
        />
        <NumberField
          label="Failed attempts per account & IP"
          value={settings.failLimitPerEmailIp}
          onChange={(value) => patch({ failLimitPerEmailIp: value })}
          disabled={!settings.rateLimitEnabled}
          hint="Between 1 and 10."
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" loading={loading}>
          <Save className="h-4 w-4" />
          Save security settings
        </Button>
      </div>
    </form>
  );
}
