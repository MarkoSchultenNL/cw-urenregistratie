import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET ontbreekt of is te kort (min. 16 tekens)");
  return new TextEncoder().encode(s);
};

const ADMIN_COOKIE = "cw_admin";
const DEVICE_COOKIE = "cw_device";
/** Secure-cookies alleen als de app via https draait (staging op een kaal IP draait op http). */
const SECURE = (process.env.APP_URL ?? "").startsWith("https://");

/* ---------- Admin ---------- */

export async function createAdminSession(adminId: string, tenantId: string) {
  const token = await new SignJWT({ adminId, tenantId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE,
    path: "/",
    maxAge: 12 * 3600,
  });
}

export async function destroyAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function getAdminSession(): Promise<{ adminId: string; tenantId: string } | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { adminId: payload.adminId as string, tenantId: payload.tenantId as string };
  } catch {
    return null;
  }
}

export async function verifyAdminLogin(email: string, password: string) {
  const admin = db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email.toLowerCase().trim())).get();
  if (!admin) return null;
  const ok = await bcrypt.compare(password, admin.passwordHash);
  return ok ? admin : null;
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);

/* ---------- Pincode ---------- */

export const hashPin = (pin: string) => bcrypt.hash(pin, 8);
export const verifyPin = (pin: string, hash: string | null) => (hash ? bcrypt.compare(pin, hash) : Promise.resolve(false));

/* ---------- Zuil-apparaat ---------- */

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function newPairingCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function pairDevice(code: string): Promise<{ tenantId: string; deviceId: string } | null> {
  const dev = db.select().from(schema.devices).where(eq(schema.devices.pairingCode, code)).get();
  if (!dev) return null;
  const token = randomBytes(32).toString("hex");
  db.update(schema.devices)
    .set({ tokenHash: sha(token), pairingCode: null, pairedAt: new Date().toISOString() })
    .where(eq(schema.devices.id, dev.id))
    .run();
  (await cookies()).set(DEVICE_COOKIE, `${dev.id}.${token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE,
    path: "/",
    maxAge: 10 * 365 * 24 * 3600,
  });
  return { tenantId: dev.tenantId, deviceId: dev.id };
}

export async function getDeviceSession(): Promise<{ tenantId: string; deviceId: string; name: string } | null> {
  const raw = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!raw) return null;
  const [id, token] = raw.split(".");
  if (!id || !token) return null;
  const dev = db.select().from(schema.devices).where(eq(schema.devices.id, id)).get();
  if (!dev || !dev.tokenHash || dev.tokenHash !== sha(token)) return null;
  db.update(schema.devices).set({ lastSeenAt: new Date().toISOString() }).where(eq(schema.devices.id, id)).run();
  return { tenantId: dev.tenantId, deviceId: dev.id, name: dev.name };
}

export async function unpairThisDevice() {
  (await cookies()).delete(DEVICE_COOKIE);
}
