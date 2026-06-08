@echo off
setlocal

cd /d "%~dp0"

set "APP_ROOT=%CD%"
set "ELECTRON_EXE=%APP_ROOT%\node_modules\electron\dist\electron.exe"
set "PORTABLE_NODE=%APP_ROOT%\.tools\node-v24.16.0-win-x64"
set "NPM_CMD=%PORTABLE_NODE%\npm.cmd"

if not exist "%ELECTRON_EXE%" (
  echo Electron runtime is missing.
  echo Expected: %ELECTRON_EXE%
  echo Run npm install or rebuild Electron before launching.
  exit /b 1
)

if not exist "%APP_ROOT%\dist\index.html" (
  if not exist "%NPM_CMD%" (
    echo Build output is missing and portable npm was not found.
    echo Expected: %NPM_CMD%
    exit /b 1
  )

  echo Build output is missing. Building StoryForge...
  set "PATH=%PORTABLE_NODE%;%PATH%"
  call "%NPM_CMD%" run build
  if errorlevel 1 exit /b 1
)

start "StoryForge AI" "%ELECTRON_EXE%" "%APP_ROOT%"
