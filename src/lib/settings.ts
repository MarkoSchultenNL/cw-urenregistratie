import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type Settings = {
  materialsEnabled: boolean;
  descriptionRequired: boolean;
  /** Vaste starttijd die gebruikt wordt als het account geen duur-registratie heeft */
  defaultStartTime: string;
  /** Terugzetten naar startscherm na n seconden zonder activiteit */
  idleResetSeconds: number;
  /** Stappen voor uren invoeren, in minuten */
  stepMinutes: number;
  maxHoursPerEntry: number;
  invoiceable: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  materialsEnabled: true,
  descriptionRequired: false,
  defaultStartTime: "08:00",
  idleResetSeconds: 90,
  stepMinutes: 15,
  maxHoursPerEntry: 12,
  invoiceable: true,
};

export function getSettings(tenantId: string): Settings {
  const rows = db.select().from(schema.settings).where(eq(schema.settings.tenantId, tenantId)).all();
  const s: Settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    const k = r.key as keyof Settings;
    if (!(k in s)) continue;
    const cur = s[k];
    (s as Record<string, unknown>)[k] = typeof cur === "boolean" ? r.value === "1" : typeof cur === "number" ? Number(r.value) : r.value;
  }
  return s;
}

export function saveSettings(tenantId: string, patch: Partial<Settings>) {
  for (const [key, v] of Object.entries(patch)) {
    const value = typeof v === "boolean" ? (v ? "1" : "0") : String(v);
    const existing = db
      .select()
      .from(schema.settings)
      .where(and(eq(schema.settings.tenantId, tenantId), eq(schema.settings.key, key)))
      .get();
    if (existing) {
      db.update(schema.settings).set({ value }).where(and(eq(schema.settings.tenantId, tenantId), eq(schema.settings.key, key))).run();
    } else {
      db.insert(schema.settings).values({ tenantId, key, value }).run();
    }
  }
}
