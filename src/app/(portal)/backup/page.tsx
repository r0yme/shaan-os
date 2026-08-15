import type { Metadata } from "next";
import { guardPermission } from "@/lib/page-guard";
import { listBackups } from "@/lib/backup";
import { PageHeading } from "@/components/page-heading";
import { BackupManager } from "@/components/backup/backup-manager";

export const metadata: Metadata = { title: "Backup" };

export default async function BackupPage() {
  await guardPermission("backup.manage");
  const backups = await listBackups();

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeading
          title="Backup"
          description="Create and download point-in-time database dumps. Restore arrives in a later version."
        />
      </div>

      <BackupManager backups={backups} />
    </>
  );
}
