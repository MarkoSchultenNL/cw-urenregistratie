# CW Urenregistratie

Urenregistratie op een touchscreen-zuil, gekoppeld aan **Teamleader Focus**.
Medewerkers tikken hun naam aan, voeren een pincode in, kiezen project → taak, vullen uren, omschrijving en verbruiksmateriaal in en bevestigen. De boeking komt als time tracking (en materiaal als projectregel) in Teamleader terecht.

Eén codebase, drie onderdelen:

| Onderdeel | URL | Voor wie |
|---|---|---|
| Zuil | `/kiosk` | medewerkers (touchscreen, kioskmodus) |
| Beheer | `/admin` | beheerder (pincodes, zuilen, instellingen, boekingen, Teamleader-koppeling) |
| API | `/api/...` | intern |

Stack: Next.js 16 · TypeScript · Drizzle ORM · SQLite · Docker + Caddy. Het datamodel heeft een tenant-laag zodat het later als Marketplace-integratie voor meerdere klanten kan draaien.

## Hoe de Teamleader-koppeling werkt

- De beheerder koppelt **één** Teamleader-account (OAuth2). De zuil boekt namens medewerkers via `timeTracking.add` met `user_id`; medewerkers hoeven zelf niet in te loggen bij Teamleader.
- Projecten en taken komen uit de nieuwe projectmodule (`projects-v2`). Uren worden geboekt op een **taak** (`subject.type = nextgenTask`).
- Verbruiksmateriaal komt uit de artikelenlijst (`products.list`) en wordt als materiaalregel op het **project** gezet (`projects-v2/materials.create`). In het beheer zie je welk materiaal bij welke boeking hoort.
- Datum is altijd vandaag. Of Teamleader "uren per dag" of "met starttijd" verwacht wordt bij de eerste boeking automatisch bepaald en onthouden.
- Mislukt het doorsturen (geen netwerk, token verlopen), dan blijft de boeking lokaal bewaard; de beheerder stuurt hem opnieuw vanuit *Boekingen*.
- Let op `historic_time_tracking_limit` in Teamleader: ouder dan die grens kan niet meer worden teruggeboekt.

## Lokaal draaien (zonder Teamleader)

```bash
npm install
cp .env.example .env     # zet TEAMLEADER_MOCK=1 en een ADMIN_PASSWORD
npm run dev
```

- Beheer: http://localhost:3000/admin (ADMIN_EMAIL / ADMIN_PASSWORD uit `.env`)
- Zuil: http://localhost:3000/kiosk → koppelcode uit *Beheer → Zuilen*

Met `TEAMLEADER_MOCK=1` worden nepmedewerkers, -projecten en -artikelen gebruikt en wordt niets naar Teamleader gestuurd.

## Teamleader OAuth-app aanmaken

1. Ga naar https://marketplace.focus.teamleader.eu → *Build* → nieuwe integratie.
2. Redirect-URI: `https://<jouw-domein>/api/teamleader/callback`
3. Scopes: `users`, `time_tracking`, `projects`, `products`.
4. Zet Client ID en Secret in `.env` (`TEAMLEADER_CLIENT_ID`, `TEAMLEADER_CLIENT_SECRET`) en zet `TEAMLEADER_MOCK=0`.
5. In het beheer: *Teamleader → Koppelen*. Log in met een beheerder die uren voor anderen mag boeken.

## Deploy op een server (Hetzner, Docker)

```bash
git clone git@github.com:MarkoSchultenNL/cw-urenregistratie.git
cd cw-urenregistratie
cp .env.example .env
nano .env     # APP_URL=https://uren.jouwdomein.nl, DOMAIN=uren.jouwdomein.nl, SESSION_SECRET, ADMIN_*, TEAMLEADER_*
docker compose up -d --build
```

Caddy regelt automatisch het HTTPS-certificaat (DNS A-record van `DOMAIN` moet naar de server wijzen; poort 80/443 open).
De database staat in het Docker-volume `cw-data` (`/data/cw.sqlite`).

Updaten:

```bash
git pull && docker compose up -d --build
```

Back-up van de database:

```bash
docker compose exec app sh -c 'cat /data/cw.sqlite' > backup-$(date +%F).sqlite
```

## Zuil inrichten

1. *Beheer → Zuilen → Zuil toevoegen*; noteer de 6-cijferige koppelcode.
2. Open op de zuil `https://<domein>/kiosk` in een browser in kioskmodus, bijvoorbeeld Chrome/Edge:
   `msedge --kiosk https://<domein>/kiosk --edge-kiosk-type=fullscreen` of `chrome --kiosk https://<domein>/kiosk`
3. Voer de koppelcode in. De koppeling blijft in die browser bewaard (cookie, 10 jaar). Wis je de browserdata, maak dan in het beheer een nieuwe code.
4. *Beheer → Medewerkers*: haal de medewerkers op uit Teamleader, zet per medewerker een pincode en verberg wie niet op de zuil hoort.

## Projectstructuur

```
src/app/kiosk            zuil-pagina
src/app/admin            beheeromgeving (server components + server actions)
src/app/api/kiosk        endpoints voor de zuil
src/app/api/teamleader   OAuth connect/callback
src/components/kiosk     zuil-UI (tegels, keypad, schermtoetsenbord)
src/lib/teamleader       API-client, OAuth, mock
src/lib/sync.ts          boeking opslaan + doorsturen + opnieuw proberen
src/lib/db               Drizzle-schema en SQLite-verbinding
drizzle/                 migraties (automatisch uitgevoerd bij start)
```

Schema wijzigen: pas `src/lib/db/schema.ts` aan en draai `npx drizzle-kit generate`.

## Later: meerdere klanten / Marketplace

Alles is al per `tenant` opgeslagen. Voor Marketplace komt er nog bij: tenant aanmaken bij OAuth-koppeling (account-id uit `users.me`), admin-login via "Login met Teamleader", webhooks (`account.deactivated`, `user.deactivated`) en Postgres i.p.v. SQLite.
