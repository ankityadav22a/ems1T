@echo off
title EMS Service Manager

:menu
echo ========================================
echo    EMS Backend Service Manager
echo ========================================
echo 1. Install Service
echo 2. Uninstall Service
echo 3. Start Service
echo 4. Stop Service
echo 5. Restart Service
echo 6. Check Service Status
echo 7. View Logs
echo 8. Exit
echo ========================================
set /p choice="Enter your choice: "

if "%choice%"=="1" (
    echo Installing service...
    node service.js
    goto menu
)
if "%choice%"=="2" (
    echo Uninstalling service...
    node service.js uninstall
    goto menu
)
if "%choice%"=="3" (
    echo Starting service...
    net start "EMS Backend Service"
    goto menu
)
if "%choice%"=="4" (
    echo Stopping service...
    net stop "EMS Backend Service"
    goto menu
)
if "%choice%"=="5" (
    echo Restarting service...
    net stop "EMS Backend Service"
    timeout /t 2 /nobreak >nul
    net start "EMS Backend Service"
    goto menu
)
if "%choice%"=="6" (
    sc query "EMS Backend Service"
    pause
    goto menu
)
if "%choice%"=="7" (
    if exist logs\stdout.log (
        echo === STDOUT LOG ===
        type logs\stdout.log
        echo.
        echo === STDERR LOG ===
        type logs\stderr.log
    ) else (
        echo No logs found
    )
    pause
    goto menu
)
if "%choice%"=="8" (
    exit
)
goto menu