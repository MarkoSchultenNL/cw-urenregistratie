import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { exchangeCode } from "@/lib/teamleader/oauth";
import * as tl from "@/lib/teamleader/client";
import { syncEmployees } from "@/lib/sync";
import { syncProducts } from "@/lib/products-sync";

export async function GET(req: Request) {
  const session = await getAdminSession();
  const base = process.env.APP_URL!;
  if (!session) return NextResponse.redirect(new URL("/admin/login", base));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("cw_oauth_state")?.value;
  jar.delete("cw_oauth_state");
  if (!code || !state || state !== expected) {
    return NextResponse.redirect(new URL("/admin/teamleader?error=state", base));
  }

  try {
    const t = await exchangeCode(code);
    const row = {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: Date.now() + t.expires_in * 1000,
      updatedAt: new Date().toISOString(),
    };
    const existing = db.select().from(schema.teamleaderConnections).where(eq(schema.teamleaderConnections.tenantId, session.tenantId)).get();
    if (existing) {
      db.update(schema.teamleaderConnections).set(row).where(eq(schema.teamleaderConnections.tenantId, session.tenantId)).run();
    } else {
      db.insert(schema.teamleaderConnections).values({ tenantId: session.tenantId, ...row }).run();
    }
    // Accountgegevens ophalen en medewerkers synchroniseren
    const me = await tl.me(session.tenantId);
    db.update(schema.teamleaderConnections)
      .set({ accountId: me.accountId, connectedByEmail: me.email, timeZone: me.timeZone, historicLimitHours: me.historicLimitHours })
      .where(eq(schema.teamleaderConnections.tenantId, session.tenantId))
      .run();
    await syncEmployees(session.tenantId);
    tl.clearCache(session.tenantId);
    syncProducts(session.tenantId, { full: true }).catch((e) => console.error("[products-sync]", e));
    return NextResponse.redirect(new URL("/admin/teamleader?ok=1", base));
  } catch (e) {
    console.error("[oauth callback]", e);
    return NextResponse.redirect(new URL("/admin/teamleader?error=" + encodeURIComponent((e as Error).message), base));
  }
}
