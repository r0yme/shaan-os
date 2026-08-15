-- CreateTable
CREATE TABLE "SharedFile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SharedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedFile_storageKey_key" ON "SharedFile"("storageKey");

-- CreateIndex
CREATE INDEX "SharedFile_projectId_idx" ON "SharedFile"("projectId");

-- CreateIndex
CREATE INDEX "SharedFile_clientId_idx" ON "SharedFile"("clientId");

-- CreateIndex
CREATE INDEX "SharedFile_uploadedById_idx" ON "SharedFile"("uploadedById");

-- CreateIndex
CREATE INDEX "SharedFile_deletedAt_idx" ON "SharedFile"("deletedAt");

-- CreateIndex
CREATE INDEX "SharedFile_createdAt_idx" ON "SharedFile"("createdAt");

-- AddForeignKey
ALTER TABLE "SharedFile" ADD CONSTRAINT "SharedFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedFile" ADD CONSTRAINT "SharedFile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedFile" ADD CONSTRAINT "SharedFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
