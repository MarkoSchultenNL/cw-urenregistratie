@echo off
title CW Urenregistratie uitrollen (GitHub + server)
cd /d C:\Users\marko\CW-Urenregistratie
echo === 1/2 Pushen naar GitHub ===
git push -u origin main
if errorlevel 1 (
  echo.
  echo PUSH MISLUKT - server wordt niet bijgewerkt.
  pause
  exit /b 1
)
echo.
echo === 2/2 Server bijwerken (typ het root-wachtwoord van de server) ===
ssh -o StrictHostKeyChecking=accept-new root@2.29.150.167 "su - deploy -c 'cd /opt/cw-urenregistratie && git fetch --depth=1 origin main && git reset --hard origin/main && git rev-parse --short HEAD > public/version.txt && docker compose up -d --build --remove-orphans && docker image prune -f >/dev/null && echo && echo KLAAR: versie $(cat public/version.txt) draait op https://uren.coachworkz.nl'"
echo.
echo Laat dit venster open tot je KLAAR ziet staan.
pause
