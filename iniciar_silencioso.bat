@echo off
cd /d "%~dp0"
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%LOCALAPPDATA%\Programs\node;%APPDATA%\npm"
npm run dev
