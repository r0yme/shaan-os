"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Eye, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Avatar } from "@/components/ui/avatar";
import { ClientStatusBadge, ClientKindBadge } from "@/components/clients/status-badges";
import { ClientFormModal, type ClientFormValue } from "@/components/clients/client-form-modal";
import { deleteClientAction } from "@/app/(portal)/clients/actions";
import { formatDate } from "@/lib/utils";

export interface SerializedClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  website: string | null;
  address: string | null;
  notes: string | null;
  kind: string;
  status: string;
  createdAt: string;
  accountManagerName: string | null;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export function ClientsManager({
  clients,
  q,
  status,
}: {
  clients: SerializedClient[];
  q: string;
  status: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(q);
  const [statusFilter, setStatusFilter] = useState(status);
  const [modal, setModal] = useState<"none" | "create" | "edit" | "delete">("none");
  const [editing, setEditing] = useState<ClientFormValue | null>(null);
  const [deleting, setDeleting] = useState<ClientFormValue | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, pathname, router]);

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Client",
        cell: (client: SerializedClient) => (
          <div className="flex items-center gap-2">
            <Avatar name={client.name} className="h-7 w-7 text-xs" />
            <div className="min-w-0">
              <Link
                href={`/clients/${client.id}`}
                className="block truncate font-medium text-foreground hover:underline"
              >
                {client.name}
              </Link>
              {client.email && (
                <p className="truncate text-xs text-muted-foreground">{client.email}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "company",
        header: "Company",
        cell: (client: SerializedClient) => (
          <span className="text-foreground">{client.company ?? "—"}</span>
        ),
      },
      {
        key: "kind",
        header: "Type",
        cell: (client: SerializedClient) => <ClientKindBadge kind={client.kind} />,
      },
      {
        key: "manager",
        header: "Manager",
        cell: (client: SerializedClient) => (
          <span className="text-muted-foreground">{client.accountManagerName ?? "Unassigned"}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (client: SerializedClient) => <ClientStatusBadge status={client.status} />,
      },
      {
        key: "created",
        header: "Created",
        cell: (client: SerializedClient) => (
          <span className="text-muted-foreground">{formatDate(client.createdAt)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        className: "w-10",
        cell: (client: SerializedClient) => (
          <DropdownMenu
            label={`Actions for ${client.name}`}
            trigger={<span className="font-semibold">···</span>}
            items={[
              {
                label: "View",
                icon: <Eye className="h-4 w-4" />,
                onSelect: () => router.push(`/clients/${client.id}`),
              },
              {
                label: "Edit",
                icon: <Pencil className="h-4 w-4" />,
                onSelect: () => {
                  setEditing({
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
                  });
                  setModal("edit");
                },
              },
              {
                label: "Delete",
                destructive: true,
                icon: <Trash2 className="h-4 w-4" />,
                onSelect: () => {
                  setDeleting({
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
                  });
                  setModal("delete");
                },
              },
            ]}
          />
        ),
      },
    ],
    [router],
  );

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingLoading(true);
    const result = await deleteClientAction(deleting.id);
    setDeletingLoading(false);
    if (result.ok) {
      setModal("none");
      setDeleting(null);
      router.refresh();
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          className="sm:max-w-xs"
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search clients"
        />
        <div className="sm:w-48">
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>
        <div className="sm:ml-auto">
          <Button
            onClick={() => {
              setEditing(null);
              setModal("create");
            }}
          >
            <UserPlus className="h-4 w-4" />
            Add client
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={clients}
        keyExtractor={(c) => c.id}
        emptyIcon={Users}
        emptyTitle={q || statusFilter ? "No clients match your filters" : "No clients yet"}
        emptyDescription={
          q || statusFilter
            ? "Try adjusting the search or status filter."
            : "Add your first client to get started."
        }
      />

      <ClientFormModal
        key={modal === "edit" ? editing?.id ?? "edit" : "create"}
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal("none")}
        client={modal === "edit" ? editing : null}
      />

      <ConfirmDialog
        open={modal === "delete"}
        onClose={() => setModal("none")}
        title="Delete client"
        description={
          deleting
            ? `"${deleting.name}" will be removed from the workspace. This can be restored by an administrator.`
            : undefined
        }
        loading={deletingLoading}
        onConfirm={confirmDelete}
      />
    </>
  );
}
