import { asc, eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { Btn, Card, Notice, PageTitle } from "@/components/admin/ui";
import { clearPin, moveEmployee, setPin, setUploadUrl, syncEmployeesAction, toggleVisible } from "../actions";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; n?: string }> }) {
  const { tenantId } = (await getAdminSession())!;
  const { ok, error, n } = await searchParams;
  const rows = db.select().from(schema.employees).where(eq(schema.employees.tenantId, tenantId)).orderBy(asc(schema.employees.sortOrder)).all();

  return (
    <>
      <PageTitle
        actions={
          <form action={syncEmployeesAction}>
            <Btn>Medewerkers ophalen uit Teamleader</Btn>
          </form>
        }
      >
        Medewerkers
      </PageTitle>
      {ok === "pin" && <Notice kind="ok">Pincode opgeslagen.</Notice>}
      {ok === "sync" && <Notice kind="ok">{n} medewerkers opgehaald uit Teamleader.</Notice>}
      {ok === "upload" && <Notice kind="ok">Upload-link opgeslagen.</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      <Card>
        {rows.length === 0 ? (
          <p className="text-slate-500">Nog geen medewerkers. Klik op &quot;Medewerkers ophalen uit Teamleader&quot; (koppel eerst Teamleader).</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1 w-16">Volgorde</th>
                <th>Naam</th>
                <th>Status</th>
                <th>Op zuil</th>
                <th>Pincode</th>
                <th>Foto-upload-link</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={e.id} className="border-t border-slate-100 align-middle">
                  <td className="py-2">
                    <div className="flex gap-1">
                      <form action={moveEmployee}>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="dir" value="-1" />
                        <Btn variant="secondary" disabled={i === 0} className="px-2">
                          ↑
                        </Btn>
                      </form>
                      <form action={moveEmployee}>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="dir" value="1" />
                        <Btn variant="secondary" disabled={i === rows.length - 1} className="px-2">
                          ↓
                        </Btn>
                      </form>
                    </div>
                  </td>
                  <td>
                    <span className="font-medium">
                      {e.firstName} {e.lastName}
                    </span>
                    <br />
                    <span className="text-xs text-slate-500">{e.email}</span>
                  </td>
                  <td>
                    {e.tlStatus === "active" ? <span className="text-emerald-700">actief</span> : <span className="text-slate-400">gedeactiveerd in Teamleader</span>}
                  </td>
                  <td>
                    <form action={toggleVisible}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="visible" value={e.visible ? "0" : "1"} />
                      <Btn variant={e.visible ? "secondary" : "primary"} disabled={e.tlStatus !== "active"}>
                        {e.visible ? "Zichtbaar · verbergen" : "Verborgen · tonen"}
                      </Btn>
                    </form>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <form action={setPin} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={e.id} />
                        <input
                          name="pin"
                          inputMode="numeric"
                          pattern="\d{4}"
                          maxLength={4}
                          placeholder={e.pinHash ? "••••" : "4 cijfers"}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1 font-mono"
                          required
                        />
                        <Btn>{e.pinHash ? "Wijzigen" : "Instellen"}</Btn>
                      </form>
                      {e.pinHash && (
                        <form action={clearPin}>
                          <input type="hidden" name="id" value={e.id} />
                          <Btn variant="secondary">Wissen</Btn>
                        </form>
                      )}
                    </div>
                  </td>
                  <td>
                    <form action={setUploadUrl} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={e.id} />
                      <input
                        name="uploadUrl"
                        type="url"
                        defaultValue={e.uploadUrl ?? ""}
                        placeholder="https://… (leeg = geen foto-vraag)"
                        className="w-64 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      />
                      <Btn variant="secondary">Opslaan</Btn>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="mt-3 text-xs text-slate-500">Pincodes worden versleuteld opgeslagen en zijn achteraf niet te lezen; stel bij vergeten een nieuwe in. Medewerkers zonder pincode kunnen niet boeken. De foto-upload-link (bijv. een OneDrive-, Google Drive- of Dropbox-&quot;bestanden aanvragen&quot;-link) wordt op de zuil als QR-code getoond, zodat de medewerker met de telefoon foto&apos;s kan uploaden.</p>
    </>
  );
}
