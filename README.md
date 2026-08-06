# 个人工作台

认证/培训行业专用个人工作台：合同管理、项目进度、日历备忘、文档中心。

## 功能

- **项目管理**：认证/培训/其他项目，合同号自动生成
- **合同财务**：开票、付款、分包、分期、差旅费、系统完工
- **进度跟踪**：认证项目（审核、报销、反馈、发证）、培训项目（调研、宣贯、辅导、体系文件）
- **日历**：外出、请假、审核安排
- **备忘录**：标签、置顶、关联项目
- **文档中心**：合同/认证资料/模板上传下载

## 技术栈

- Next.js 16 + TypeScript + Tailwind CSS
- Supabase (PostgreSQL + Auth + Storage)

## 快速开始

### 1. 配置 Supabase

1. 在 [Supabase](https://supabase.com) 创建项目
2. 在 SQL Editor 中执行 `supabase/migrations/001_initial_schema.sql`
3. 复制 `.env.local.example` 为 `.env.local` 并填入密钥：

```bash
cp .env.local.example .env.local
```

### 2. 启动 Web 应用

```bash
npm install
npm run dev
```

访问 http://localhost:3001 ，注册/登录后即可使用。

### 3. 部署网页

将 GitHub 仓库导入 Vercel，并配置以下环境变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

部署完成后即可通过 Vercel 提供的公网网址访问。

## 页面结构

| 路径 | 功能 |
|------|------|
| `/dashboard` | 仪表盘、待办提醒 |
| `/projects` | 项目列表与筛选 |
| `/projects/[id]` | 项目详情（财务/进度） |
| `/calendar` | 日历视图 |
| `/memos` | 备忘录 |
| `/documents` | 文档中心 |
| `/settings` | 合同号规则、云端配置 |

## 云端数据

- 网页端以 Supabase 为唯一数据源
- 项目和日程保存在 PostgreSQL
- 合同及认证资料保存在私有 Storage

## 合同号格式

默认 `ZD-年份-序号`，如 `ZD-2026-001`。可在设置页修改前缀。
