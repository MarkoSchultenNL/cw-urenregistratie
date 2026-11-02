@echo off
cd /d "%~dp0"
title CW Urenregistratie (dev)
if not exist node_modules (
  echo Dependencies installeren...
  call npm install --no-audit --no-fund
)
echo.
echo Beheer:  http://localhost:3000/admin
echo Zuil:    http://localhost:3000/kiosk
echo.
start "" http://localhost:3000/admin
call npm run dev
pause
