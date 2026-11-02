import { getAdminSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Btn, Card, Notice, PageTitle } from "@/components/admin/ui";
import { saveSettingsAction } from "../actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { tenantId } = (await getAdminSession())!;
  const s = getSettings(tenantId);
  const { ok } = await searchParams;
  return (
    <>
      <PageTitle>Instellingen</PageTitle>
      {ok && <Notice kind="ok">Instellingen opgeslagen.</Notice>}
      <Card className="max-w-xl">
        <form action={saveSettingsAction} className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="font-semibold">Zuil</legend>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="materialsEnabled" defaultChecked={s.materialsEnabled} /> Verbruiksmateriaal kunnen kiezen
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="descriptionRequired" defaultChecked={s.descriptionRequired} /> Beschrijving verplicht
            </label>
            <label className="block text-sm">
              Uren invoeren in stappen van
              <select name="stepMinutes" defaultValue={s.stepMinutes} className="ml-2 rounded-lg border border-slate-300 px-2 py-1">
                {[5, 10, 15, 30, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Maximaal uren per boeking
              <input type="number" name="maxHoursPerEntry" min={1} max={24} defaultValue={s.maxHoursPerEntry} className="ml-2 w-20 rounded-lg border border-slate-300 px-2 py-1" />
            </label>
            <label className="block text-sm">
              Schermschaal zuil
              <input type="number" name="kioskScale" min={0} max={400} step={5} defaultValue={s.kioskScale} className="ml-2 w-20 rounded-lg border border-slate-300 px-2 py-1" /> %
              <span className="ml-2 text-slate-500">(0 = automatisch: liggend scherm 1280 px = 100%, staand scherm 720 px = 100%, grotere schermen schalen mee; bijv. 150 voor anderhalf keer zo groot)</span>
            </label>
            <label className="block text-sm">
              Terug naar startscherm na
              <input type="number" name="idleResetSeconds" min={20} defaultValue={s.idleResetSeconds} className="ml-2 w-24 rounded-lg border border-slate-300 px-2 py-1" /> seconden zonder
              activiteit
            </label>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="font-semibold">Artikelen (verbruiksmateriaal)</legend>
            <p className="text-sm text-slate-600">Toon op de zuil alleen artikelen waarvan een custom field in Teamleader een bepaalde waarde heeft. Leeg laten = alle artikelen.</p>
            <label className="block text-sm">
              Custom field (label in Teamleader)
              <input name="productFilterField" defaultValue={s.productFilterField} placeholder="bijv. Bedrijfsentiteit" className="ml-2 w-56 rounded-lg border border-slate-300 px-2 py-1" />
            </label>
            <label className="block text-sm">
              Vereiste waarde
              <input name="productFilterValue" defaultValue={s.productFilterValue} placeholder="bijv. Coachworkz" className="ml-2 w-56 rounded-lg border border-slate-300 px-2 py-1" />
            </label>
            <p className="text-xs text-slate-500">Na wijzigen van het veld worden de artikelen opnieuw opgehaald (zie Teamleader-pagina voor de stand).</p>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="font-semibold">Teamleader</legend>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="invoiceable" defaultChecked={s.invoiceable} /> Uren als factureerbaar boeken
            </label>
            <label className="block text-sm">
              Vaste starttijd
              <input type="time" name="defaultStartTime" defaultValue={s.defaultStartTime} className="ml-2 rounded-lg border border-slate-300 px-2 py-1" />
              <span className="ml-2 text-slate-500">(alleen gebruikt als het Teamleader-account geen &quot;uren per dag&quot;-registratie heeft)</span>
            </label>
          </fieldset>
          <Btn>Opslaan</Btn>
        </form>
      </Card>
    </>
  );
}
