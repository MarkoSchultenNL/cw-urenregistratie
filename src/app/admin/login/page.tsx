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
    <main className="flex flex-1 items-center justify-center p-6">
      <form action={login} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold">Beheer · Urenregistratie</h1>
        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">E-mailadres of wachtwoord klopt niet.</p>}
        <label className="block text-sm font-medium">
          E-mailadres
          <input name="email" type="email" required autoComplete="username" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Wachtwoord
          <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <button className="w-full rounded-lg bg-sky-600 px-4 py-2.5 font-semibold text-white hover:bg-sky-700">Inloggen</button>
      </form>
    </main>
  );
}
