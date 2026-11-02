import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getAdminSession } from "@/lib/auth";
import { buildAuthorizeUrl, oauthConfig } from "@/lib/teamleader/oauth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.redirect(new URL("/admin/login", process.env.APP_URL));
  if (!oauthConfig()) {
    return NextResponse.redirect(new URL("/admin/teamleader?error=config", process.env.APP_URL));
  }
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("cw_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return NextResponse.redirect(buildAuthorizeUrl(state));
}
