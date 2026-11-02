import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import * as tl from "@/lib/teamleader/client";
import { getSettings, saveSettings } from "@/lib/settings";
import type { TlCustomFieldDefinition } from "@/lib/teamleader/types";

const STALE_MS = 30 * 60_000;
const running = new Map<string, Promise<SyncResult>>();

export type SyncResult = { total: number; updated: number; filterFieldFound: boolean; error?: string };

/** Waarde van een custom field naar tekst (single_select kan een optie-object of -id zijn). */
function valueToText(value: unknown, def?: TlCustomFieldDefinition): string | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const s = String(value);
    const opt = def?.options?.find((o) => o.id === s);
    return opt ? opt.value : s;
  }
  if (Array.isArray(value)) return value.map((v) => valueToText(v, def)).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.value === "string") return o.value;
    if (typeof o.id === "string") {
      const opt = def?.options?.find((x) => x.id === o.id);
      return opt ? opt.value : o.id;
    }
  }
  return null;
}

/**
 * Synchroniseert de artikelen van Teamleader naar de lokale cache.
 * Incrementeel via `updated_since`; per gewijzigd artikel één products.info-call voor het custom field.
 */
export function syncProducts(tenantId: string, opts: { full?: boolean } = {}): Promise<SyncResult> {
  const key = tenantId;
  const inflight = running.get(key);
  if (inflight) return inflight;
  const p = doSync(tenantId, opts).finally(() => running.delete(key));
  running.set(key, p);
  return p;
}

async function doSync(tenantId: string, opts: { full?: boolean }): Promise<SyncResult> {
  const settings = getSettings(tenantId);
  const fieldLabel = settings.productFilterField.trim().toLowerCase();
  let def: TlCustomFieldDefinition | undefined;
  if (fieldLabel) {
    const defs = await tl.customFieldDefinitions(tenantId, "product");
    def = defs.find((d) => d.label.trim().toLowerCase() === fieldLabel);
  }

  const existing = new Map(
    db.select().from(schema.products).where(eq(schema.products.tenantId, tenantId)).all().map((r) => [r.id, r]),
  );
  const since = !opts.full && settings.productsSyncedAt && existing.size > 0 ? settings.productsSyncedAt : undefined;
  const startedAt = new Date().toISOString();

  const list = await tl.listProducts(tenantId, since);
  let updated = 0;
  for (const prod of list) {
    const cur = existing.get(prod.id);
    // Custom field alleen ophalen als er een filterveld is én het artikel nieuw/gewijzigd is
    let filterValue = cur?.filterValue ?? null;
    if (def && (opts.full || !cur || cur.tlUpdatedAt !== (prod.updatedAt ?? null))) {
      const cfs = await tl.productCustomFields(tenantId, prod.id);
      const hit = cfs.find((c) => c.definitionId === def!.id);
      filterValue = hit ? valueToText(hit.value, def)?.trim() ?? null : null;
    } else if (!def) {
      filterValue = null;
    }
    const row = {
      tenantId,
      name: prod.name,
      code: prod.code ?? null,
      unitId: prod.unitId ?? null,
      filterValue,
      tlUpdatedAt: prod.updatedAt ?? null,
      syncedAt: startedAt,
    };
    if (cur) db.update(schema.products).set(row).where(eq(schema.products.id, prod.id)).run();
    else db.insert(schema.products).values({ id: prod.id, ...row }).run();
    updated++;
  }
  // Bij een volledige sync: artikelen die niet meer bestaan verwijderen
  if (!since) {
    const ids = new Set(list.map((p) => p.id));
    for (const id of existing.keys()) if (!ids.has(id)) db.delete(schema.products).where(eq(schema.products.id, id)).run();
  }
  saveSettings(tenantId, { productsSyncedAt: startedAt });
  const total = db.select({ n: sql<number>`count(*)` }).from(schema.products).where(eq(schema.products.tenantId, tenantId)).get()?.n ?? 0;
  return { total, updated, filterFieldFound: !fieldLabel || !!def };
}

/** Gefilterde artikelen voor de zuil; synct op de achtergrond als de cache verouderd is. */
export async function kioskProducts(tenantId: string) {
  const settings = getSettings(tenantId);
  const syncedAt = settings.productsSyncedAt ? Date.parse(settings.productsSyncedAt) : 0;
  const count = db.select({ n: sql<number>`count(*)` }).from(schema.products).where(eq(schema.products.tenantId, tenantId)).get()?.n ?? 0;
  if (count === 0) {
    await syncProducts(tenantId, { full: true });
  } else if (Date.now() - syncedAt > STALE_MS) {
    syncProducts(tenantId).catch((e) => console.error("[products-sync]", e));
  }
  const want = settings.productFilterValue.trim().toLowerCase();
  const rows = want
    ? db.select().from(schema.products).where(and(eq(schema.products.tenantId, tenantId), sql`lower(${schema.products.filterValue}) = ${want}`)).all()
    : db.select().from(schema.products).where(eq(schema.products.tenantId, tenantId)).all();
  return rows
    .map((r) => ({ id: r.id, name: r.name, code: r.code, unitId: r.unitId }))
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

export function productStats(tenantId: string) {
  const settings = getSettings(tenantId);
  const total = db.select({ n: sql<number>`count(*)` }).from(schema.products).where(eq(schema.products.tenantId, tenantId)).get()?.n ?? 0;
  const want = settings.productFilterValue.trim().toLowerCase();
  const matching = want
    ? db.select({ n: sql<number>`count(*)` }).from(schema.products).where(and(eq(schema.products.tenantId, tenantId), sql`lower(${schema.products.filterValue}) = ${want}`)).get()?.n ?? 0
    : total;
  const values = db
    .select({ v: schema.products.filterValue, n: sql<number>`count(*)` })
    .from(schema.products)
    .where(eq(schema.products.tenantId, tenantId))
    .groupBy(schema.products.filterValue)
    .all();
  return { total, matching, syncedAt: settings.productsSyncedAt || null, values };
}
