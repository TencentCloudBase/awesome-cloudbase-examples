# CMS Scaffold - CloudBase Evaluation Template

> ⚠️ 这是一个**评测用模板项目**，不是完整的应用。

## 用途

作为 [CloudBase AI Coding Evaluation Set](https://github.com/TencentCloudBase/CloudBase-AI-Coding-Evaluation-Set) 的前端壳子模板，用于评测 AI agent 接入 CloudBase JS SDK 的能力。

## 项目现状

- ✅ 已有完整的后台页面壳子（登录页、文章列表页、文章编辑页）
- ✅ 页面路由、表单字段、按钮位置已经固定
- ✅ 所有控件都有稳定的 `data-testid`
- ❌ 所有与后端交互的 TODO 逻辑还没有实现

## 需要 Agent 完成的工作

1. 安装并初始化 `@cloudbase/js-sdk`（在 `src/lib/cloudbase.ts`）
2. 实现用户名密码登录（在 `src/lib/auth.ts`）
3. 实现文章 CRUD（在 `src/lib/cms-service.ts`）
4. 实现封面图上传（在 `src/lib/storage-service.ts`）
5. 确保所有功能都能真实读写 CloudBase 后端

## 文件结构

```
src/
  lib/
    cloudbase.ts        # TODO: CloudBase SDK 初始化
    auth.ts             # TODO: 登录/登出/状态检查
    cms-service.ts      # TODO: 文章 CRUD
    storage-service.ts  # TODO: 封面图上传
  pages/
    LoginPage.tsx       # 登录页壳子（已完成）
    ArticleListPage.tsx # 列表页壳子（已完成）
    ArticleEditorPage.tsx # 编辑页壳子（已完成）
  components/
    ProtectedRoute.tsx  # 路由守卫（已完成，依赖 auth.ts）
  types.ts              # 类型定义
  App.tsx               # 路由配置
  main.tsx              # 入口
  index.css             # 样式（已完成，不要修改）
```

## 页面路由

| 路由 | 用途 | 权限 |
|------|------|------|
| `/login` | 管理员登录 | 公开 |
| `/articles` | 文章列表 | 需登录 |
| `/articles/new` | 新建文章 | 需登录 |
| `/articles/:id/edit` | 编辑文章 | 需登录 |

## 重要约束

- **必须**使用 `npm install @cloudbase/js-sdk` 安装 SDK，不能使用 CDN
- **不要**修改页面结构和 `data-testid`
- **不要**修改 `index.css` 样式文件
- **不要**修改路由配置
- 所有数据必须真实读写到 CloudBase 后端

## 本地开发

```bash
npm install
npm run dev
```
