import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  WorkspaceSettingsForm,
  type BusinessProfileValue,
} from "@/components/settings/workspace-settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await guardPermission("settings.manage");

  const [profile, roles] = await Promise.all([
    prisma.businessProfile.findUnique({
      where: { id: "default" },
      select: {
        name: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        country: true,
        currency: true,
        timezone: true,
        invoicePrefix: true,
      },
    }),
    prisma.role.findMany({
      where: { isSystem: true },
      orderBy: { createdAt: "asc" },
      select: {
        key: true,
        name: true,
        description: true,
        _count: { select: { permissions: true, users: true } },
      },
    }),
  ]);

  const profileValue: BusinessProfileValue = {
    name: profile?.name ?? null,
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    website: profile?.website ?? null,
    address: profile?.address ?? null,
    country: profile?.country ?? null,
    currency: profile?.currency ?? "USD",
    timezone: profile?.timezone ?? "UTC",
    invoicePrefix: profile?.invoicePrefix ?? "INV",
  };

  return (
    <>
      <PageHeading
        title="Settings"
        description="Workspace profile and role overview. Changes affect the whole workspace."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Workspace profile</CardTitle>
            <CardDescription>
              Identity, currency, timezone and invoice prefix used across invoices and the portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkspaceSettingsForm profile={profileValue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>System roles and what they can do.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {roles.map((role) => (
                <li key={role.key} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{role.name}</span>
                    <Badge tone="outline">{role.key}</Badge>
                  </div>
                  {role.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{role.description}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {role._count.permissions} permissions · {role._count.users} member
                    {role._count.users === 1 ? "" : "s"}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Signed in as {user.name ?? user.email} — settings changes are recorded in the audit log.
      </p>
    </>
  );
}
