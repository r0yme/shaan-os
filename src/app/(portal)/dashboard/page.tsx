import type { Metadata } from "next";
import { Users, UserRound, Activity } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  const [teamCount, clientCount, recentActivity] = await Promise.all([
    prisma.user.count({ where: { kind: "USER", deletedAt: null } }),
    prisma.user.count({ where: { kind: "CLIENT", deletedAt: null } }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);

  const stats = [
    { label: "Team members", value: teamCount, icon: UserRound },
    { label: "Clients", value: clientCount, icon: Users },
    { label: "Recent events", value: recentActivity.length, icon: Activity },
  ];

  return (
    <>
      <PageHeading
        title={`Welcome, ${user.name ?? "there"}`}
        description="Here is what is happening across your workspace."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                {label}
                <Icon className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
          Recent activity
        </h2>
        <DataTable
          columns={[
            {
              key: "actor",
              header: "User",
              cell: (log) => (
                <div className="flex items-center gap-2">
                  <Avatar name={log.actor?.name} image={null} className="h-7 w-7 text-xs" />
                  <span className="font-medium text-foreground">
                    {log.actor?.name ?? log.actor?.email ?? "System"}
                  </span>
                </div>
              ),
            },
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
          emptyDescription="Actions across the workspace will appear here."
        />
      </div>
    </>
  );
}
