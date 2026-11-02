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
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const conn = db.select().from(schema.teamleaderConnections).where(eq(schema.teamleaderConnections.tenantId, session.tenantId)).get();
  const connected = isMock() || !!conn;
  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <p className="text-lg font-bold">Urenregistratie</p>
          <p className="text-xs text-slate-500">Beheer</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              {label}
              {href === "/admin/teamleader" && (
                <span className={`ml-2 inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-rose-500"}`} title={connected ? "Gekoppeld" : "Niet gekoppeld"} />
              )}
            </Link>
          ))}
          <Link href="/kiosk" target="_blank" className="mt-4 rounded-lg px-3 py-2 text-sm text-sky-700 hover:bg-sky-50">
            Zuil openen ↗
          </Link>
        </nav>
        <form action={logout} className="border-t border-slate-200 p-3">
          {isMock() && <p className="mb-2 rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">Testmodus (nepdata)</p>}
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100">Uitloggen</button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
