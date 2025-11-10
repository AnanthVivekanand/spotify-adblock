@echo off
if not "%minimized%"=="" goto :minimized
set minimized=true

start /min node %USERPROFILE%\spotify-adblock-macos\mitm.js
start  %APPDATA%\Spotify\Spotify.exe

:RUN
tasklist /FI "IMAGENAME eq Spotify.exe" 2>NUL | find /I /N "Spotify.exe">NUL 
if "%ERRORLEVEL%"=="0" goto ACTIVE

:DEAD
taskkill /f /im node.exe
exit

:ACTIVE
@timeout /T 2>NUL
goto RUN

goto :EOF
:minimized