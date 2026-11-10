import { notFound } from "next/navigation";
import { requirePlatformOperator } from "@/lib/platform-access";

export const dynamic = "force-dynamic";
const sectionNames = ["tenants", "integrations", "ai", "security", "settings"] as const;
type Section = (typeof sectionNames)[number];

function Tile({ title, description, status }: { title: string; description: string; status: string }) {
  return <article className="rounded-xl border p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-medium">{title}</h2>
      <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">{status}</span>
    </div>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
  </article>;
}

export default async function PlatformSection({ params }: { params: Promise<{ section: string }> }) {
  await requirePlatformOperator();
  const { section } = await params;
  if (!sectionNames.includes(section as Section)) notFound();
  const heading: Record<Section, string> = {
    tenants: "Tenant management", integrations: "Platform integrations",
    ai: "Platform AI & agents", security: "Security & governance",
    settings: "Platform settings",
  };
  const content: Record<Section, Array<[string, string, string]>> = {
    tenants: [
      ["Tenant directory", "Not yet available: the existing schema does not model independently provisioned tenant organizations. User records are not equivalent to tenants.", "Schema required"],
      ["Provisioning lifecycle", "Introduce tenant creation, suspension, lifecycle status and ownership before enabling platform-wide mutations.", "Not implemented"],
      ["Per-tenant policies", "Enforce tenant isolation in storage, queries, credentials, quotas and agent execution before exposing operator actions.", "Not implemented"],
    ],
    integrations: [
      ["Google", "Workspace Google OAuth is present. Platform-wide client credentials, callback governance and per-tenant connection inventory need a dedicated registry.", "Workspace integration"],
      ["Microsoft", "Workspace Microsoft OAuth is present. Centralized platform registration and tenant connection management are not yet implemented.", "Workspace integration"],
      ["Slack", "Workspace Slack connection flows exist. A separate platform installation governance console is needed.", "Workspace integration"],
      ["Email, WhatsApp & telephony", "Create platform adapters, provider capability declarations, webhook verification and connection health before tenant enablement.", "Registry required"],
      ["Payments, social & storage", "No platform configuration surface is verified for these provider families. Do not treat an adapter as live without health checks.", "Verification required"],
    ],
    ai: [
      ["Provider registry", "Platform-owned adapters, allowed models, usage routing and provider capability metadata should be managed centrally.", "Not implemented"],
      ["Credential isolation", "Platform operational keys and tenant bring-your-own keys require separate encrypted scopes and no cross-scope fallback.", "Enforcement required"],
      ["Platform agents", "Tenant agent definitions are implemented separately. Platform agents need their own authorization, execution scope and audit trail.", "Separate scope required"],
      ["Usage and limits", "Build tenant-level metering, budgets, policy limits and immutable invocation attribution before activating shared infrastructure.", "Not implemented"],
    ],
    security: [
      ["Operator access", "Access to these platform pages requires an authenticated session and explicit PLATFORM_OPERATOR_EMAILS allowlisting. If the list is unset, access is denied.", "Enforced"],
      ["Authorization model", "Move from deployment allowlist to persisted platform roles, MFA, revocation and step-up authorization for destructive actions.", "Upgrade required"],
      ["Audit logs", "Add append-only records for platform credential, tenant lifecycle and policy changes before enabling mutations.", "Not implemented"],
      ["Data boundaries", "Platform operators must not inherit unrestricted tenant business-data access. Future APIs require dedicated server-side scope checks.", "Policy required"],
    ],
    settings: [
      ["Operator bootstrap", "Set PLATFORM_OPERATOR_EMAILS in the application server environment to a comma-separated list of authorized emails. Never expose this value to client JavaScript.", "Server configuration"],
      ["Secrets & OAuth", "Store platform credentials in a secrets manager, never in public environment variables, route payloads or rendered HTML.", "Architecture required"],
      ["Feature flags", "Introduce audited platform flags with explicit tenant rollout and rollback, separate from tenant preferences.", "Not implemented"],
      ["Environments", "Keep development, staging and production provider registrations, callbacks and credentials isolated.", "Policy required"],
    ],
  };
  const current = section as Section;
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">{heading[current]}</h1>
    <p className="mt-2 text-sm text-muted-foreground">Platform scope · Verified capabilities and outstanding controls are labelled separately.</p></div>
    <div className="grid gap-3 lg:grid-cols-2">
      {content[current].map(([title, description, status]) => <Tile key={title} title={title} description={description} status={status} />)}
    </div>
  </div>;
}
