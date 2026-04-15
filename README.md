# CDC健康检测系统

这是一个基于 Next.js 16 + shadcn/ui 的全栈应用项目。

## 技术栈

- **前端框架**: Next.js 16 (App Router)
- **UI组件**: React 19 + TypeScript 5
- **样式方案**: Tailwind CSS 4 + shadcn/ui
- **数据库**: Supabase (PostgreSQL)
- **地图服务**: 高德地图 / Leaflet
- **天气API**: Open-Meteo

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

## 许可证

MIT License
