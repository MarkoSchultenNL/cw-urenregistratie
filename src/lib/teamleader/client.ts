import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getValidAccessToken } from "./oauth";
import { NotConnectedError, TeamleaderError } from "./types";
import type { TlCustomFieldDefinition, TlCustomFieldValue, TlMe, TlProduct, TlProject, TlTask, TlUser } from "./types";
import { mockApi } from "./mock";

const API_BASE = "https://api.focus.teamleader.eu";
const PAGE_SIZE = 100;

export const isMock = () => process.env.TEAMLEADER_MOCK === "1";

/** Kleine in-memory cache zodat de zuil niet bij elke tik de API raakt. */
const cache = new Map<string, { until: number; value: unknown }>();
function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return Promise.resolve(hit.value as T);
  return fn().then((v) => {
    cache.set(key, { until: Date.now() + ttlMs, value: v });
    return v;
  });
}
export function clearCache(tenantId?: string) {
  for (const k of cache.keys()) if (!tenantId || k.startsWith(tenantId + ":")) cache.delete(k);
}

async function call<T = unknown>(tenantId: string, endpoint: string, body: unknown = {}): Promise<T> {
  const token = await getValidAccessToken(tenantId);
  if (!token) throw new NotConnectedError();
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    /* geen json */
  }
  if (!res.ok) {
    const msg =
      (json as { errors?: { title?: string }[] })?.errors?.map((e) => e.title).join("; ") || text || res.statusText;
    throw new TeamleaderError(`${endpoint} → ${res.status}: ${msg}`, res.status, json);
  }
  return json as T;
}

async function listAll<T>(tenantId: string, endpoint: string, body: Record<string, unknown>): Promise<T[]> {
  const out: T[] = [];
  for (let number = 1; number < 50; number++) {
    const r = await call<{ data: T[] }>(tenantId, endpoint, { ...body, page: { size: PAGE_SIZE, number } });
    out.push(...r.data);
    if (r.data.length < PAGE_SIZE) break;
  }
  return out;
}

/* ---------- Publieke functies ---------- */

export async function me(tenantId: string): Promise<TlMe> {
  if (isMock()) return mockApi.me();
  type R = {
    data: {
      id: string;
      account: { id: string };
      email: string;
      time_zone: string;
      preferences?: { historic_time_tracking_limit?: { unit: string; value: number } | null };
    };
  };
  const r = await call<R>(tenantId, "users.me");
  const lim = r.data.preferences?.historic_time_tracking_limit ?? null;
  return {
    id: r.data.id,
    accountId: r.data.account.id,
    email: r.data.email,
    timeZone: r.data.time_zone,
    historicLimitHours: lim ? (lim.unit === "day" ? lim.value * 24 : lim.value) : null,
  };
}

export async function listUsers(tenantId: string): Promise<TlUser[]> {
  if (isMock()) return mockApi.users();
  return listAll<TlUser>(tenantId, "users.list", { filter: { status: ["active"] } });
}

export function listProjects(tenantId: string): Promise<TlProject[]> {
  return cached(`${tenantId}:projects`, 60_000, async () => {
    if (isMock()) return mockApi.projects();
    type Row = { id: string; title: string; project_key: number; status: "open" | "closed" };
    const rows = await listAll<Row>(tenantId, "projects-v2/projects.list", { filter: { status: "open" } });
    return rows
      .map((p) => ({ id: p.id, title: p.title, project_key: p.project_key, status: p.status }))
      .sort((a, b) => a.title.localeCompare(b.title, "nl"));
  });
}

export function listTasks(tenantId: string, projectId: string): Promise<TlTask[]> {
  return cached(`${tenantId}:tasks:${projectId}`, 60_000, async () => {
    if (isMock()) return mockApi.tasks(projectId);
    // Taken hebben geen project-filter; via de projectregels.
    type Line = { line: { type: string; id: string } };
    const lines = await listAll<Line>(tenantId, "projects-v2/projectLines.list", {
      project_id: projectId,
      filter: { types: ["nextgenTask"] },
    });
    const ids = lines.map((l) => l.line.id);
    if (ids.length === 0) return [];
    type Row = {
      id: string;
      title: string;
      project: { id: string };
      status: TlTask["status"];
      work_type: { id: string } | null;
    };
    const tasks: Row[] = [];
    for (let i = 0; i < ids.length; i += PAGE_SIZE) {
      const r = await call<{ data: Row[] }>(tenantId, "projects-v2/tasks.list", {
        filter: { ids: ids.slice(i, i + PAGE_SIZE) },
        page: { size: PAGE_SIZE, number: 1 },
      });
      tasks.push(...r.data);
    }
    // Volgorde van de projectregels aanhouden, afgeronde taken achteraan.
    const order = new Map(ids.map((id, i) => [id, i]));
    return tasks
      .map((t) => ({ id: t.id, title: t.title, projectId: t.project.id, status: t.status, workTypeId: t.work_type?.id ?? null }))
      .sort((a, b) => (a.status === "done") === (b.status === "done") ? order.get(a.id)! - order.get(b.id)! : a.status === "done" ? 1 : -1);
  });
}

