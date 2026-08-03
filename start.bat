@echo off
chcp 65001 >nul
title GRW 硕博成长工作台

:: 路径配置
set ROOT=%~dp0
set PYTHON=%ROOT%backend\.venv\Scripts\python.exe
set NPM=%USERPROFILE%\.workbuddy\binaries\node\versions\22.22.2\npm.cmd

echo =====================
echo  硕博成长工作台 启动中...
echo =====================
echo.

:: 启动看门狗（自动管理前后端）
start "GRW-Watchdog" /MIN %USERPROFILE%\.workbuddy\binaries\python\versions\3.13.12\python.exe "%ROOT%watchdog.py"

echo ✅ 看门狗已启动
echo 📍 前端地址：http://localhost:5173/
echo 📍 后端地址：http://localhost:8000/
echo.
echo 浏览器将自动打开...
timeout /t 5 /nobreak >nul
start http://localhost:5173/

pause
