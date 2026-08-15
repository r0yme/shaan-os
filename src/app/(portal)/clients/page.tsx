import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { PageHeading } from "@/components/page-heading";
import { ClientsManager } from "@/components/clients/clients-manager";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await guardPermission("clients.view");
  const { q, status } = await searchParams;

  const clients = await prisma.client.findMany({
    where: {
      deletedAt: null,
      ...(q?.trim() ? { name: { contains: q.trim(), mode: "insensitive" } } : {}),
      ...(status ? { status: status as "ACTIVE" | "INACTIVE" } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      website: true,
      address: true,
      notes: true,
      kind: true,
      status: true,
      createdAt: true,
      accountManager: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    website: c.website,
    address: c.address,
    notes: c.notes,
    kind: c.kind,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    accountManagerName: c.accountManager?.name ?? null,
  }));

  return (
    <>
      <PageHeading
        title="Clients"
        description="Manage your client accounts and relationships."
      />
      <ClientsManager clients={serialized} q={q ?? ""} status={status ?? ""} />
    </>
  );
}
