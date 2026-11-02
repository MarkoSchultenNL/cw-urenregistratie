import { eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { Btn, Card, Notice, PageTitle } from "@/components/admin/ui";
import { updateAccount } from "../actions";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { adminId } = (await getAdminSession())!;
  const { ok, error } = await searchParams;
  const admin = db.select().from(schema.adminUsers).where(eq(schema.adminUsers.id, adminId)).get()!;
  return (
    <>
      <PageTitle>Account</PageTitle>
      {ok && <Notice kind="ok">Account bijgewerkt.</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      <Card className="max-w-md">
        <form action={updateAccount} className="space-y-4">
          <label className="block text-sm font-medium">
            E-mailadres (inlognaam)
            <input name="email" type="email" required defaultValue={admin.email} autoComplete="username" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Nieuw wachtwoord <span className="font-normal text-slate-500">(leeg = ongewijzigd, minimaal 10 tekens)</span>
            <input name="newPassword" type="password" minLength={10} autoComplete="new-password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Herhaal nieuw wachtwoord
            <input name="newPassword2" type="password" autoComplete="new-password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <hr className="border-slate-200" />
          <label className="block text-sm font-medium">
            Huidig wachtwoord <span className="font-normal text-slate-500">(ter bevestiging)</span>
            <input name="currentPassword" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <Btn>Opslaan</Btn>
        </form>
      </Card>
      <p className="mt-3 text-xs text-slate-500">Wachtwoord vergeten? Zet een nieuw ADMIN_PASSWORD in de <code>.env</code> op de server; bij een volgende start wordt het wachtwoord van dit account daarop gezet als de database geen admin heeft. Anders: neem contact op met de beheerder van de server.</p>
    </>
  );
}
