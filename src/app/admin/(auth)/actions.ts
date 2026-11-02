"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getAdminSession, hashPin, newPairingCode } from "@/lib/auth";
import { saveSettings, type Settings } from "@/lib/settings";
import { retryPending, syncEmployees, syncEntry } from "@/lib/sync";
import * as tl from "@/lib/teamleader/client";

async function requireSession() {
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");
  return s;
}

/* ---------- Medewerkers ---------- */

export async function setPin(formData: FormData) {
  const { tenantId } = await requireSession();
  const id = String(formData.get("id"));
  const pin = String(formData.get("pin") ?? "").trim();
  if (!/^\d{4}$/.test(pin)) redirect("/admin/medewerkers?error=" + encodeURIComponent("Pincode moet uit 4 cijfers bestaan"));
  db.update(schema.employees)
    .set({ pinHash: await hashPin(pin), updatedAt: new Date().toISOString() })
    .where(and(eq(schema.employees.id, id), eq(schema.employees.tenantId, tenantId)))
    .run();
  revalidatePath("/admin/medewerkers");
  redirect("/admin/medewerkers?ok=pin");
}

export async function clearPin(formData: FormData) {
  const { tenantId } = await requireSession();
  const id = String(formData.get("id"));
  db.update(schema.employees).set({ pinHash: null }).where(and(eq(schema.employees.id, id), eq(schema.employees.tenantId, tenantId))).run();
  revalidatePath("/admin/medewerkers");
}

export async function toggleVisible(formData: FormData) {
  const { tenantId } = await requireSession();
  const id = String(formData.get("id"));
  const visible = formData.get("visible") === "1";
  db.update(schema.employees).set({ visible }).where(and(eq(schema.employees.id, id), eq(schema.employees.tenantId, tenantId))).run();
  revalidatePath("/admin/medewerkers");
}

export async function moveEmployee(formData: FormData) {
  const { tenantId } = await requireSession();
  const id = String(formData.get("id"));
  const dir = Number(formData.get("dir"));
  const all = db.select().from(schema.employees).where(eq(schema.employees.tenantId, tenantId)).orderBy(schema.employees.sortOrder).all();
  const i = all.findIndex((e) => e.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  all.forEach((e, idx) => db.update(schema.employees).set({ sortOrder: idx }).where(eq(schema.employees.id, e.id)).run());
  revalidatePath("/admin/medewerkers");
}

export async function syncEmployeesAction() {
  const { tenantId } = await requireSession();
  try {
    const r = await syncEmployees(tenantId);
    revalidatePath("/admin/medewerkers");
    redirect(`/admin/medewerkers?ok=sync&n=${r.count}`);
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    redirect("/admin/medewerkers?error=" + encodeURIComponent((e as Error).message));
  }
}

/* ---------- Zuilen ---------- */

export async function createDevice(formData: FormData) {
  const { tenantId } = await requireSession();
  const name = String(formData.get("name") ?? "").trim() || "Zuil";
  db.insert(schema.devices).values({ id: randomUUID(), tenantId, name, pairingCode: newPairingCode() }).run();
  revalidatePath("/admin/zuilen");
}

export async function regenerateCode(formData: FormData) {
  const { tenantId } = await requireSession();
  const id = String(formData.get("id"));
  db.update(schema.devices)
    .set({ pairingCode: newPairingCode(), tokenHash: null, pairedAt: null })
    .where(and(eq(schema.devices.id, id), eq(schema.devices.tenantId, tenantId)))
    .run();
  revalidatePath("/admin/zuilen");
}

export async function deleteDevice(formData: FormData) {
  const { tenantId } = await requireSession();
  const id = String(formData.get("id"));
  db.delete(schema.devices).where(and(eq(schema.devices.id, id), eq(schema.devices.tenantId, tenantId))).run();
  revalidatePath("/admin/zuilen");
}

/* ---------- Instellingen ---------- */

export async function saveSettingsAction(formData: FormData) {
  const { tenantId } = await requireSession();
  const patch: Partial<Settings> = {
    materialsEnabled: formData.get("materialsEnabled") === "on",
    descriptionRequired: formData.get("descriptionRequired") === "on",
    invoiceable: formData.get("invoiceable") === "on",
    defaultStartTime: String(formData.get("defaultStartTime") ?? "08:00"),
    idleResetSeconds: Math.max(20, Number(formData.get("idleResetSeconds") ?? 90)),
    stepMinutes: [5, 10, 15, 30, 60].includes(Number(formData.get("stepMinutes"))) ? Number(formData.get("stepMinutes")) : 15,
    maxHoursPerEntry: Math.min(24, Math.max(1, Number(formData.get("maxHoursPerEntry") ?? 12))),
  };
  saveSettings(tenantId, patch);
  revalidatePath("/admin/instellingen");
  redirect("/admin/instellingen?ok=1");
}

/* ---------- Boekingen ---------- */

export async function retryEntry(formData: FormData) {
  const { tenantId } = await requireSession();
  const id = String(formData.get("id"));
  const e = db.select().from(schema.timeEntries).where(and(eq(schema.timeEntries.id, id), eq(schema.timeEntries.tenantId, tenantId))).get();
  if (e) await syncEntry(id);
  revalidatePath("/admin/boekingen");
}

export async function retryAll() {
  const { tenantId } = await requireSession();
  const r = await retryPending(tenantId);
  revalidatePath("/admin/boekingen");
  redirect(`/admin/boekingen?retried=${r.ok}/${r.total}`);
}

export async function deleteLocalEntry(formData: FormData) {
  const { tenantId } = await requireSession();
  const id = String(formData.get("id"));
  const e = db.select().from(schema.timeEntries).where(and(eq(schema.timeEntries.id, id), eq(schema.timeEntries.tenantId, tenantId))).get();
  if (!e || e.status === "synced") return; // gesynchroniseerde boekingen verwijder je in Teamleader
  db.delete(schema.materialUsages).where(eq(schema.materialUsages.timeEntryId, id)).run();
  db.delete(schema.timeEntries).where(eq(schema.timeEntries.id, id)).run();
  revalidatePath("/admin/boekingen");
}

/* ---------- Teamleader ---------- */

export async function disconnectTeamleader() {
  const { tenantId } = await requireSession();
  db.delete(schema.teamleaderConnections).where(eq(schema.teamleaderConnections.tenantId, tenantId)).run();
  tl.clearCache(tenantId);
  revalidatePath("/admin/teamleader");
}

export async function clearCacheAction() {
  const { tenantId } = await requireSession();
  tl.clearCache(tenantId);
  revalidatePath("/admin/teamleader");
  redirect("/admin/teamleader?ok=cache");
}
