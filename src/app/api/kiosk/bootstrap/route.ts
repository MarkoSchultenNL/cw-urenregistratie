import { and, asc, eq, gte, sql } from "drizzle-orm";
import { dateStr } from "@/lib/dates";
import { db, schema } from "@/lib/db";
import { withDevice } from "@/lib/kiosk-api";
import { getSettings } from "@/lib/settings";

/** Startgegevens voor de zuil: medewerkers + instellingen. */
export async function GET() {
  return withDevice(async ({ tenantId }) => {
    const rows = db
      .select({
        id: schema.employees.id,
        firstName: schema.employees.firstName,
        lastName: schema.employees.lastName,
        hasPin: schema.employees.pinHash,
        uploadUrl: schema.employees.uploadUrl,
      })
      .from(schema.employees)
      .where(and(eq(schema.employees.tenantId, tenantId), eq(schema.employees.visible, true), eq(schema.employees.tlStatus, "active")))
      .orderBy(asc(schema.employees.sortOrder), asc(schema.employees.firstName))
      .all();
    // Geschreven uren per medewerker: vandaag en deze week (ma t/m zo), incl. nog niet gesynchroniseerde boekingen
    const today = dateStr();
    const dow = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7; // 0 = maandag
    const weekStart = dateStr(dow);
    const sums = db
      .select({
        employeeId: schema.timeEntries.employeeId,
        today: sql<number>`coalesce(sum(case when ${schema.timeEntries.date} = ${today} then ${schema.timeEntries.minutes} else 0 end), 0)`,
        week: sql<number>`coalesce(sum(${schema.timeEntries.minutes}), 0)`,
      })
      .from(schema.timeEntries)
      .where(and(eq(schema.timeEntries.tenantId, tenantId), gte(schema.timeEntries.date, weekStart)))
      .groupBy(schema.timeEntries.employeeId)
      .all();
    const byEmp = new Map(sums.map((r) => [r.employeeId, r]));
    const employees = rows.map((e) => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      hasPin: !!e.hasPin,
      uploadUrl: e.uploadUrl ?? null,
      minutesToday: Number(byEmp.get(e.id)?.today ?? 0),
      minutesWeek: Number(byEmp.get(e.id)?.week ?? 0),
    }));
    const s = getSettings(tenantId);
    return {
      employees,
      settings: {
        materialsEnabled: s.materialsEnabled,
        descriptionRequired: s.descriptionRequired,
        idleResetSeconds: s.idleResetSeconds,
        stepMinutes: s.stepMinutes,
        kioskScale: s.kioskScale,
        maxHoursPerEntry: s.maxHoursPerEntry,
      },
    };
  });
}
