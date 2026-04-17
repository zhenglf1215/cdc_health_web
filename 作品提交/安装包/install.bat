@echo off
chcp 65001 >nul
echo ====================================
echo   CDC健康检测系统 - 一键安装
echo ====================================
echo.

echo [1/3] 正在检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误：未安装 Node.js，请先安装！
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)
echo 已安装 Node.js

echo.
echo [2/3] 正在安装 pnpm...
call npm install -g pnpm >nul 2>&1
echo pnpm 安装完成

echo.
echo [3/3] 正在安装项目依赖...
call pnpm install

echo.
echo 构建完成！
echo.
echo ====================================
echo   启动开发服务器...
echo ====================================
echo.
echo 访问地址：http://localhost:5000
echo 按 Ctrl+C 停止服务器
echo.

call pnpm dev
