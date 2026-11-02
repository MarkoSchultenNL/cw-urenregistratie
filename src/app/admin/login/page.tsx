import { redirect } from "next/navigation";
import { createAdminSession, getAdminSession, verifyAdminLogin } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const admin = await verifyAdminLogin(email, password);
  if (!admin) redirect("/admin/login?error=1");
  await createAdminSession(admin.id, admin.tenantId);
  redirect("/admin");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await ensureBootstrapped();
  if (await getAdminSession()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center bg-cw-bg p-6">
      <form action={login} className="w-full max-w-sm space-y-4 rounded-md border-t-4 border-cw-accent bg-white p-8 shadow ring-1 ring-cw-line">
        <div className="-mx-8 -mt-8 mb-2 rounded-t-sm bg-cw-dark px-8 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/coachworkz-logo.png" alt="CoachWorkz" className="h-14 w-auto" />
        </div>
        <h1 className="font-cw text-2xl font-medium text-cw-dark">Beheer · Urenregistratie</h1>
        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">E-mailadres of wachtwoord klopt niet.</p>}
        <label className="block text-sm font-medium">
          E-mailadres
          <input name="email" type="email" required autoComplete="username" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Wachtwoord
          <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <button className="w-full rounded-md bg-cw-accent px-4 py-2.5 font-semibold uppercase tracking-wide text-white hover:bg-cw-accent-dark">Inloggen</button>
      </form>
    </main>
  );
}
