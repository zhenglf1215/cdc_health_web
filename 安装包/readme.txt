安装包文件夹
============

本文件夹包含 CDC 健康检测 Web 系统的完整源码。

一、一键安装脚本（Windows）
--------------------------
1. 解压所有文件
2. 双击运行 install.bat
3. 自动完成依赖安装和构建
4. 访问 http://localhost:5000

二、一键安装脚本（Mac/Linux）
----------------------------
1. 解压所有文件
2. 终端运行：chmod +x install.sh && ./install.sh
3. 自动完成依赖安装和构建
4. 访问 http://localhost:5000

三、手动安装
-----------
1. 安装 Node.js 18+
2. 安装 pnpm：npm install -g pnpm
3. 安装依赖：pnpm install
4. 构建：pnpm build
5. 运行：pnpm start
6. 访问 http://localhost:5000

四、配置说明
------------
如需连接云端数据库，复制 .env.example 为 .env.local，
并填入对应的 Supabase 配置信息。

五、系统要求
-----------
- Node.js 18.0 或更高版本
- 内存：建议 4GB+
- 浏览器：Chrome、Firefox、Safari、Edge 最新版本
