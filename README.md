# AI 绘画提示词助手

输入几个模糊关键词,自动匹配你可能需要的 AI 绘画提示词。支持中文 / 拼音 / 首字母模糊搜索,可按分类二次筛选,并自带一个后台管理界面用于增删改提示词与分类。

## 🌐 在线访问

- **主页:** https://t1-nine-gules.vercel.app
- **后台管理:** https://t1-nine-gules.vercel.app/admin

## ✨ 功能

- **模糊搜索** —— 基于 Fuse.js,对标题 / 关键词 / 提示词正文 / 拼音全字段匹配
- **分类筛选** —— 搜索出结果后,显示结果中实际出现的分类,点击可进一步缩小范围
- **后台管理**(`/admin`)—— 提示词、分类的增删改
- **数据持久化** —— 本地用 SQLite 文件,生产用 Turso 云数据库,代码按环境变量自动切换

## 🛠 技术栈

- Next.js 16（App Router、Turbopack）、React 19、TypeScript
- Tailwind CSS v4
- Fuse.js（模糊搜索）+ pinyin-pro（拼音匹配）
- @libsql/client —— 本地连 SQLite 文件,生产连 Turso 云数据库

## 🚀 本地开发

```bash
npm install
npm run db:seed   # 首次运行:导入种子词库到 data/prompts.db
npm run dev
```

打开 http://localhost:3000 查看。

## ☁️ 部署

生产环境部署在 [Vercel](https://vercel.com),数据库使用 [Turso](https://turso.tech)（libSQL）。

数据层通过环境变量自动切换:

| 环境 | 数据库 | 触发条件 |
|------|--------|----------|
| 本地 | `data/prompts.db`（SQLite 文件） | 未设置 `TURSO_DATABASE_URL` |
| 生产 | Turso 云数据库 | 设置了 `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` |

在 Vercel 项目设置里配置 `TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN` 两个环境变量即可（参见 `.env.example`）。
