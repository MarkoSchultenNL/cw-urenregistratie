import { eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { oauthConfig } from "@/lib/teamleader/oauth";
import { isMock } from "@/lib/teamleader/client";
import { Btn, Card, Notice, PageTitle, fmtDateTime } from "@/components/admin/ui";
import { clearCacheAction, disconnectTeamleader } from "../actions";

export default async function TeamleaderPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { tenantId } = (await getAdminSession())!;
  const { ok, error } = await searchParams;
  const conn = db.select().from(schema.teamleaderConnections).where(eq(schema.teamleaderConnections.tenantId, tenantId)).get();
  const cfg = oauthConfig();
  const redirect = cfg?.redirectUri ?? `${process.env.APP_URL}/api/teamleader/callback`;

  return (
    <>
      <PageTitle>Teamleader Focus</PageTitle>
      {ok === "1" && <Notice kind="ok">Teamleader is gekoppeld en de medewerkers zijn opgehaald.</Notice>}
      {ok === "cache" && <Notice kind="ok">Cache geleegd; projecten, taken en artikelen worden opnieuw opgehaald.</Notice>}
      {error === "config" && <Notice kind="error">TEAMLEADER_CLIENT_ID en TEAMLEADER_CLIENT_SECRET ontbreken in de omgeving.</Notice>}
      {error === "state" && <Notice kind="error">De koppeling is verlopen of ongeldig. Probeer opnieuw.</Notice>}
      {error && error !== "config" && error !== "state" && <Notice kind="error">{error}</Notice>}
      {isMock() && <Notice kind="info">Testmodus staat aan (TEAMLEADER_MOCK=1): de zuil gebruikt nepdata en er wordt niets naar Teamleader gestuurd.</Notice>}

      <Card className="mb-6 max-w-2xl">
        {conn ? (
          <>
            <p className="mb-1 text-lg font-semibold text-emerald-700">Gekoppeld</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              <dt className="text-slate-500">Gekoppeld door</dt>
              <dd>{conn.connectedByEmail ?? "—"}</dd>
              <dt className="text-slate-500">Account-id</dt>
              <dd className="font-mono text-xs">{conn.accountId ?? "—"}</dd>
              <dt className="text-slate-500">Tijdzone</dt>
              <dd>{conn.timeZone ?? "—"}</dd>
              <dt className="text-slate-500">Terugboeken toegestaan tot</dt>
              <dd>{conn.historicLimitHours != null ? `${conn.historicLimitHours} uur terug` : "onbekend"}</dd>
              <dt className="text-slate-500">Tijdregistratie-modus</dt>
              <dd>{conn.timeMode === "duration" ? "uren per dag" : conn.timeMode === "timestamps" ? "met starttijd" : "wordt bij de eerste boeking bepaald"}</dd>
              <dt className="text-slate-500">Token vernieuwd</dt>
              <dd>{fmtDateTime(conn.updatedAt)}</dd>
            </dl>
            <div className="mt-4 flex gap-2">
              <a href="/api/teamleader/connect" className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold hover:bg-slate-200">
                Opnieuw koppelen
              </a>
              <form action={clearCacheAction}>
                <Btn variant="secondary">Cache legen</Btn>
              </form>
              <form action={disconnectTeamleader}>
                <Btn variant="danger">Ontkoppelen</Btn>
              </form>
            </div>
          </>
        ) : (
          <>
            <p className="mb-2 text-lg font-semibold">Nog niet gekoppeld</p>
            <p className="mb-4 text-sm text-slate-600">
              Log in met een Teamleader-gebruiker die uren voor anderen mag boeken (beheerder). De zuil boekt namens de medewerkers via deze koppeling.
            </p>
            {cfg ? (
              <a href="/api/teamleader/connect" className="inline-block rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700">
                Koppelen met Teamleader Focus
              </a>
            ) : (
              <Notice kind="error">Vul eerst TEAMLEADER_CLIENT_ID en TEAMLEADER_CLIENT_SECRET in.</Notice>
            )}
          </>
        )}
      </Card>

      <Card className="max-w-2xl text-sm">
        <h2 className="mb-2 font-semibold">OAuth-app instellen in Teamleader</h2>
        <ol className="list-decimal space-y-1 pl-5 text-slate-700">
          <li>
            Ga naar <a className="text-sky-700 underline" href="https://marketplace.focus.teamleader.eu/" target="_blank" rel="noreferrer">marketplace.focus.teamleader.eu</a> → Build → nieuwe integratie.
          </li>
          <li>
            Redirect-URI: <code className="rounded bg-slate-100 px-1">{redirect}</code>
          </li>
          <li>Scopes: users, time_tracking, projects, products.</li>
          <li>Zet de Client ID en Client Secret in de omgeving van de server en herstart.</li>
        </ol>
      </Card>
    </>
  );
}
