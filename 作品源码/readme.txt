CDC健康检测 Web 系统
==================

一、项目简介
------------
本项目是一个 CDC 健康检测 Web 系统，采用 Next.js + Tailwind CSS 开发。
使用 Supabase 作为后端数据库服务。

二、文件说明
-----------
- src/          : 源代码目录
- public/       : 静态资源目录
- package.json  : 项目配置文件
- README.md     : 项目说明文档

三、安装与运行
--------------
1. 确保已安装 Node.js 18+ 和 pnpm

2. 安装依赖：
   pnpm install

3. 开发预览：
   pnpm dev
   访问 http://localhost:5000

4. 构建生产版本：
   pnpm build

5. 启动生产服务器：
   pnpm start

四、技术栈
----------
- 框架：Next.js 16 (App Router)
- UI：React 19 + Tailwind CSS + shadcn/ui
- 数据库：Supabase (PostgreSQL)
- 部署：支持 Vercel 或自建服务器

五、注意事项
------------
- 生产环境运行需要配置环境变量
- 默认端口：5000
