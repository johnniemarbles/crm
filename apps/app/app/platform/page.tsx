import Link from "next/link";
import { platformSummary } from "@/lib/platform-service";
export const dynamic = "force-dynamic";
export const metadata = { title: "Platform Overview | CRMONIA" };
export default async function PlatformOverview() {
 const data = await platformSummary();
 return <div className="space-y-6">
  <div><h1 className="text-2xl font-semibold">Platform overview</h1>
   <p className="mt-2 text-sm text-muted-foreground">Actual control-plane records and existing CRM activity; tenant registration is not equivalent to tenant runtime activation.</p>
  </div>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
   {([["Registered tenants",data.tenants],["Providers",data.integrations],["Stored credentials",data.credentials],["CRM users",data.users],["Agent runs",data.runs]] as const).map(([label,value])=>
    <div key={label} className="rounded-xl border p-5"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div></div>)}
  </div>
  <div className="rounded-xl border p-5"><h2 className="font-semibold">Administration</h2>
   <div className="mt-3 grid gap-2 sm:grid-cols-2">
    {([["Tenant registry","/platform/tenants"],["Integration setup","/platform/integrations"],["AI usage","/platform/ai"],["Security audit","/platform/security"]] as const).map(([name,url])=>
     <Link key={url} href={url} className="rounded-lg border p-3 text-sm hover:bg-muted">{name}</Link>)}
   </div>
  </div>
  <div className="rounded-xl border p-5"><h2 className="font-semibold">Latest operator actions</h2>
   <div className="mt-3 divide-y">{data.recentAudit.length===0 && <p className="text-sm text-muted-foreground">No operator actions recorded.</p>}
    {data.recentAudit.map(a=><div className="flex flex-wrap justify-between gap-2 py-3 text-sm" key={a.id}><span>{a.action} · {a.resourceType}</span><time className="text-muted-foreground">{a.createdAt.toISOString()}</time></div>)}
   </div>
  </div>
  <p className="text-sm text-muted-foreground">Tenant runtime isolation, adapter execution, quotas and platform role management must be completed before this console can govern live multi-tenant traffic.</p>
 </div>;
}
