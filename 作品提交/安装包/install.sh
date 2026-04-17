#!/bin/bash

echo "===================================="
echo "  CDC健康检测系统 - 一键安装"
echo "===================================="
echo ""

echo "[1/4] 正在检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "错误：未安装 Node.js，请先安装！"
    echo "下载地址：https://nodejs.org/"
    exit 1
fi
echo "已安装 Node.js $(node --version)"

echo ""
echo "[2/4] 正在安装 pnpm..."
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
fi
echo "pnpm 安装完成"

echo ""
echo "[3/4] 正在安装项目依赖..."
pnpm install

echo ""
echo "[4/4] 构建项目..."
pnpm build

echo ""
echo "===================================="
echo "  安装完成！"
echo "===================================="
echo ""
echo "启动命令：pnpm start"
echo "访问地址：http://localhost:5000"
echo ""
