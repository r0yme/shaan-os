import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, Globe, MapPin, Building2, ArrowLeft, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { formatDate } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Avatar } from "@/components/ui/avatar";
import {
  ClientStatusBadge,
  ClientKindBadge,
  LeadStatusBadge,
} from "@/components/clients/status-badges";
import { ClientDetailActions } from "@/components/clients/client-detail-actions";

export const metadata: Metadata = { title: "Client" };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardPermission("clients.view");
  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, deletedAt: null },
    include: {
      accountManager: { select: { id: true, name: true, email: true } },
      portalUser: { select: { id: true, name: true, email: true } },
      leads: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!client) notFound();

  const infoRows = [
    { icon: Mail, label: "Email", value: client.email ?? "—", href: client.email ? `mailto:${client.email}` : undefined },
    { icon: Phone, label: "Phone", value: client.phone ?? "—", href: client.phone ? `tel:${client.phone}` : undefined },
    { icon: Globe, label: "Website", value: client.website ?? "—", href: client.website ?? undefined },
    { icon: MapPin, label: "Address", value: client.address ?? "—" },
  ];

  return (
    <>
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clients
      </Link>

      <PageHeading
        title={client.name}
        description={
          <span className="flex items-center gap-2">
            <ClientKindBadge kind={client.kind} />
            <ClientStatusBadge status={client.status} />
          </span>
        }
        actions={
          <ClientDetailActions
            client={{
              id: client.id,
              name: client.name,
              email: client.email,
              phone: client.phone,
              company: client.company,
              website: client.website,
              address: client.address,
              notes: client.notes,
              kind: client.kind,
              status: client.status,
            }}
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contact information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {infoRows.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    {href ? (
                      <a
                        href={href}
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-foreground">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {client.notes ? (
                <p className="whitespace-pre-wrap text-sm text-foreground">{client.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No notes on file.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Account manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.accountManager ? (
                <div className="flex items-center gap-3">
                  <Avatar name={client.accountManager.name} />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {client.accountManager.name ?? "Unnamed"}
                    </p>
                    <p className="text-xs text-muted-foreground">{client.accountManager.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unassigned</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Portal access
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.portalUser ? (
                <div className="flex items-center gap-2">
                  <Badge tone="success">Enabled</Badge>
                  <span className="text-xs text-muted-foreground">{client.portalUser.email}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge tone="default">Not provisioned</Badge>
                  <span className="text-xs text-muted-foreground">
                    Portal access arrives with a later phase.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-muted-foreground">
                Created <span className="text-foreground">{formatDate(client.createdAt)}</span>
              </p>
              <p className="text-muted-foreground">
                Updated <span className="text-foreground">{formatDate(client.updatedAt)}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          Leads & opportunities
        </h2>
        <DataTable
          columns={[
            {
              key: "name",
              header: "Lead",
              cell: (lead) => <span className="font-medium text-foreground">{lead.name}</span>,
            },
            {
              key: "value",
              header: "Value",
              cell: (lead) => (
                <span className="text-foreground">
                  {lead.value != null ? `$${(lead.value / 100).toLocaleString()}` : "—"}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              cell: (lead) => <LeadStatusBadge status={lead.status} />,
            },
            {
              key: "created",
              header: "Created",
              cell: (lead) => (
                <span className="text-muted-foreground">{formatDate(lead.createdAt)}</span>
              ),
            },
          ]}
          data={client.leads}
          keyExtractor={(lead) => lead.id}
          emptyIcon={Users}
          emptyTitle="No leads"
          emptyDescription="Leads linked to this client will appear here."
        />
      </div>
    </>
  );
}
