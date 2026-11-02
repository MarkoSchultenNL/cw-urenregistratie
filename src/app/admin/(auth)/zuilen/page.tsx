import { eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { Btn, Card, PageTitle, fmtDateTime } from "@/components/admin/ui";
import { createDevice, deleteDevice, regenerateCode } from "../actions";

export default async function DevicesPage() {
  const { tenantId } = (await getAdminSession())!;
  const rows = db.select().from(schema.devices).where(eq(schema.devices.tenantId, tenantId)).all();
  const appUrl = process.env.APP_URL ?? "";

  return (
    <>
      <PageTitle>Zuilen</PageTitle>
      <Card className="mb-6">
        <form action={createDevice} className="flex items-end gap-3">
          <label className="text-sm font-medium">
            Naam van de zuil
            <input name="name" placeholder="bijv. Werkplaats" className="mt-1 block w-64 rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <Btn>Zuil toevoegen</Btn>
        </form>
        <p className="mt-3 text-sm text-slate-500">
          <strong>Aanbevolen:</strong> zet de <em>zuil-URL</em> (met sleutel) hieronder in de snelkoppeling van de kioskbrowser. Dan koppelt de zuil zichzelf bij elke start, ook als de browser zijn gegevens wist. Alternatief: open{" "}
          <code className="rounded bg-slate-100 px-1">{appUrl}/kiosk</code> en voer de koppelcode in (die koppeling leeft in een cookie).
        </p>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1">Naam</th>
              <th>Status</th>
              <th>Koppelcode</th>
              <th>Zuil-URL</th>
              <th>Laatst gezien</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="py-2 font-medium">{d.name}</td>
                <td>{d.pairedAt ? <span className="text-emerald-700">gekoppeld</span> : <span className="text-amber-700">wacht op koppeling</span>}</td>
                <td className="font-mono text-lg tracking-widest">{d.pairingCode ?? "—"}</td>
                <td className="max-w-xs">
                  {d.deviceKey ? (
                    <input readOnly value={`${appUrl}/kiosk?k=${d.deviceKey}`} className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs" onFocus={undefined} />
                  ) : (
                    <span className="text-xs text-slate-400">maak een nieuwe code voor een URL</span>
                  )}
                </td>
                <td>{fmtDateTime(d.lastSeenAt)}</td>
                <td className="text-right">
                  <div className="flex justify-end gap-2">
                    <form action={regenerateCode}>
                      <input type="hidden" name="id" value={d.id} />
                      <Btn variant="secondary">Nieuwe code</Btn>
                    </form>
                    <form action={deleteDevice}>
                      <input type="hidden" name="id" value={d.id} />
                      <Btn variant="danger">Verwijderen</Btn>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-slate-400">
                  Nog geen zuilen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
