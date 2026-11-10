"use server";
import { db, Prisma } from "@crm/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformOperator } from "@/lib/platform-access";
import { encryptPlatformSecret } from "@/lib/platform-secrets";

function stringField(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function refresh() {
  for (const route of ["/platform", "/platform/tenants", "/platform/integrations", "/platform/ai", "/platform/security", "/platform/settings"]) revalidatePath(route);
}
const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/);
const code = z.string().regex(/^[a-z][a-z0-9._-]{1,63}$/);
const name = z.string().min(2).max(120);

export async function createTenant(form: FormData) {
  const actor = await requirePlatformOperator();
  const values = z.object({ name, slug }).parse({ name: stringField(form,"name"), slug: stringField(form,"slug") });
  await db.$transaction(async tx => {
    const tenant = await tx.platformTenant.create({ data: values });
    await tx.platformAuditEvent.create({ data: {
      actorId: actor.user.id, action: "tenant.create", resourceType: "tenant", resourceId: tenant.id,
      details: { slug: tenant.slug },
    } });
  });
  refresh();
}

export async function changeTenantStatus(form: FormData) {
  const actor = await requirePlatformOperator();
  const tenantId = z.string().min(1).parse(stringField(form,"tenantId"));
  // ACTIVE is intentionally unavailable until runtime data isolation is implemented.
  const status = z.enum(["PENDING", "SUSPENDED"]).parse(stringField(form,"status"));
  await db.$transaction(async tx => {
    const tenant = await tx.platformTenant.update({ where: { id: tenantId }, data: { status } });
    await tx.platformAuditEvent.create({ data: {
      actorId: actor.user.id, action: "tenant.status", resourceType: "tenant", resourceId: tenant.id,
      details: { status },
    } });
  });
  refresh();
}

export async function upsertIntegration(form: FormData) {
  const actor = await requirePlatformOperator();
  const values = z.object({
    key: code, name, category: z.enum(["AI", "EMAIL", "CALENDAR", "SOCIAL", "PHONE", "WHATSAPP", "PAYMENTS", "STORAGE", "OTHER"]),
    status: z.enum(["DISABLED", "ENABLED"]),
  }).parse({
    key: stringField(form,"key"), name: stringField(form,"name"),
    category: stringField(form,"category"), status: stringField(form,"status"),
  });
  await db.$transaction(async tx => {
    const record = await tx.platformIntegration.upsert({
      where: { key: values.key }, update: { name: values.name, category: values.category, status: values.status },
      create: values,
    });
    await tx.platformAuditEvent.create({ data: {
      actorId: actor.user.id, action: "integration.upsert", resourceType: "integration", resourceId: record.id,
      details: { key: values.key, category: values.category, status: values.status },
    } });
  });
  refresh();
}

export async function storeCredential(form: FormData) {
  const actor = await requirePlatformOperator();
  const integrationId = z.string().min(1).parse(stringField(form,"integrationId"));
  const purpose = z.enum(["brain", "utility", "oauth", "webhook", "service"]).parse(stringField(form,"purpose"));
  const tenantId = stringField(form,"tenantId") || null;
  const secret = z.string().min(8).max(16384).parse(String(form.get("secret") ?? ""));
  // Fail closed: tenant credentials cannot be saved for tenants whose runtime is not isolated.
  if (tenantId) throw new Error("Tenant BYOK provisioning disabled until tenant-runtime isolation is enforced");
  const encrypted = encryptPlatformSecret(secret);
  await db.$transaction(async tx => {
    const existing = await tx.platformCredential.findFirst({
      where: { integrationId, tenantId: null, purpose }, select: { id: true },
    });
    const record = existing
      ? await tx.platformCredential.update({ where: { id: existing.id }, data: encrypted })
      : await tx.platformCredential.create({ data: { integrationId, tenantId: null, purpose, ...encrypted } });
    await tx.platformAuditEvent.create({ data: {
      actorId: actor.user.id, action: existing ? "credential.rotate" : "credential.create",
      resourceType: "credential", resourceId: record.id,
      details: { integrationId, purpose, scope: "platform" },
    } });
  });
  refresh();
}

export async function revokeCredential(form: FormData) {
  const actor = await requirePlatformOperator();
  const id = z.string().min(1).parse(stringField(form,"credentialId"));
  await db.$transaction(async tx => {
    const credential = await tx.platformCredential.delete({ where: { id }, select: { id: true, integrationId: true, purpose: true } });
    await tx.platformAuditEvent.create({ data: {
      actorId: actor.user.id, action: "credential.revoke", resourceType: "credential", resourceId: id,
      details: { integrationId: credential.integrationId, purpose: credential.purpose },
    } });
  });
  refresh();
}

export async function setTenantPolicy(form: FormData) {
  const actor = await requirePlatformOperator();
  const tenantId = z.string().min(1).parse(stringField(form,"tenantId"));
  const key = z.enum(["monthly_unit_limit", "allowed_provider", "ai_enabled"]).parse(stringField(form,"key"));
  const rawValue = stringField(form,"value");
  let value: Prisma.InputJsonValue;
  if (key === "monthly_unit_limit") value = z.coerce.number().int().nonnegative().max(1000000000).parse(rawValue);
  else if (key === "ai_enabled") value = z.enum(["true", "false"]).parse(rawValue) === "true";
  else value = code.parse(rawValue);
  await db.$transaction(async tx => {
    const policy = await tx.platformTenantPolicy.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { value }, create: { tenantId, key, value },
    });
    await tx.platformAuditEvent.create({ data: {
      actorId: actor.user.id, action: "tenant.policy", resourceType: "policy", resourceId: policy.id,
      details: { tenantId, key, value },
    } });
  });
  refresh();
}
