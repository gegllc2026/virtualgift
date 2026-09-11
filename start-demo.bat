@echo off
setlocal
cd /d "%~dp0"

echo.
echo === Gateway Gifting - Local Demo Start ===
echo.

if not exist "apps\api\uploads" mkdir "apps\api\uploads"

echo [1/3] Preparing database...
call pnpm --filter @gateway/api db:generate
if errorlevel 1 goto fail
call pnpm --filter @gateway/api exec prisma db push
if errorlevel 1 goto fail
call pnpm --filter @gateway/api db:seed
if errorlevel 1 goto fail

echo.
echo [2/3] Starting API, Demo, and Admin...
echo   Demo:  http://localhost:5173
echo   Admin: http://localhost:5174
echo   API:   http://localhost:3001/health
echo   Admin login external ID: admin-gateway
echo.

start "Gateway API" cmd /k "pnpm --filter @gateway/api dev"
timeout /t 4 /nobreak >nul
start "Gateway Demo" cmd /k "pnpm --filter @gateway/demo dev"
timeout /t 2 /nobreak >nul
start "Gateway Admin" cmd /k "pnpm --filter @gateway/admin dev"

echo [3/3] Launched. Open the URLs above in your browser.
echo.
goto end

:fail
echo.
echo FAILED. Check the error above, then retry.
exit /b 1

:end
endlocal
