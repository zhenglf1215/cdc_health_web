# CDC健康检测系统

这是一个基于 Next.js 14 的全栈 CDC（职业健康综合检测）应用系统。

## 技术栈

- **前端框架**: Next.js 14.2.0 (App Router)
- **UI组件**: React 18.3.1 + TypeScript 5
- **样式方案**: Tailwind CSS 3 + shadcn/ui
- **数据库**: Supabase (PostgreSQL)
- **地图服务**: Leaflet
- **天气API**: Open-Meteo
- **图表**: Recharts

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 项目结构

```
src/
├── app/                      # Next.js App Router 目录
│   ├── page.tsx             # 首页
│   ├── products/            # 产品展示页
│   ├── auth/                # 登录/注册
│   ├── guide/               # 新手引导
│   ├── applicant/           # 应用者页面
│   ├── admin/               # 管理员页面
│   └── api/                 # API接口
├── components/              # React 组件目录
│   └── ui/                  # shadcn/ui 基础组件
├── storage/                 # 数据库配置
├── hooks/                   # 自定义 React Hooks
└── styles/                  # 样式文件
```

## 环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名Key
```

## 数据库配置

1. 登录 [Supabase](https://supabase.com)
2. 创建新项目
3. 在 SQL Editor 中执行 `database/schema.sql` 脚本
4. 获取项目的 URL 和 Anon Key
5. 在 Vercel 或本地 `.env.local` 中配置环境变量

## 部署到 Vercel

1. 将代码推送到 GitHub 仓库
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 点击 Deploy

## 部署到其他平台

确保设置相同的环境变量，并使用以下命令构建：

```bash
pnpm install
pnpm build
pnpm start
```

## 功能特性

- 用户认证（注册/登录/登出）
- CDC综合健康评分计算
- 实时心率监测
- 体温监测
- 环境管理
- 穿衣建议
- 天气查询
- 新手引导

## 许可证

MIT License
