import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { guardPermission } from "@/lib/page-guard";
import { GlobalSearch, type SearchGroup } from "@/components/search/global-search";

export const metadata: Metadata = { title: "Search" };

const like = (q: string) => ({ contains: q, mode: "insensitive" as const });

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await guardPermission("search.global");
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  if (!query) {
    return <GlobalSearch q="" groups={[]} />;
  }

  const [
    clients,
    leads,
    projects,
    tasks,
    invoices,
    contractors,
    employees,
    files,
  ] = await Promise.all([
    prisma.client.findMany({
      where: { deletedAt: null, OR: [{ name: like(query) }, { email: like(query) }] },
      take: 8,
      select: { id: true, name: true, company: true },
    }),
    prisma.lead.findMany({
      where: { deletedAt: null, OR: [{ name: like(query) }, { company: like(query) }, { email: like(query) }] },
      take: 8,
      select: { id: true, name: true, company: true, email: true },
    }),
    prisma.project.findMany({
      where: { deletedAt: null, name: like(query) },
      take: 8,
      select: { id: true, name: true, status: true },
    }),
    prisma.task.findMany({
      where: { deletedAt: null, title: like(query) },
      take: 8,
      select: { id: true, title: true, status: true },
    }),
    prisma.invoice.findMany({
      where: { deletedAt: null, number: like(query) },
      take: 8,
      select: { id: true, number: true, client: { select: { name: true } } },
    }),
    prisma.contractor.findMany({
      where: { deletedAt: null, OR: [{ name: like(query) }, { company: like(query) }, { specialty: like(query) }] },
      take: 8,
      select: { id: true, name: true, specialty: true, company: true },
    }),
    prisma.user.findMany({
      where: { kind: "USER", deletedAt: null, OR: [{ name: like(query) }, { email: like(query) }] },
      take: 8,
      select: { id: true, name: true, email: true },
    }),
    prisma.sharedFile.findMany({
      where: { deletedAt: null, name: like(query) },
      take: 8,
      select: { id: true, name: true },
    }),
  ]);

  const groups: SearchGroup[] = [
    {
      key: "clients",
      label: "Clients",
      icon: "clients",
      results: clients.map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: row.company ?? null,
        href: `/clients/${row.id}`,
      })),
    },
    {
      key: "leads",
      label: "Leads",
      icon: "leads",
      results: leads.map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: row.company ?? row.email ?? null,
        href: `/leads/${row.id}`,
      })),
    },
    {
      key: "projects",
      label: "Projects",
      icon: "projects",
      results: projects.map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: row.status,
        href: `/projects/${row.id}`,
      })),
    },
    {
      key: "tasks",
      label: "Tasks",
      icon: "tasks",
      results: tasks.map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: row.status,
        href: "/tasks",
      })),
    },
    {
      key: "invoices",
      label: "Invoices",
      icon: "invoices",
      results: invoices.map((row) => ({
        id: row.id,
        title: row.number,
        subtitle: row.client?.name ?? null,
        href: `/billing/${row.id}`,
      })),
    },
    {
      key: "contractors",
      label: "Contractors",
      icon: "contractors",
      results: contractors.map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: row.specialty ?? row.company ?? null,
        href: "/contractors",
      })),
    },
    {
      key: "employees",
      label: "Employees",
      icon: "employees",
      results: employees.map((row) => ({
        id: row.id,
        title: row.name ?? row.email ?? "Unnamed",
        subtitle: row.email ?? null,
        href: `/employees/${row.id}`,
      })),
    },
    {
      key: "files",
      label: "Files",
      icon: "files",
      results: files.map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: "Shared file",
        href: "/files",
      })),
    },
  ].filter((group) => group.results.length > 0);

  return <GlobalSearch q={query} groups={groups} />;
}
