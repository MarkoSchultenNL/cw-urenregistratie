import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { verifyPin } from "@/lib/auth";
import { withDevice } from "@/lib/kiosk-api";

// Simpele rem op pincode-raden per medewerker (in-memory).
const attempts = new Map<string, { n: number; until: number }>();

export async function POST(req: Request) {
  const { employeeId, pin } = (await req.json()) as { employeeId?: string; pin?: string };
  return withDevice(async ({ tenantId }) => {
    if (!employeeId || !pin) throw new Error("Medewerker en pincode zijn verplicht");
    const a = attempts.get(employeeId);
    if (a && a.until > Date.now()) {
      const sec = Math.ceil((a.until - Date.now()) / 1000);
      return NextResponse.json({ ok: false, error: `Te veel pogingen. Wacht ${sec} seconden.` });
    }
    const emp = db
      .select()
      .from(schema.employees)
      .where(and(eq(schema.employees.id, employeeId), eq(schema.employees.tenantId, tenantId)))
      .get();
    if (!emp) throw new Error("Medewerker niet gevonden");
    if (!emp.pinHash) return NextResponse.json({ ok: false, error: "Er is nog geen pincode ingesteld. Vraag de beheerder." });
    const ok = await verifyPin(pin, emp.pinHash);
    if (!ok) {
      const n = (a?.n ?? 0) + 1;
      attempts.set(employeeId, { n, until: n >= 5 ? Date.now() + 30_000 : 0 });
      return NextResponse.json({ ok: false, error: "Pincode klopt niet" });
    }
    attempts.delete(employeeId);
    return NextResponse.json({ ok: true, employee: { id: emp.id, firstName: emp.firstName, lastName: emp.lastName } });
  });
}
