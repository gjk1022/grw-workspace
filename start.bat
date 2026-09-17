@echo off
title GRW Watchdog
start "GRW-Watchdog" /MIN "%USERPROFILE%\.workbuddy\binaries\python\versions\3.13.12\python.exe" "%~dp0watchdog.py"
exit
