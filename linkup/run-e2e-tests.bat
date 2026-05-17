@echo off
echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║       LinkUp — Lobby Admission E2E Automation Test              ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.
echo Prerequisites:
echo   1. npm run dev  must be running on http://localhost:3000
echo   2. MongoDB must be accessible
echo.

:: Check if dev server is running
curl -s -o nul -w "%%{http_code}" http://localhost:3000 | findstr "200 301 302 307" > nul
if %ERRORLEVEL% NEQ 0 (
  echo ⚠️  Next.js dev server is NOT running on localhost:3000!
  echo     Please run `npm run dev` in another terminal first.
  echo.
  pause
  exit /b 1
)

echo ✅ Dev server is reachable on localhost:3000
echo.
echo ▶  Starting Playwright E2E tests (HEADED mode — you can watch!)...
echo.

npx playwright test --headed --reporter=list

echo.
echo ✅ Tests complete! Check e2e-screenshots\ for visual proof.
echo ✅ Full HTML report: npx playwright show-report e2e-report
echo.
pause
