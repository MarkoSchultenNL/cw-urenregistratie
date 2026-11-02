import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const TL_AUTHORIZE_URL = "https://focus.teamleader.eu/oauth2/authorize";
export const TL_TOKEN_URL = "https://focus.teamleader.eu/oauth2/access_token";

export function oauthConfig() {
  const clientId = process.env.TEAMLEADER_CLIENT_ID;
  const clientSecret = process.env.TEAMLEADER_CLIENT_SECRET;
  const redirectUri = process.env.TEAMLEADER_REDIRECT_URI ?? `${process.env.APP_URL}/api/teamleader/callback`;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

export function buildAuthorizeUrl(state: string) {
  const cfg = oauthConfig();
  if (!cfg) throw new Error("TEAMLEADER_CLIENT_ID/SECRET ontbreken");
  const u = new URL(TL_AUTHORIZE_URL);
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const cfg = oauthConfig();
  if (!cfg) throw new Error("TEAMLEADER_CLIENT_ID/SECRET ontbreken");
  const res = await fetch(TL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: cfg.clientId, client_secret: cfg.clientSecret, ...params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token-aanvraag mislukt (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function exchangeCode(code: string) {
  const cfg = oauthConfig()!;
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: cfg.redirectUri });
}

export async function refreshTokens(refreshToken: string) {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

/** Haalt een geldig access token op; ververst indien nodig (met marge van 2 min). */
export async function getValidAccessToken(tenantId: string): Promise<string | null> {
  const conn = db.select().from(schema.teamleaderConnections).where(eq(schema.teamleaderConnections.tenantId, tenantId)).get();
  if (!conn) return null;
  if (conn.expiresAt - Date.now() > 2 * 60 * 1000) return conn.accessToken;

  const t = await refreshTokens(conn.refreshToken);
  db.update(schema.teamleaderConnections)
    .set({
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: Date.now() + t.expires_in * 1000,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.teamleaderConnections.tenantId, tenantId))
    .run();
  return t.access_token;
}
