# CDC健康检测系统 - 功能清单

## 功能模块概览

### 1. 用户认证模块
| 功能 | 接口 | 状态 | 说明 |
|------|------|------|------|
| 用户注册 | POST /api/auth/register | ✅ 完整 | 支持 applicant/admin 角色 |
| 用户登录 | POST /api/auth/login | ✅ 完整 | bcryptjs 密码加密 |
| 用户登出 | POST /api/auth/logout | ✅ 完整 | 清除 Cookie |
| 获取当前用户 | GET /api/auth/me | ✅ 完整 | 从 Cookie 获取用户信息 |

### 2. CDC计算模块
| 功能 | 接口 | 状态 | 说明 |
|------|------|------|------|
| CDC综合计算 | GET /api/cdc-calculate | ✅ 完整 | 支持用户/环境双视角 |

### 3. CDC测量模块
| 功能 | 接口 | 状态 | 说明 |
|------|------|------|------|
| 测量开始 | POST /api/cdc-measure/start | ✅ 完整 | 创建 CDC 会话 |
| 测量结束 | POST /api/cdc-measure/stop | ✅ 完整 | 结束会话并计算 |
| 上传测量数据 | POST /api/cdc-measure/data | ✅ 完整 | 上传心率、体温数据 |
| 获取生命数据 | GET /api/cdc-measure/life-data | ✅ 完整 | 查询历史生命体征 |
| 上传生命数据 | POST /api/cdc-measure/life-upload | ✅ 完整 | 持续记录生命数据 |

### 4. 心率监测模块
| 功能 | 接口 | 状态 | 说明 |
|------|------|------|------|
| 上传心率 | POST /api/heart-rate/upload | ✅ 完整 | 记录单次心率 |
| 心率历史 | GET /api/heart-rate/history | ✅ 完整 | 查询心率历史 |
| 计算心率统计 | GET /api/heart-rate/calculate-stats | ✅ 完整 | AV/AD/CV/SKEW 统计 |
| 删除心率数据 | DELETE /api/heart-rate/delete-by-environment | ✅ 完整 | 按环境删除 |

### 5. 体温监测模块
| 功能 | 接口 | 状态 | 说明 |
|------|------|------|------|
| 获取体温数据 | GET /api/vital-data | ✅ 完整 | 查询体温历史 |
| 上传体温数据 | POST /api/vital-upload | ✅ 完整 | 上传体温记录 |

### 6. 环境管理模块
| 功能 | 接口 | 状态 | 说明 |
|------|------|------|------|
| 获取环境列表 | GET /api/environments | ✅ 完整 | 列出所有环境 |
| 创建环境 | POST /api/environments | ✅ 完整 | 新增工作环境 |

### 7. 用户管理模块
| 功能 | 接口 | 状态 | 说明 |
|------|------|------|------|
| 获取用户列表 | GET /api/users | ✅ 完整 | 管理员查看所有用户 |
| 获取用户统计 | GET /api/users/stats | ✅ 完整 | 用户统计数据 |
| 获取用户资料 | GET /api/profile | ✅ 完整 | 获取个人资料 |

### 8. 其他功能模块
| 功能 | 接口 | 状态 | 说明 |
|------|------|------|------|
| 天气查询 | GET /api/weather | ✅ 完整 | 获取天气预报 |
| 穿衣建议 | POST /api/clothing-advice | ✅ 完整 | 流式返回建议 |
| 最近活动 | GET /api/activity/recent | ✅ 完整 | 获取最近活动 |
| 测试数据 | GET /api/test-data | ✅ 完整 | 生成测试数据 |

## 前端页面清单
| 页面 | 路径 | 状态 | 说明 |
|------|------|------|------|
| 首页 | / | ✅ 完整 | CDC概览、用户统计 |
| 产品页 | /products | ✅ 完整 | 产品展示 |
| 登录页 | /auth | ✅ 完整 | 登录/注册 |
| 新手引导 | /guide | ✅ 完整 | 5页引导教程 |
| 求职者页面 | /applicant/* | ✅ 完整 | 完整CDC功能 |
| 管理员页面 | /admin/* | ✅ 完整 | 用户管理、统计 |

## 数据库表结构
| 表名 | 用途 | 关联 |
|------|------|------|
| users | 用户表 | 主表 |
| environments | 环境表 | 主表 |
| cdc_sessions | CDC测量会话 | → users, → environments |
| user_environment_stats | 环境统计数据 | → users |
| vital_records | 生命体征持续记录 | → users, → environments |
| vital_data | 生命体征汇总 | → users |
| heart_rate_data | 心率数据 | → users |
| clothing_advice | 穿衣建议 | → users |

## 技术栈
- **框架**: Next.js 14.2.0
- **UI**: React 18.3.1, shadcn/ui, Tailwind CSS
- **数据库**: Supabase PostgreSQL
- **图表**: Recharts
- **地图**: React-Leaflet
- **构建**: Next.js Compiler

## 环境变量
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
