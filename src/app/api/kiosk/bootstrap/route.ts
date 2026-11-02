import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withDevice } from "@/lib/kiosk-api";
import { getSettings } from "@/lib/settings";

/** Startgegevens voor de zuil: medewerkers + instellingen. */
export async function GET() {
  return withDevice(async ({ tenantId }) => {
    const employees = db
      .select({
        id: schema.employees.id,
        firstName: schema.employees.firstName,
        lastName: schema.employees.lastName,
        hasPin: schema.employees.pinHash,
      })
      .from(schema.employees)
      .where(and(eq(schema.employees.tenantId, tenantId), eq(schema.employees.visible, true), eq(schema.employees.tlStatus, "active")))
      .orderBy(asc(schema.employees.sortOrder), asc(schema.employees.firstName))
      .all()
      .map((e) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName, hasPin: !!e.hasPin }));
    const s = getSettings(tenantId);
    return {
      employees,
      settings: {
        materialsEnabled: s.materialsEnabled,
        descriptionRequired: s.descriptionRequired,
        idleResetSeconds: s.idleResetSeconds,
        stepMinutes: s.stepMinutes,
        maxHoursPerEntry: s.maxHoursPerEntry,
      },
    };
  });
}
