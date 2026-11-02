# Teamleader Focus API – notities urenregistratie (zuil)

Bron: officiële OpenAPI-spec `@teamleader/focus-api-specification` v1.235.0 (nov 2026)
Base URL: https://api.focus.teamleader.eu  — alle endpoints zijn POST met JSON-body, auth = OAuth2 Bearer token.

## Kernbevinding voor een zuil
- `timers.start / timers.stop / timers.current` werken ALLEEN voor de ingelogde (token-)gebruiker. Geen `user_id`.
  → Niet bruikbaar voor een gedeelde zuil met meerdere medewerkers.
- `timeTracking.add` heeft WEL `user_id` ("To add tracked time for a different user", sinds jan 2023).
  → Zuil houdt zelf start/stop bij (lokaal of in eigen mini-backend) en boekt bij "stop" één regel via timeTracking.add met user_id.
  → Eén OAuth-koppeling (admin-account) volstaat; geen login per medewerker op de zuil.

## Endpoints
### users.list
Filter: status=active. Geeft id, first_name, last_name, teams. → Tegels met namen op startscherm.

### workTypes.list
Geeft id + name. → Keuze "wat doe je" (bv. Productie, Schoonmaak, Transport). Filter: term.

### timeTracking.add  (201 → {type:"timeTracking", id})
```json
{
  "user_id": "<uuid>",            // optioneel, voor andere gebruiker
  "work_type_id": "<uuid>",       // optioneel
  "description": "Zuil – ...",    // optioneel
  "subject": {"type":"company|contact|event|milestone|nextgenTask|ticket|todo","id":"<uuid>"}, // optioneel
  "invoiceable": false,
  // één van drie varianten:
  "started_at": "2026-11-02T08:00:00+01:00", "duration": 3600          // sec
  // of: "started_at" + "ended_at"
  // of: "started_on":"2026-11-02" + "duration" (alleen als 'duration time tracking' aan staat)
}
```
Koppeling aan project: subject type `nextgenTask` (projects-v2 taak) of `milestone` (oude projecten). Projecten zelf kunnen niet direct als subject.

### timeTracking.list
Filter: user_id, started_after, started_before, ended_after, ended_before, subject, subject_types, relates_to (milestone/project/nextgenProject/nextgenProjectGroup). Sort: starts_on. Page: size/number. includes: materials,relates_to
→ Voor "wat heb ik vandaag al geboekt" per gebruiker en voor controle door coördinator.

### timeTracking.update
Verplicht: id, duration, + started_at óf started_on. Optioneel: work_type_id, description, subject, invoiceable.
### timeTracking.delete  { id }
### timeTracking.info    { id }

### Projecten/taken (indien nodig als subject)
- projects-v2/projects.list, projects-v2/tasks.list (subject type nextgenTask)
- oude: projects.list, milestones (subject type milestone)
- accounts.projects-v2-status → welke projectmodule het account gebruikt

## OAuth2 scopes (vermoedelijk nodig)
users, time_tracking, projects (alleen bij projectkoppeling), companies/contacts (alleen bij klantkoppeling).
Authorize: https://focus.teamleader.eu/oauth2/authorize · Token: https://focus.teamleader.eu/oauth2/access_token
Access token ~1 uur geldig, refresh token eenmalig bruikbaar → refresh-flow in backend, niet in de browser.

## Consequentie architectuur
Zuil-frontend (touch, grote tegels) → kleine backend (token-opslag + refresh, lopende "stempels" per medewerker, retry bij netwerkuitval) → Teamleader.
Zonder backend lekt het admin-token naar de browser op de zuil; afgeraden.
