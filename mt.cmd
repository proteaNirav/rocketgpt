@echo off
call npm --prefix tools\mt-first-life run build
if errorlevel 1 exit /b %errorlevel%
node tools\mt-first-life\dist\tools\mt-first-life\src\cli.js %*
