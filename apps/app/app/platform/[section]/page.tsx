import { notFound } from "next/navigation";
import { db } from "@crm/db";
import { requirePlatformOperator } from "@/lib/platform-access";
import { createTenant, changeTenantStatus, upsertIntegration, storeCredential, revokeCredential, setTenantPolicy } from "../actions";

export const dynamic = "force-dynamic";
const sections = ["tenants", "integrations", "ai", "security", "settings"] as const;
const box = "rounded-xl border bg-card p-5";
const field = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
const btn = "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90";
const heading = "text-lg font-semibold";
function Submit({ children }: { children: React.ReactNode }) { return <button className={btn} type="submit">{children}</button>; }
function Empty({ children }: { children: React.ReactNode }) { return <p className="text-sm text-muted-foreground">{children}</p>; }

async function Tenants() {
 const [tenants, policies] = await Promise.all([
  db.platformTenant.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  db.platformTenantPolicy.findMany({ take: 250, orderBy: { updatedAt: "desc" } }),
 ]);
 return <div className="space-y-5">
  <div className={box}><h2 className={heading}>Register tenant</h2>
   <Empty>This creates a control-plane record only. CRM runtime isolation must be completed before activating tenants.</Empty>
   <form action={createTenant} className="mt-4 grid gap-3 sm:grid-cols-3">
    <input className={field} name="name" required minLength={2} maxLength={120} placeholder="Tenant name" aria-label="Tenant name" />
    <input className={field} name="slug" required pattern="[a-z0-9][a-z0-9-]{1,62}" placeholder="tenant-slug" aria-label="Tenant slug" />
    <Submit>Register tenant</Submit>
   </form>
  </div>
  <div className={box}><h2 className={heading}>Tenant registry ({tenants.length}{tenants.length === 100 ? "+" : ""})</h2>
    <div className="mt-4 space-y-4">{tenants.length === 0 && <Empty>No tenants registered.</Empty>}
    {tenants.map(tenant => <div key={tenant.id} className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
       <div><div className="font-semibold">{tenant.name}</div><div className="text-xs text-muted-foreground">{tenant.slug} · {tenant.id}</div></div>
       <div className="rounded-full border px-3 py-1 text-xs">{tenant.status}</div>
      </div>
      <form action={changeTenantStatus} className="mt-3 flex flex-wrap items-center gap-2">
       <input type="hidden" name="tenantId" value={tenant.id} />
       <select name="status" className={field + " max-w-48"} defaultValue={tenant.status === "SUSPENDED" ? "SUSPENDED" : "PENDING"}>
        <option value="PENDING">Pending</option><option value="SUSPENDED">Suspended</option>
       </select><Submit>Update lifecycle</Submit>
      </form>
      <div className="mt-4 text-sm font-medium">Tenant policies (control plane metadata; not yet runtime enforced)</div>
      <form action={setTenantPolicy} className="mt-2 grid gap-2 sm:grid-cols-4">
       <input type="hidden" name="tenantId" value={tenant.id} />
       <select name="key" className={field}>
        <option value="monthly_unit_limit">Monthly unit limit</option>
        <option value="allowed_provider">Allowed provider</option>
        <option value="ai_enabled">AI enabled</option>
       </select>
       <input className={field + " sm:col-span-2"} name="value" required placeholder="Value (number, provider code, or true/false)" aria-label="Policy value" />
       <Submit>Save policy</Submit>
      </form>
      <div className="mt-2 text-xs text-muted-foreground">{policies.filter(p=>p.tenantId===tenant.id).map(p=>p.key+": "+JSON.stringify(p.value)).join(" · ") || "No policies configured"}</div>
     </div>)}
    </div>
  </div>
 </div>;
}

