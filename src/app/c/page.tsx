import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Mail, Phone, Globe, MapPin } from "lucide-react";

export const metadata: Metadata = { title: "Overview" };

export default async function ClientDashboardPage() {
  const user = await requireUser();

  const [business, clientProfile, recentActivity] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { id: "default" } }),
    prisma.client.findFirst({
      where: { portalUserId: user.id, deletedAt: null },
      include: { accountManager: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.findMany({
      where: { actorId: user.id },
      take: 6,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const infoRows = [
    { icon: Mail, label: "Email", value: clientProfile?.email ?? "—" },
    { icon: Phone, label: "Phone", value: clientProfile?.phone ?? "—" },
    { icon: Globe, label: "Website", value: clientProfile?.website ?? "—" },
    { icon: MapPin, label: "Address", value: clientProfile?.address ?? "—" },
  ];

  return (
    <>
      <PageHeading
        title={`Welcome, ${user.name ?? "there"}`}
        description="Your workspace with Shaan OS."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} image={user.image} />
              <div>
                <p className="font-medium text-foreground">{clientProfile?.name ?? user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="success">Active</Badge>
              {clientProfile?.kind === "BUSINESS" && <Badge>Business account</Badge>}
            </div>
            {clientProfile?.accountManager && (
              <p className="text-sm text-muted-foreground">
                Account manager:{" "}
                <span className="font-medium text-foreground">
                  {clientProfile.accountManager.name ?? "Unnamed"}
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {infoRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Business</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <p className="font-medium text-foreground">{business?.name ?? "Shaan Studio"}</p>
          <span className="text-muted-foreground">
            {business?.currency ?? "USD"} · {business?.timezone ?? "Asia/Dhaka"}
          </span>
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
          Your recent activity
        </h2>
        <DataTable
          columns={[
            {
              key: "action",
              header: "Action",
              cell: (log) => <Badge tone="default">{log.action}</Badge>,
            },
            {
              key: "summary",
              header: "Details",
              cell: (log) => (
                <span className="text-muted-foreground">{log.summary ?? "—"}</span>
              ),
            },
            {
              key: "time",
              header: "When",
              cell: (log) => (
                <span className="text-muted-foreground">{formatDate(log.createdAt)}</span>
              ),
            },
          ]}
          data={recentActivity}
          keyExtractor={(log) => log.id}
          emptyTitle="No activity yet"
          emptyDescription="Your actions in the portal will appear here."
        />
      </div>
    </>
  );
}
