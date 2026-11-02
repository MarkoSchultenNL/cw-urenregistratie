import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Datamodel. Alles hangt onder een tenant zodat dit later als
 * multi-tenant Marketplace-integratie kan draaien. Nu: één tenant.
 */

export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const teamleaderConnections = sqliteTable("teamleader_connections", {
  tenantId: text("tenant_id").primaryKey().references(() => tenants.id),
  accountId: text("account_id"),
  connectedByEmail: text("connected_by_email"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: integer("expires_at").notNull(), // unix ms
  timeZone: text("time_zone"),
  historicLimitHours: integer("historic_limit_hours"),
  /** "duration" = started_on + duration, "timestamps" = started_at + duration; null = nog niet bepaald */
  timeMode: text("time_mode"),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const settings = sqliteTable(
  "settings",
  {
    tenantId: text("tenant_id").notNull().references(() => tenants.id),
    key: text("key").notNull(),
    value: text("value").notNull(),
  },
  (t) => [index("settings_tenant_key").on(t.tenantId, t.key)],
);

export const employees = sqliteTable(
  "employees",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().references(() => tenants.id),
    tlUserId: text("tl_user_id").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    pinHash: text("pin_hash"),
    visible: integer("visible", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    tlStatus: text("tl_status").notNull().default("active"),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("employees_tenant_user").on(t.tenantId, t.tlUserId)],
);

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  pairingCode: text("pairing_code"),
  tokenHash: text("token_hash"),
  pairedAt: text("paired_at"),
  lastSeenAt: text("last_seen_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const timeEntries = sqliteTable(
  "time_entries",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull().references(() => tenants.id),
    employeeId: text("employee_id").notNull().references(() => employees.id),
    deviceId: text("device_id"),
    date: text("date").notNull(), // YYYY-MM-DD
    minutes: integer("minutes").notNull(),
    description: text("description").notNull().default(""),
    tlProjectId: text("tl_project_id").notNull(),
    projectName: text("project_name").notNull(),
    tlTaskId: text("tl_task_id").notNull(),
    taskName: text("task_name").notNull(),
    tlWorkTypeId: text("tl_work_type_id"),
    tlTimeTrackingId: text("tl_time_tracking_id"),
    status: text("status").notNull().default("pending"), // pending | synced | error
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    syncedAt: text("synced_at"),
  },
  (t) => [
    index("time_entries_tenant_date").on(t.tenantId, t.date),
    index("time_entries_status").on(t.status),
  ],
);

export const materialUsages = sqliteTable("material_usages", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  timeEntryId: text("time_entry_id").notNull().references(() => timeEntries.id),
  tlProductId: text("tl_product_id").notNull(),
  productName: text("product_name").notNull(),
  productCode: text("product_code"),
  quantity: real("quantity").notNull(),
  tlMaterialId: text("tl_material_id"),
  status: text("status").notNull().default("pending"),
  error: text("error"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type Employee = typeof employees.$inferSelect;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type MaterialUsage = typeof materialUsages.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type TeamleaderConnection = typeof teamleaderConnections.$inferSelect;
