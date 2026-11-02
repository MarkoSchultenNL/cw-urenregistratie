import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { dateStr } from "@/lib/dates";
import { Btn, Card, Notice, PageTitle, StatusBadge, fmtDateTime, fmtMin } from "@/components/admin/ui";
import { deleteLocalEntry, retryAll, retryEntry } from "../actions";

type SP = { status?: string; from?: string; to?: string; employee?: string; retried?: string };

export default async function EntriesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { tenantId } = (await getAdminSession())!;
  const sp = await searchParams;
  const from = sp.from ?? dateStr(14);
  const to = sp.to ?? dateStr();

  const conds = [eq(schema.timeEntries.tenantId, tenantId), gte(schema.timeEntries.date, from), lte(schema.timeEntries.date, to)];
  if (sp.status === "open") conds.push(inArray(schema.timeEntries.status, ["pending", "error"]));
  if (sp.employee) conds.push(eq(schema.timeEntries.employeeId, sp.employee));

  const rows = db
    .select({ e: schema.timeEntries, first: schema.employees.firstName, last: schema.employees.lastName })
    .from(schema.timeEntries)
    .innerJoin(schema.employees, eq(schema.employees.id, schema.timeEntries.employeeId))
    .where(and(...conds))
    .orderBy(desc(schema.timeEntries.date), desc(schema.timeEntries.createdAt))
    .limit(500)
    .all();
  const ids = rows.map((r) => r.e.id);
  const mats = ids.length ? db.select().from(schema.materialUsages).where(inArray(schema.materialUsages.timeEntryId, ids)).all() : [];
  const matsBy = new Map<string, typeof mats>();
  for (const m of mats) matsBy.set(m.timeEntryId, [...(matsBy.get(m.timeEntryId) ?? []), m]);
  const employees = db.select().from(schema.employees).where(eq(schema.employees.tenantId, tenantId)).orderBy(schema.employees.firstName).all();
  const totalMin = rows.reduce((a, r) => a + r.e.minutes, 0);
  const openCount = rows.filter((r) => r.e.status !== "synced").length;

  return (
    <>
      <PageTitle
        actions={
          <form action={retryAll}>
            <Btn variant="secondary">Alle openstaande opnieuw sturen</Btn>
          </form>
        }
      >
        Boekingen
      </PageTitle>
      {sp.retried && <Notice kind="info">Opnieuw gestuurd: {sp.retried} gelukt.</Notice>}
      <Card className="mb-4">
        <form className="flex flex-wrap items-end gap-3 text-sm">
          <label>
            Van
            <input type="date" name="from" defaultValue={from} className="ml-2 rounded-lg border border-slate-300 px-2 py-1" />
          </label>
          <label>
            Tot
            <input type="date" name="to" defaultValue={to} className="ml-2 rounded-lg border border-slate-300 px-2 py-1" />
          </label>
          <label>
            Medewerker
            <select name="employee" defaultValue={sp.employee ?? ""} className="ml-2 rounded-lg border border-slate-300 px-2 py-1">
              <option value="">alle</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={sp.status ?? ""} className="ml-2 rounded-lg border border-slate-300 px-2 py-1">
              <option value="">alle</option>
              <option value="open">niet in Teamleader</option>
            </select>
          </label>
          <Btn>Filter</Btn>
          <span className="ml-auto text-slate-500">
            {rows.length} boekingen · {fmtMin(totalMin)} uur{openCount > 0 && <span className="text-rose-600"> · {openCount} open</span>}
          </span>
        </form>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1">Datum</th>
              <th>Medewerker</th>
              <th>Project › taak</th>
              <th>Omschrijving / materiaal</th>
              <th className="text-right">Uren</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, first, last }) => (
              <tr key={e.id} className="border-t border-slate-100 align-top">
                <td className="py-2 whitespace-nowrap">
                  {e.date}
                  <br />
                  <span className="text-xs text-slate-400">{fmtDateTime(e.createdAt)}</span>
                </td>
                <td>
                  {first} {last}
                </td>
                <td>
                  {e.projectName}
                  <br />
                  <span className="text-slate-500">› {e.taskName}</span>
                </td>
                <td className="max-w-xs">
                  {e.description || <span className="text-slate-400">—</span>}
                  {(matsBy.get(e.id) ?? []).map((m) => (
                    <div key={m.id} className="text-xs text-slate-600">
                      {m.quantity} × {m.productName} {m.status === "error" && <span className="text-rose-600">(fout)</span>}
                    </div>
                  ))}
                  {e.error && <p className="mt-1 break-words text-xs text-rose-600">{e.error}</p>}
                </td>
                <td className="text-right tabular-nums">{fmtMin(e.minutes)}</td>
                <td>
                  <StatusBadge status={e.status} />
                </td>
                <td className="text-right">
                  {e.status !== "synced" && (
                    <div className="flex justify-end gap-1">
                      <form action={retryEntry}>
                        <input type="hidden" name="id" value={e.id} />
                        <Btn variant="secondary">Opnieuw</Btn>
                      </form>
                      <form action={deleteLocalEntry}>
                        <input type="hidden" name="id" value={e.id} />
                        <Btn variant="danger">Verwijder</Btn>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-slate-400">
                  Geen boekingen in deze periode.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <p className="mt-3 text-xs text-slate-500">Boekingen die al in Teamleader staan, pas je daar aan. Verwijderen hier kan alleen voor boekingen die nog niet zijn doorgestuurd.</p>
    </>
  );
}
