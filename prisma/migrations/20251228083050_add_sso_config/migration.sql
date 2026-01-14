-- CreateTable
CREATE TABLE "OrganizationSSOConfig" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "entryPoint" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "cert" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSSOConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSSOConfig_orgId_key" ON "OrganizationSSOConfig"("orgId");

-- AddForeignKey
ALTER TABLE "OrganizationSSOConfig" ADD CONSTRAINT "OrganizationSSOConfig_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
