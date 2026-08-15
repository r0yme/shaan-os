import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Overview" };

export default async function ClientDashboardPage() {
  const user = await requireUser();

  const [business, recentActivity] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { id: "default" } }),
    prisma.auditLog.findMany({
      where: { actorId: user.id },
      take: 6,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeading
        title={`Welcome, ${user.name ?? "there"}`}
        description="Your workspace with Shaan OS."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-foreground">{user.email}</p>
            <p className="text-muted-foreground">Member since the portal opened</p>
            <Badge tone="success" className="mt-2">
              Active
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Business
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium text-foreground">{business?.name ?? "Shaan Studio"}</p>
            <p className="text-muted-foreground">
              {business?.currency ?? "USD"} · {business?.timezone ?? "Asia/Dhaka"}
            </p>
          </CardContent>
        </Card>
      </div>

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
