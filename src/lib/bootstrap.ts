import { randomUUID } from "node:crypto";
import { db, schema } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

/**
 * Eerste start: maakt de (enige) tenant en de admin-gebruiker aan op basis van
 * ADMIN_EMAIL / ADMIN_PASSWORD uit de omgeving. Idempotent.
 */
export async function ensureBootstrapped() {
  let tenant = db.select().from(schema.tenants).get();
  if (!tenant) {
    tenant = { id: randomUUID(), name: process.env.TENANT_NAME ?? "Standaard", createdAt: new Date().toISOString() };
    db.insert(schema.tenants).values(tenant).run();
  }
  const admin = db.select().from(schema.adminUsers).get();
  if (!admin) {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      console.warn("[bootstrap] ADMIN_EMAIL/ADMIN_PASSWORD niet gezet; geen admin aangemaakt");
    } else {
      db.insert(schema.adminUsers)
        .values({ id: randomUUID(), tenantId: tenant.id, email: email.toLowerCase(), passwordHash: await hashPassword(password) })
        .run();
      console.log(`[bootstrap] admin aangemaakt: ${email}`);
    }
  }
  return tenant;
}

export function defaultTenantId(): string {
  const t = db.select({ id: schema.tenants.id }).from(schema.tenants).get();
  if (!t) throw new Error("Geen tenant; bootstrap niet uitgevoerd");
  return t.id;
}
