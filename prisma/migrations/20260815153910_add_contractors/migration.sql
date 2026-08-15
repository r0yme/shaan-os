-- CreateEnum
CREATE TYPE "ContractorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "specialty" TEXT,
    "rate" INTEGER,
    "status" "ContractorStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorProject" (
    "contractorId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorProject_pkey" PRIMARY KEY ("contractorId","projectId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_email_key" ON "Contractor"("email");

-- CreateIndex
CREATE INDEX "Contractor_status_idx" ON "Contractor"("status");

-- CreateIndex
CREATE INDEX "Contractor_createdById_idx" ON "Contractor"("createdById");

-- CreateIndex
CREATE INDEX "Contractor_deletedAt_idx" ON "Contractor"("deletedAt");

-- CreateIndex
CREATE INDEX "ContractorProject_projectId_idx" ON "ContractorProject"("projectId");

-- AddForeignKey
ALTER TABLE "Contractor" ADD CONSTRAINT "Contractor_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorProject" ADD CONSTRAINT "ContractorProject_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorProject" ADD CONSTRAINT "ContractorProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
