# CDC健康检测系统

## 项目简介

CDC健康检测系统是一个用于环境热应激风险评估的Web应用，提供环境数据管理、用户管理和健康监测功能。

## 技术栈

- **前端框架**: Next.js 16 (App Router)
- **UI组件**: React 19 + TypeScript 5
- **样式方案**: Tailwind CSS 4 + shadcn/ui
- **数据库**: Supabase (PostgreSQL)
- **地图服务**: 高德地图
- **天气API**: Open-Meteo

## 项目结构

```
cdc-source-code/
├── src/
│   ├── app/                    # 页面路由
│   │   ├── page.tsx           # 首页
│   │   ├── products/           # 产品展示页
│   │   ├── auth/              # 登录/注册
│   │   ├── guide/              # 新手引导
│   │   ├── applicant/          # 应用者页面
│   │   ├── admin/              # 管理员页面
│   │   └── api/                # API接口
│   ├── components/             # 组件
│   │   ├── ui/                # shadcn/ui组件库
│   │   └── ...                # 业务组件
│   ├── storage/                # 数据库配置
│   ├── hooks/                  # 自定义Hooks
│   ├── lib/                    # 工具函数
│   └── styles/                 # 样式文件
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

## 环境要求

- Node.js 18.x 或 20.x LTS
- pnpm 包管理器

## 安装步骤

### 1. 安装依赖

```bash
# 安装pnpm（如果没有）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名Key
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:5000

### 4. 构建生产版本

```bash
pnpm build
pnpm start
```

## 功能模块

### 应用者功能
- 用户注册/登录
- 个人CDC数据管理
- CDC测量（蓝牙/文件上传）
- 生命体征监测（心率、体温）
- 劳动代谢率计算

### 管理员功能
- 数据概览
- 用户管理
- 环境发布
- CDC数据查看

## 数据库配置

在Supabase中创建以下表：

```sql
-- 用户表
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'applicant',
  company VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 心率数据表
CREATE TABLE heart_rate_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  heart_rate INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 测试账号

- 应用者：user1 / user123
- 管理员：admin / admin123

## 部署

推荐使用 Vercel 部署：

1. 将代码推送到GitHub
2. 在Vercel创建新项目
3. 配置环境变量
4. 部署

## 许可证

MIT License
