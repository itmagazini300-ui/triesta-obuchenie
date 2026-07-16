@echo off
chcp 65001 >nul
title 300 Триста - Академия за обучения
cd /d "%~dp0"

echo.
echo ============================================
echo    300 ТРИСТА - Академия за обучения
echo ============================================
echo.

if not exist "node_modules\concurrently" (
  echo Първо стартиране - инсталирам необходимото...
  echo Това може да отнеме 1-2 минути.
  echo.
  call npm install
  call npm run install:all
  echo.
)

echo Стартирам приложението...
echo Отвори в браузъра:  http://localhost:5173
echo.
echo (За спиране затвори този прозорец.)
echo.

start "" http://localhost:5173
call npm run dev
pause
