# Changelog

Versienummer staat in `package.json` ("version") en wordt rechtsonder getoond in beheer en zuil. Verhoog het bij elke uitrol (patch voor fixes, minor voor nieuwe functies).

## 0.2.1 — 2026-11-02
- Beheer: pagina Account (e-mailadres en wachtwoord van de beheerder wijzigen)

## 0.2.0 — 2026-11-02
- Zuil: vaste actiebalk onderaan met Terug/Verder op elk invoerscherm
- Zuil: "Bevestigen + nog meer uren" → direct door naar projectkeuze voor dezelfde medewerker
- Zuil: CoachWorkz-logo op elk scherm, versienummer rechtsonder
- Zuil: vaste zuil-URL met sleutel (`/kiosk?k=…`) zodat de koppeling een browser-reset overleeft
- Zuil: automatische schaling (liggend 1280 / staand 720 basis), portret-indeling
- Beheer: artikelfilter op custom field (bv. Bedrijfsentiteit = Coachworkz) met lokale artikelcache
- Beheer: foto-upload-link per medewerker, QR-stap op de zuil
- Beheer: versienummer rechtsonder

## 0.1.0 — 2026-11-02
- Eerste versie: zuil, beheer, Teamleader-koppeling, Docker/Caddy-deploy
