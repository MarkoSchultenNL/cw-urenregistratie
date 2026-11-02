import Link from "next/link";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { dateStr } from "@/lib/dates";
import { Card, PageTitle, StatusBadge, fmtMin } from "@/components/admin/ui";

export default async function Dashboard() {
  const { tenantId } = (await getAdminSession())!;
  const today = dateStr();
  const weekAgo = dateStr(7);

  const [todayStats] = db
    .select({ n: sql<number>`count(*)`, min: sql<number>`coalesce(sum(${schema.timeEntries.minutes}),0)` })
    .from(schema.timeEntries)
    .where(and(eq(schema.timeEntries.tenantId, tenantId), eq(schema.timeEntries.date, today)))
    .all();
  const [weekStats] = db
    .select({ n: sql<number>`count(*)`, min: sql<number>`coalesce(sum(${schema.timeEntries.minutes}),0)` })
    .from(schema.timeEntries)
    .where(and(eq(schema.timeEntries.tenantId, tenantId), gte(schema.timeEntries.date, weekAgo)))
    .all();
  const [errStats] = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.timeEntries)
    .where(and(eq(schema.timeEntries.tenantId, tenantId), sql`${schema.timeEntries.status} != 'synced'`))
    .all();
  const recent = db
    .select({
      id: schema.timeEntries.id,
      date: schema.timeEntries.date,
      minutes: schema.timeEntries.minutes,
      project: schema.timeEntries.projectName,
      task: schema.timeEntries.taskName,
      status: schema.timeEntries.status,
      first: schema.employees.firstName,
      last: schema.employees.lastName,
      createdAt: schema.timeEntries.createdAt,
    })
    .from(schema.timeEntries)
    .innerJoin(schema.employees, eq(schema.employees.id, schema.timeEntries.employeeId))
    .where(eq(schema.timeEntries.tenantId, tenantId))
    .orderBy(desc(schema.timeEntries.createdAt))
    .limit(10)
    .all();

  return (
    <>
      <PageTitle>Overzicht</PageTitle>
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-slate-500">Vandaag</p>
          <p className="text-3xl font-bold">{fmtMin(todayStats.min)}</p>
          <p className="text-sm text-slate-500">{todayStats.n} boekingen</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Laatste 7 dagen</p>
          <p className="text-3xl font-bold">{fmtMin(weekStats.min)}</p>
          <p className="text-sm text-slate-500">{weekStats.n} boekingen</p>
        </Card>
        <Card className={errStats.n > 0 ? "ring-rose-300" : ""}>
          <p className="text-sm text-slate-500">Nog niet in Teamleader</p>
          <p className={`text-3xl font-bold ${errStats.n > 0 ? "text-rose-600" : ""}`}>{errStats.n}</p>
          {errStats.n > 0 && (
            <Link href="/admin/boekingen?status=open" className="text-sm text-sky-700 underline">
              Bekijken
            </Link>
          )}
        </Card>
      </div>
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Laatste boekingen</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1">Datum</th>
              <th>Medewerker</th>
              <th>Project › taak</th>
              <th className="text-right">Uren</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="py-2">{r.date}</td>
                <td>
                  {r.first} {r.last}
                </td>
                <td>
                  {r.project} › {r.task}
                </td>
                <td className="text-right tabular-nums">{fmtMin(r.minutes)}</td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-slate-400">
                  Nog geen boekingen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
