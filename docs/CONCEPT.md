# CW Urenregistratie – concept (v0.1, 2 nov 2026)

Losstaand SaaS-product, installeerbaar als integratie via de Teamleader Focus Marketplace.
Doel: touchscreen-zuil waarop medewerkers met 2–3 tikken uren stempelen die in Teamleader Focus als time tracking terechtkomen.

## Drie onderdelen
1. **Zuil-app** (touch, kiosk-modus, geen toetsenbord)
   - Scherm 1: naamtegels (actieve Teamleader-users, optioneel gefilterd op team)
   - Scherm 2 (optioneel, per tenant in te stellen): werksoort- of projecttegels
   - Scherm 3: grote Start / Stop; na stop "Geboekt: 3u 42m", auto-terug naar scherm 1
   - Werkt offline-tolerant: stempels lokaal bufferen, achteraf boeken
   - Zuil koppelt zich aan een tenant via een eenmalige koppelcode uit de beheeromgeving

2. **Beheeromgeving** (admin, browser)
   - Inloggen met "Login met Teamleader" (OAuth2) → account-id uit users.me = tenant
   - Instellingen: welke users op de zuil, welke werksoorten, project/taak verplicht of niet, invoiceable standaard, afronding (bv. 5/15 min), auto-stop na X uur / einde dag
   - Zuilen beheren: koppelcode genereren, naam/locatie, status online/offline
   - Overzicht: wie staat er nu "in", dagstaat per medewerker, correcties (timeTracking.update/delete)
   - Logboek van boekingen + fouten (bv. historic_time_tracking_limit overschreden)

3. **Backend** (multi-tenant)
   - OAuth2-tokens per tenant veilig opslaan, refresh afhandelen (access ~1u, refresh eenmalig)
   - Lopende stempels per medewerker (open shift) in eigen DB
   - Bij stop → timeTracking.add met user_id, started_at, ended_at, work_type_id, subject, invoiceable
   - Cache users/workTypes/projecten; verversen via webhooks (user.deactivated, nextgenTask.*, project.*) of periodiek
   - Webhook account.deactivated/account.deleted → tenant opruimen

## Teamleader-eisen Marketplace (uit support-artikel)
- Cloudoplossing, snel te installeren; openbaar in Marketplace
- Beschrijving in Engels + één andere taal; link naar website, support-/contactpagina en supportartikel
- Support in lokale taal van de klant
- Review via Dev Portal; daarna: permanente user in testaccount voor Teamleader support, mp4-schermopname van het koppelen, akkoord Marketplace-voorwaarden
- Contact: marketplace@teamleader.eu

## API-aandachtspunten
- timers.* niet bruikbaar (alleen eigen user) → timeTracking.add met user_id
- users.me geeft `preferences.historic_time_tracking_limit` (bv. 24 uur) → beperking op hoe ver terug je mag boeken; direct na stop boeken, buffer niet te lang laten liggen
- Subject voor project alleen via nextgenTask (nieuwe projectmodule) of milestone (oude); accounts.projects-v2-status zegt welke module actief is
- Webhook-events beschikbaar: timeTracking.added/updated/deleted, user.deactivated, account.deactivated/deleted, nextgenTask.*, project.*

## Open vragen
- Productnaam / merk (CW = ?)
- Tech stack & hosting voorkeur
- Alleen aanwezigheid of ook werksoort/project per stempel?
- Pauzes: aparte knop of automatisch aftrekken?
- Prijsmodel (per zuil / per user / per account)
