"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { CURRENCY_OPTIONS, TIMEZONE_OPTIONS } from "@/lib/settings";
import { updateBusinessProfileAction } from "@/app/(portal)/settings/actions";
import type { ActionResult } from "@/lib/action-result";

export interface BusinessProfileValue {
  name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  country: string | null;
  currency: string;
  timezone: string;
  invoicePrefix: string;
}

export function WorkspaceSettingsForm({ profile }: { profile: BusinessProfileValue }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [country, setCountry] = useState(profile.country ?? "");
  const [currency, setCurrency] = useState(profile.currency);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [invoicePrefix, setInvoicePrefix] = useState(profile.invoicePrefix);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    const result: ActionResult = await updateBusinessProfileAction({
      name,
      email,
      phone,
      website,
      address,
      country,
      currency,
      timezone,
      invoicePrefix,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
        <p role="status" className="text-sm font-medium text-success">
          Workspace settings saved.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bp-name">Business name</Label>
          <Input
            id="bp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Shaan Studio"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bp-email">Email</Label>
          <Input
            id="bp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hello@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bp-phone">Phone</Label>
          <Input
            id="bp-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 000 0000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bp-website">Website</Label>
          <Input
            id="bp-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bp-country">Country</Label>
          <Input
            id="bp-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="United States"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bp-currency">Currency</Label>
          <Select
            id="bp-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={CURRENCY_OPTIONS}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bp-timezone">Timezone</Label>
          <Select
            id="bp-timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            options={TIMEZONE_OPTIONS}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bp-invoice-prefix">Invoice prefix</Label>
          <Input
            id="bp-invoice-prefix"
            value={invoicePrefix}
            onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase().trim())}
            placeholder="INV"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bp-address">Address</Label>
        <Textarea
          id="bp-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street, city, region, postal code"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          <Save className="h-4 w-4" />
          Save changes
        </Button>
      </div>
    </form>
  );
}
