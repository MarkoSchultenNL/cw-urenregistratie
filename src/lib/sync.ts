import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "@/lib/db";
import * as tl from "@/lib/teamleader/client";
import { getSettings } from "@/lib/settings";

export type NewEntry = {
  tenantId: string;
  employeeId: string;
  deviceId?: string | null;
  date: string;
  minutes: number;
  description: string;
  project: { id: string; title: string };
  task: { id: string; title: string; workTypeId?: string | null };
  materials: { productId: string; name: string; code?: string | null; quantity: number }[];
};

/** Slaat de boeking lokaal op en probeert direct naar Teamleader te sturen. */
export async function createAndSyncEntry(input: NewEntry) {
  const id = randomUUID();
  db.insert(schema.timeEntries)
    .values({
      id,
      tenantId: input.tenantId,
      employeeId: input.employeeId,
      deviceId: input.deviceId ?? null,
      date: input.date,
      minutes: input.minutes,
      description: input.description,
      tlProjectId: input.project.id,
      projectName: input.project.title,
      tlTaskId: input.task.id,
      taskName: input.task.title,
      tlWorkTypeId: input.task.workTypeId ?? null,
    })
    .run();
  for (const m of input.materials) {
    db.insert(schema.materialUsages)
      .values({
        id: randomUUID(),
        tenantId: input.tenantId,
        timeEntryId: id,
        tlProductId: m.productId,
        productName: m.name,
        productCode: m.code ?? null,
        quantity: m.quantity,
      })
      .run();
  }
  const result = await syncEntry(id);
  return { id, ...result };
}

export async function syncEntry(entryId: string): Promise<{ status: "synced" | "error"; error?: string }> {
  const entry = db.select().from(schema.timeEntries).where(eq(schema.timeEntries.id, entryId)).get();
  if (!entry) return { status: "error", error: "Boeking niet gevonden" };
  const employee = db.select().from(schema.employees).where(eq(schema.employees.id, entry.employeeId)).get();
  if (!employee) return { status: "error", error: "Medewerker niet gevonden" };
  const settings = getSettings(entry.tenantId);
  const now = new Date().toISOString();

  // Uren
  if (!entry.tlTimeTrackingId) {
    try {
      const ttId = await tl.addTimeTracking(
        entry.tenantId,
        {
          userId: employee.tlUserId,
          taskId: entry.tlTaskId,
          date: entry.date,
          minutes: entry.minutes,
          description: entry.description,
          workTypeId: entry.tlWorkTypeId,
          invoiceable: settings.invoiceable,
        },
        settings.defaultStartTime,
      );
      db.update(schema.timeEntries).set({ tlTimeTrackingId: ttId, attempts: entry.attempts + 1 }).where(eq(schema.timeEntries.id, entryId)).run();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      db.update(schema.timeEntries)
        .set({ status: "error", error: msg, attempts: entry.attempts + 1 })
        .where(eq(schema.timeEntries.id, entryId))
        .run();
      return { status: "error", error: msg };
    }
  }

  // Materialen
  const mats = db
    .select()
    .from(schema.materialUsages)
    .where(and(eq(schema.materialUsages.timeEntryId, entryId), inArray(schema.materialUsages.status, ["pending", "error"])))
    .all();
  const errors: string[] = [];
  for (const m of mats) {
    try {
      const matId = await tl.addMaterial(entry.tenantId, {
        projectId: entry.tlProjectId,
        productId: m.tlProductId,
        title: m.productName,
        quantity: m.quantity,
      });
      db.update(schema.materialUsages).set({ tlMaterialId: matId, status: "synced", error: null }).where(eq(schema.materialUsages.id, m.id)).run();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${m.productName}: ${msg}`);
      db.update(schema.materialUsages).set({ status: "error", error: msg }).where(eq(schema.materialUsages.id, m.id)).run();
    }
  }

  if (errors.length) {
    const msg = "Uren geboekt, materiaal mislukt: " + errors.join(" | ");
    db.update(schema.timeEntries).set({ status: "error", error: msg }).where(eq(schema.timeEntries.id, entryId)).run();
    return { status: "error", error: msg };
  }
  db.update(schema.timeEntries).set({ status: "synced", error: null, syncedAt: now }).where(eq(schema.timeEntries.id, entryId)).run();
  return { status: "synced" };
}

/** Probeert alle openstaande/mislukte boekingen opnieuw. */
export async function retryPending(tenantId: string) {
  const rows = db
    .select({ id: schema.timeEntries.id })
    .from(schema.timeEntries)
    .where(and(eq(schema.timeEntries.tenantId, tenantId), inArray(schema.timeEntries.status, ["pending", "error"])))
    .all();
  let ok = 0;
  for (const r of rows) if ((await syncEntry(r.id)).status === "synced") ok++;
  return { total: rows.length, ok };
}

/** Haalt de medewerkers uit Teamleader en werkt de lokale lijst bij (pincodes blijven staan). */
export async function syncEmployees(tenantId: string) {
  const users = await tl.listUsers(tenantId);
  const existing = db.select().from(schema.employees).where(eq(schema.employees.tenantId, tenantId)).all();
  const byTl = new Map(existing.map((e) => [e.tlUserId, e]));
  const seen = new Set<string>();
  let order = existing.length;
  for (const u of users) {
    seen.add(u.id);
    const cur = byTl.get(u.id);
    if (cur) {
      db.update(schema.employees)
        .set({ firstName: u.first_name, lastName: u.last_name, email: u.email, tlStatus: "active", tlTeamIds: JSON.stringify(u.teamIds ?? []), updatedAt: new Date().toISOString() })
        .where(eq(schema.employees.id, cur.id))
        .run();
    } else {
      db.insert(schema.employees)
        .values({
          id: randomUUID(),
          tenantId,
          tlUserId: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          email: u.email,
          tlTeamIds: JSON.stringify(u.teamIds ?? []),
          visible: true,
          sortOrder: order++,
        })
        .run();
    }
  }
  for (const e of existing) {
    if (!seen.has(e.tlUserId)) {
      db.update(schema.employees).set({ tlStatus: "deactivated", visible: false }).where(eq(schema.employees.id, e.id)).run();
    }
  }
  return { count: users.length };
}
