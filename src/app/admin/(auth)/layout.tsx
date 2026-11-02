import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { destroyAdminSession, getAdminSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { isMock } from "@/lib/teamleader/client";

export const dynamic = "force-dynamic";

async function logout() {
  "use server";
  await destroyAdminSession();
  redirect("/admin/login");
}

const nav = [
  ["/admin", "Overzicht"],
  ["/admin/boekingen", "Boekingen"],
  ["/admin/medewerkers", "Medewerkers"],
  ["/admin/zuilen", "Zuilen"],
  ["/admin/instellingen", "Instellingen"],
  ["/admin/teamleader", "Teamleader"],
  ["/admin/account", "Account"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const conn = db.select().from(schema.teamleaderConnections).where(eq(schema.teamleaderConnections.tenantId, session.tenantId)).get();
  const connected = isMock() || !!conn;
  return (
    <div className="flex min-h-full bg-cw-bg">
      <aside className="flex w-60 shrink-0 flex-col bg-cw-dark text-white">
        <div className="border-b-4 border-cw-accent p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/coachworkz-logo.png" alt="CoachWorkz" className="h-12 w-auto" />
          <p className="mt-3 font-cw text-lg font-medium">Urenregistratie</p>
          <p className="text-xs uppercase tracking-wider text-white/50">Beheer</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md border-l-4 border-transparent px-3 py-2 text-sm font-medium text-white/80 hover:border-cw-accent hover:bg-white/5 hover:text-white">
              {label}
              {href === "/admin/teamleader" && (
                <span className={`ml-2 inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-rose-400"}`} title={connected ? "Gekoppeld" : "Niet gekoppeld"} />
              )}
            </Link>
          ))}
          <Link href="/kiosk" target="_blank" className="mt-4 rounded-md px-3 py-2 text-sm text-cw-accent hover:bg-white/5">
            Zuil openen ↗
          </Link>
        </nav>
        <form action={logout} className="border-t border-white/10 p-3">
          {isMock() && <p className="mb-2 rounded bg-cw-accent/20 px-2 py-1 text-xs text-cw-accent">Testmodus (nepdata)</p>}
          <button className="w-full rounded-md px-3 py-2 text-left text-sm text-white/60 hover:bg-white/5 hover:text-white">Uitloggen</button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
      <span className="pointer-events-none fixed bottom-1 right-2 text-xs text-cw-muted select-none">v{process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}</span>
    </div>
  );
}
