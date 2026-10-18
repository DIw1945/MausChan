@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js LTS, then reopen this file.
  echo Installation command: winget install --id OpenJS.NodeJS.LTS
  pause
  exit /b 1
)
node tools\dev-server.mjs
if errorlevel 1 pause
