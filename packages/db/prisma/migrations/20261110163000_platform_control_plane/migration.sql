CREATE TABLE "platform_tenant" (
"id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT NOT NULL UNIQUE,
"status" TEXT NOT NULL DEFAULT 'PENDING', "organizationId" TEXT UNIQUE,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "platform_integration" (
"id" TEXT PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL,
"category" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DISABLED',
"config" JSONB NOT NULL DEFAULT '{}'::jsonb,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "platform_credential" (
"id" TEXT PRIMARY KEY, "integrationId" TEXT NOT NULL,
"tenantId" TEXT, "purpose" TEXT NOT NULL, "ciphertext" TEXT NOT NULL,
"iv" TEXT NOT NULL, "authTag" TEXT NOT NULL, "keyVersion" TEXT NOT NULL,
"lastFour" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "platform_credential_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "platform_integration"("id") ON DELETE RESTRICT,
CONSTRAINT "platform_credential_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "platform_tenant"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "platform_credential_integrationId_tenantId_purpose_key" ON "platform_credential"("integrationId","tenantId","purpose");
-- PostgreSQL treats NULL as distinct; enforce one global credential per provider/purpose.
CREATE UNIQUE INDEX "platform_credential_global_unique" ON "platform_credential"("integrationId","purpose") WHERE "tenantId" IS NULL;
CREATE INDEX "platform_credential_tenantId_idx" ON "platform_credential"("tenantId");
CREATE TABLE "platform_tenant_policy" (
"id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "key" TEXT NOT NULL,
"value" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "platform_tenant_policy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "platform_tenant"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "platform_tenant_policy_tenantId_key_key" ON "platform_tenant_policy"("tenantId","key");
CREATE TABLE "platform_usage_event" (
"id" TEXT PRIMARY KEY, "tenantId" TEXT, "providerKey" TEXT NOT NULL,
"capability" TEXT NOT NULL, "units" INTEGER NOT NULL,
"occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"requestId" TEXT NOT NULL UNIQUE
);
CREATE INDEX "platform_usage_event_tenantId_occurredAt_idx" ON "platform_usage_event"("tenantId","occurredAt");
CREATE TABLE "platform_audit_event" (
"id" TEXT PRIMARY KEY, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL,
"resourceType" TEXT NOT NULL, "resourceId" TEXT NOT NULL,
"details" JSONB NOT NULL DEFAULT '{}'::jsonb,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "platform_audit_event_createdAt_idx" ON "platform_audit_event"("createdAt");
CREATE INDEX "platform_audit_event_resourceType_resourceId_idx" ON "platform_audit_event"("resourceType","resourceId");
