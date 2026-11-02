import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { withDevice } from "@/lib/kiosk-api";
import { createAndSyncEntry } from "@/lib/sync";
import { getSettings } from "@/lib/settings";

const Body = z.object({
  employeeId: z.string().min(1),
  minutes: z.number().int().min(1),
  description: z.string().max(1000).default(""),
  project: z.object({ id: z.string().min(1), title: z.string().min(1) }),
  task: z.object({ id: z.string().min(1), title: z.string().min(1), workTypeId: z.string().nullable().optional() }),
  materials: z
    .array(z.object({ productId: z.string().min(1), name: z.string().min(1), code: z.string().nullable().optional(), quantity: z.number().positive() }))
    .default([]),
});

function todayIn(timeZone: string) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return p; // en-CA geeft YYYY-MM-DD
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  return withDevice(async ({ tenantId, deviceId }) => {
    if (!parsed.success) throw new Error("Ongeldige invoer: " + parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join(", "));
    const b = parsed.data;
    const s = getSettings(tenantId);
    if (b.minutes > s.maxHoursPerEntry * 60) throw new Error(`Maximaal ${s.maxHoursPerEntry} uur per boeking`);
    if (s.descriptionRequired && !b.description.trim()) throw new Error("Beschrijving is verplicht");
    if (!s.materialsEnabled) b.materials = [];
    const emp = db
      .select()
      .from(schema.employees)
      .where(and(eq(schema.employees.id, b.employeeId), eq(schema.employees.tenantId, tenantId)))
      .get();
    if (!emp) throw new Error("Medewerker niet gevonden");
    const conn = db.select().from(schema.teamleaderConnections).where(eq(schema.teamleaderConnections.tenantId, tenantId)).get();
    const date = todayIn(conn?.timeZone ?? "Europe/Amsterdam");

    const r = await createAndSyncEntry({
      tenantId,
      employeeId: emp.id,
      deviceId,
      date,
      minutes: b.minutes,
      description: b.description.trim(),
      project: b.project,
      task: b.task,
      materials: b.materials,
    });
    // Bij een fout is de boeking lokaal bewaard; de beheerder kan hem opnieuw sturen.
    return { id: r.id, status: r.status, error: r.error, date };
  });
}
