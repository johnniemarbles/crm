import Link from "next/link";
import { requirePlatformOperator } from "@/lib/platform-access";

const items = [
  ["Overview", "/platform"],
  ["Tenants", "/platform/tenants"],
  ["Integrations", "/platform/integrations"],
  ["AI & agents", "/platform/ai"],
  ["Security", "/platform/security"],
  ["Settings", "/platform/settings"],
] as const;

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformOperator();
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CRMONIA / Operator Control Plane</div>
            <div className="text-xl font-semibold">Platform Console</div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">{session.user.email}</span>
            <Link className="underline underline-offset-4" href="/">Return to application</Link>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-7 md:flex-row">
        <nav aria-label="Platform navigation" className="flex shrink-0 flex-wrap gap-2 md:w-48 md:flex-col">
          {items.map(([title, href]) => (
            <Link key={href} href={href} className="rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2">
              {title}
            </Link>
          ))}
        </nav>
        <main id="main-content" className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
