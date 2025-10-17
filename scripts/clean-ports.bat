@echo off
REM OpenAero 端口清理脚本 (Windows)
REM 用于清理可能占用端口的进程，避免端口冲突

echo 🧹 开始清理端口...

REM 定义需要清理的端口列表
set PORTS=3000 3001 3002 3003 3004 3005

REM 清理函数
:clean_port
set port=%1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%port%') do (
    set pid=%%a
    if not "!pid!"=="" (
        echo 🔍 发现端口 %port% 被进程 !pid! 占用
        
        REM 检查进程名称
        for /f "tokens=1" %%b in ('tasklist /FI "PID eq !pid!" /FO CSV ^| findstr /V "PID"') do (
            set process_name=%%b
            echo 📋 进程名称: !process_name!
        )
        
        REM 尝试关闭进程
        echo 🔄 尝试关闭进程 !pid!...
        taskkill /PID !pid! /F >nul 2>&1
        
        REM 等待1秒
        timeout /t 1 /nobreak >nul
        
        REM 检查进程是否还在运行
        tasklist /FI "PID eq !pid!" 2>nul | find /I "!pid!" >nul
        if !errorlevel! equ 0 (
            echo ❌ 无法关闭进程 !pid!
        ) else (
            echo ✅ 端口 %port% 已释放
        )
    ) else (
        echo ✅ 端口 %port% 未被占用
    )
)

REM 清理所有端口
for %%p in (%PORTS%) do call :clean_port %%p

echo 🎉 端口清理完成！

REM 显示当前端口使用情况
echo.
echo 📊 当前端口使用情况:
for %%p in (%PORTS%) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p') do (
        set pid=%%a
        if not "!pid!"=="" (
            echo   ❌ 端口 %%p: 被进程 !pid! 占用
        ) else (
            echo   ✅ 端口 %%p: 空闲
        )
    )
)

pause
