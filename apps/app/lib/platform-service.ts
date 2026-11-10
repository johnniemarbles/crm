import "server-only";
import { db, Prisma } from "@crm/db";
import { requirePlatformOperator } from "@/lib/platform-access";

/**
 * Credential decryption is intentionally NOT exposed as a generic tenant API.
 * Agent/provider adapters need authenticated tenant execution context and
 * explicit tenant-scoped authorization before runtime activation.
 */

/** Idempotent metering primitive. Does not by itself implement budget enforcement. */
export async function recordPlatformUsage(input: {
  requestId: string; tenantId?: string; providerKey: string; capability: string; units: number;
}) {
  if (!Number.isSafeInteger(input.units) || input.units < 0) throw new Error("Invalid usage amount");
  return db.platformUsageEvent.create({
    data: {
      requestId: input.requestId,
      tenantId: input.tenantId ?? null,
      providerKey: input.providerKey,
      capability: input.capability,
      units: input.units,
    },
  });
}

export async function platformSummary() {
  await requirePlatformOperator();
  const [tenants, integrations, credentials, users, runs, recentAudit] = await Promise.all([
    db.platformTenant.count(),
    db.platformIntegration.count(),
    db.platformCredential.count(),
    db.user.count(),
    db.agentRun.count(),
    db.platformAuditEvent.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
  ]);
  return { tenants, integrations, credentials, users, runs, recentAudit };
}