/** Alle artikelen (optioneel alleen gewijzigd sinds), zonder custom fields. */
export async function listProducts(tenantId: string, updatedSince?: string): Promise<TlProduct[]> {
  if (isMock()) return mockApi.products(updatedSince);
  type Row = { id: string; name: string | null; code: string | null; unit: { id: string } | null; updated_at?: string };
  const filter: Record<string, unknown> = {};
  if (updatedSince) filter.updated_since = updatedSince;
  const rows = await listAll<Row>(tenantId, "products.list", { filter });
  return rows.map((p) => ({ id: p.id, name: p.name ?? p.code ?? "(naamloos)", code: p.code, unitId: p.unit?.id ?? null, updatedAt: p.updated_at ?? null }));
}

/** Custom-field-waarden van één artikel (alleen via products.info beschikbaar). */
export async function productCustomFields(tenantId: string, productId: string): Promise<TlCustomFieldValue[]> {
  if (isMock()) return mockApi.productCustomFields(productId);
  type R = { data: { custom_fields?: { definition: { id: string }; value: unknown }[] } };
  const r = await call<R>(tenantId, "products.info", { id: productId });
  return (r.data.custom_fields ?? []).map((c) => ({ definitionId: c.definition.id, value: c.value }));
}

export function customFieldDefinitions(tenantId: string, context: string): Promise<TlCustomFieldDefinition[]> {
  return cached(`${tenantId}:cfd:${context}`, 10 * 60_000, async () => {
    if (isMock()) return mockApi.customFieldDefinitions(context);
    type Row = { id: string; context: string; type: string; label: string; configuration?: { options?: { id: string; value: string }[] } };
    const rows = await listAll<Row>(tenantId, "customFieldDefinitions.list", { filter: { context } });
    return rows.map((d) => ({ id: d.id, context: d.context, type: d.type, label: d.label, options: d.configuration?.options }));
  });
}

export type AddTimeInput = {
  userId: string;
  taskId: string;
  date: string; // YYYY-MM-DD
  minutes: number;
  description: string;
  workTypeId?: string | null;
  invoiceable?: boolean;
};

/**
 * Boekt tijd. Probeert eerst `started_on` (duur-modus); als het account die
 * modus niet heeft, valt hij terug op `started_at` met een vaste starttijd.
 * De gekozen modus wordt onthouden op de koppeling.
 */
export async function addTimeTracking(tenantId: string, input: AddTimeInput, startTime = "08:00"): Promise<string> {
  if (isMock()) return mockApi.addTime(input);
  const conn = db.select().from(schema.teamleaderConnections).where(eq(schema.teamleaderConnections.tenantId, tenantId)).get();
  const base = {
    user_id: input.userId,
    subject: { type: "nextgenTask", id: input.taskId },
    duration: input.minutes * 60,
    description: input.description || undefined,
    work_type_id: input.workTypeId ?? undefined,
    invoiceable: input.invoiceable ?? undefined,
  };
  const withTimestamps = () => {
    const tz = conn?.timeZone ?? "Europe/Amsterdam";
    const startedAt = localToIso(input.date, startTime, tz);
    return call<{ data: { id: string } }>(tenantId, "timeTracking.add", { ...base, started_at: startedAt });
  };
  const setMode = (mode: string) =>
    db.update(schema.teamleaderConnections).set({ timeMode: mode }).where(eq(schema.teamleaderConnections.tenantId, tenantId)).run();

  if (conn?.timeMode === "timestamps") return (await withTimestamps()).data.id;
  try {
    const r = await call<{ data: { id: string } }>(tenantId, "timeTracking.add", { ...base, started_on: input.date });
    if (conn?.timeMode !== "duration") setMode("duration");
    return r.data.id;
  } catch (e) {
    if (e instanceof TeamleaderError && e.status === 400) {
      const r = await withTimestamps();
      setMode("timestamps");
      return r.data.id;
    }
    throw e;
  }
}

export async function addMaterial(
  tenantId: string,
  input: { projectId: string; productId: string; title: string; quantity: number; unitId?: string | null },
): Promise<string> {
  if (isMock()) return mockApi.addMaterial(input);
  const r = await call<{ data: { id: string } }>(tenantId, "projects-v2/materials.create", {
    project_id: input.projectId,
    product_id: input.productId,
    title: input.title,
    quantity: input.quantity,
    unit_id: input.unitId ?? undefined,
  });
  return r.data.id;
}

/** "2026-11-02" + "08:00" in tijdzone → ISO met offset. */
function localToIso(date: string, time: string, timeZone: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  const offsetMin = (asUtc - guess) / 60000;
  const sign = offsetMin >= 0 ? "+" : "-";
  const a = Math.abs(offsetMin);
  const off = `${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
  return `${date}T${time}:00${off}`;
}
