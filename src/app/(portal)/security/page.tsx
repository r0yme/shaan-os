import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { formatRelativeTime } from "@/lib/utils";
import { getLoginSecurity } from "@/lib/login-security";
import { AuditAction } from "@/generated/prisma/enums";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SecurityManager, type SecurityUserRow } from "@/components/security/security-manager";
import { LoginSecurityForm } from "@/components/security/login-security-form";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  const me = await guardPermission("auth.manage");

  const [users, recentActivity, loginSecurity] = await Promise.all([
    prisma.user.findMany({
      where: { kind: "USER", deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        lastLoginAt: true,
        roles: { include: { role: { select: { key: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditLog.findMany({
      where: {
        actorId: me.id,
        action: { in: [AuditAction.LOGIN, AuditAction.LOGIN_FAILED] },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { id: true, action: true, createdAt: true, summary: true },
    }),
    getLoginSecurity(),
  ]);

  const rows: SecurityUserRow[] = users.map((user) => ({
    id: user.id,
    name: user.name ?? "Unnamed",
    email: user.email ?? "",
    status: user.status,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    roles: user.roles.map((r) => r.role.key),
  }));

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeading
          title="Security"
          description="Manage user access, reset passwords and control active sessions."
        />
      </div>

      <SecurityManager rows={rows} />

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Login security
            </CardTitle>
            <CardDescription>
              Control account lockout and rate limiting for sign-in. Settings apply to everyone
              immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginSecurityForm initial={loginSecurity} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your recent sign-in activity
            </CardTitle>
            <CardDescription>The last 10 sign-in attempts on your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {recentActivity.length === 0 && (
                <li className="py-3 text-sm text-muted-foreground">No sign-in activity yet.</li>
              )}
              {recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      {entry.action === AuditAction.LOGIN ? "Signed in" : "Failed sign-in"}
                    </p>
                    {entry.summary && (
                      <p className="truncate text-xs text-muted-foreground">{entry.summary}</p>
                    )}
                  </div>
                  <Badge tone={entry.action === AuditAction.LOGIN ? "success" : "destructive"}>
                    {entry.action === AuditAction.LOGIN ? "Success" : "Failed"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