async function Integrations() {
 const [integrations, credentials] = await Promise.all([
  db.platformIntegration.findMany({ orderBy: { key: "asc" }, take: 200 }),
  db.platformCredential.findMany({ select: { id: true, integrationId: true, tenantId: true, purpose: true, lastFour: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 200 }),
 ]);
 return <div className="space-y-5">
  <div className={box}><h2 className={heading}>Provider registry</h2>
   <Empty>Central definitions are separate from per-workspace OAuth connections. An ENABLED registry record does not mean an executable adapter exists.</Empty>
   <form action={upsertIntegration} className="mt-4 grid gap-3 sm:grid-cols-2">
    <input className={field} name="key" required placeholder="provider-key" aria-label="Provider key" />
    <input className={field} name="name" required placeholder="Display name" aria-label="Display name" />
    <select className={field} name="category" aria-label="Category">
     {["AI","EMAIL","CALENDAR","SOCIAL","PHONE","WHATSAPP","PAYMENTS","STORAGE","OTHER"].map(x=><option key={x} value={x}>{x}</option>)}
    </select>
    <select className={field} name="status" aria-label="Registry status"><option value="DISABLED">Disabled</option><option value="ENABLED">Enabled (registry only)</option></select>
    <div className="sm:col-span-2"><Submit>Save provider</Submit></div>
   </form>
  </div>
  <div className={box}><h2 className={heading}>Registered providers ({integrations.length})</h2>
   <div className="mt-3 divide-y">{integrations.length===0 && <Empty>No registered providers. Add an integration above.</Empty>}
    {integrations.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
     <div><span className="font-medium">{p.name}</span><div className="text-xs text-muted-foreground">{p.key} · {p.category}</div></div>
     <span className="rounded-full border px-2 py-1 text-xs">{p.status}</span>
    </div>)}
   </div>
  </div>
  <div className={box}><h2 className={heading}>Platform credentials</h2>
   <Empty>AES-256-GCM encrypted at rest. Only scope and final four characters are displayed. Configure PLATFORM_CREDENTIAL_KEY in the server environment first. Tenant BYOK stays locked until runtime isolation is complete.</Empty>
   {integrations.length>0 && <form action={storeCredential} className="mt-4 grid gap-3 sm:grid-cols-2">
    <select className={field} name="integrationId" aria-label="Credential provider">
     {integrations.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
    <select className={field} name="purpose" aria-label="Credential purpose">
     {["brain","utility","oauth","webhook","service"].map(v=><option key={v} value={v}>{v}</option>)}
    </select>
    <input className={field + " sm:col-span-2"} name="secret" type="password" required minLength={8} autoComplete="new-password" placeholder="Credential secret (never returned after save)" aria-label="Credential secret" />
    <div className="sm:col-span-2"><Submit>Encrypt and save / rotate credential</Submit></div>
   </form>}
   <div className="mt-5 divide-y">{credentials.length===0 && <Empty>No credentials stored.</Empty>}
    {credentials.map(c=><div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
     <div className="font-medium">{integrations.find(p=>p.id===c.integrationId)?.name ?? "Unknown provider"} · {c.purpose}
      <div className="text-xs text-muted-foreground">{c.tenantId ?? "Platform scope"} · ending {c.lastFour}</div></div>
     <form action={revokeCredential}><input type="hidden" name="credentialId" value={c.id}/><button className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">Revoke</button></form>
    </div>)}
   </div>
  </div>
 </div>;
}

async function AI() {
 const [integrations, usage] = await Promise.all([
  db.platformIntegration.findMany({ where: { category: "AI" }, orderBy: { key: "asc" } }),
  db.platformUsageEvent.groupBy({ by: ["providerKey", "capability"], _sum: { units: true }, _count: { _all: true }, orderBy: { providerKey: "asc" }, take: 50 }),
 ]);
 return <div className="space-y-5">
  <div className={box}><h2 className={heading}>AI provider routing</h2>
   <Empty>Provider catalog entries are managed under Integrations. Platform-owned keys and tenant BYOK are different scopes. There is no implicit tenant fallback to a platform credential.</Empty>
   <div className="mt-4 space-y-2">{integrations.length===0 && <Empty>No AI providers registered.</Empty>}
    {integrations.map(p=><div className="flex justify-between rounded-lg border p-3 text-sm" key={p.id}><span>{p.name}</span><span>{p.status}</span></div>)}
   </div>
  </div>
  <div className={box}><h2 className={heading}>Metering</h2>
    <Empty>Usage events recorded in the control-plane ledger. This is not a claim that existing agent execution is instrumented or quota-enforced.</Empty>
    <div className="mt-4 space-y-2">{usage.length===0 && <Empty>No usage events recorded.</Empty>}
    {usage.map((u,i)=><div className="flex justify-between border-b py-2 text-sm" key={i}><span>{u.providerKey} / {u.capability}</span><span>{u._sum.units ?? 0} units · {u._count._all} events</span></div>)}
    </div>
  </div>
  <div className={box}><h2 className={heading}>Execution isolation</h2><Empty>Agent runners must be updated to resolve credentials through verified tenant context, enforce quota before dispatch and emit idempotent usage events. Until then, the console is configuration only.</Empty></div>
 </div>;
}

async function Security() {
 const events = await db.platformAuditEvent.findMany({ take: 100, orderBy: { createdAt: "desc" } });
 return <div className="space-y-5">
  <div className={box}><h2 className={heading}>Platform authorization</h2>
   <Empty>Platform routes and server actions require authenticated users explicitly allowlisted in PLATFORM_OPERATOR_EMAILS. This bootstrap model must be upgraded to managed operator roles, MFA and step-up verification for sensitive mutations.</Empty>
  </div>
  <div className={box}><h2 className={heading}>Audit trail</h2><Empty>Recent server-side operator mutations. Credentials are never included in audit payloads.</Empty>
   <div className="mt-4 divide-y">{events.length===0 && <Empty>No audit events recorded.</Empty>}
    {events.map(e=><div key={e.id} className="py-3 text-sm">
     <div className="flex flex-wrap justify-between gap-2"><strong>{e.action}</strong><time className="text-muted-foreground">{e.createdAt.toISOString()}</time></div>
     <div className="mt-1 break-all text-xs text-muted-foreground">{e.resourceType} / {e.resourceId} · actor {e.actorId}</div>
    </div>)}
   </div>
  </div>
 </div>;
}

function Settings() {
 return <div className="space-y-4">
  <div className={box}><h2 className={heading}>Secrets and environments</h2>
   <Empty>Set PLATFORM_OPERATOR_EMAILS and PLATFORM_CREDENTIAL_KEY as server-only deployment secrets. Keep staging and production encryption keys and provider clients separate. Missing credentials cause a fail-closed error.</Empty>
  </div>
  <div className={box}><h2 className={heading}>Operational restrictions</h2>
   <Empty>Tenant activation, tenant BYOK provisioning, autonomous platform agents, account impersonation and globally routed provider calls remain disabled until the runtime enforces tenant-aware data isolation, operator roles and usage controls.</Empty>
  </div>
 </div>;
}

export default async function Section({ params }: { params: Promise<{ section: string }> }) {
 await requirePlatformOperator();
 const { section } = await params;
 if (!sections.includes(section as (typeof sections)[number])) notFound();
 const titles: Record<(typeof sections)[number],string> = {
  tenants: "Tenant Management", integrations: "Integration Registry & Credentials",
  ai: "AI Governance & Metering", security: "Security & Audit", settings: "Platform Settings",
 };
 return <div className="space-y-6">
  <div><h1 className="text-2xl font-semibold">{titles[section as keyof typeof titles]}</h1>
   <p className="mt-2 text-sm text-muted-foreground">Platform-only controls. Live configuration is separated from capabilities not yet wired to the CRM runtime.</p>
  </div>
  {section==="tenants" ? <Tenants/> : section==="integrations" ? <Integrations/> : section==="ai" ? <AI/> : section==="security" ? <Security/> : <Settings/>}
 </div>;
}
