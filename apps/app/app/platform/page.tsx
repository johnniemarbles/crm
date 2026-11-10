import Link from "next/link";
import { db } from "@crm/db";
import { requirePlatformOperator } from "@/lib/platform-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Platform Overview | CRMONIA" };

export default async function PlatformOverview() {
  await requirePlatformOperator();
  const [users, agents, runs] = await Promise.all([
    db.user.count(),
    db.agentDefinition.count(),
    db.agentRun.count(),
  ]);
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Platform overview</h1>
        <p className="mt-2 text-sm text-muted-foreground">Operational inventory from the active database. This is not a tenant count.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Registered users", users], ["Agent definitions", agents], ["Agent runs (all time)", runs]].map(([label, value]) => (
          <div key={label} className="rounded-xl border p-5">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border p-5">
        <h2 className="font-semibold">Control-plane readiness</h2>
        <p className="mt-2 text-sm text-muted-foreground">Workspace configuration and platform configuration are different boundaries. The current schema does not yet provide a standalone tenant directory or a platform-scoped integration registry.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/platform/integrations" className="underline">Review integrations</Link>
          <Link href="/platform/tenants" className="underline">Review tenant provisioning gap</Link>
          <Link href="/platform/security" className="underline">Review security controls</Link>
        </div>
      </div>
    </div>
  );
}
