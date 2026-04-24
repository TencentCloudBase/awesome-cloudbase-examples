# Todo Scaffold - 评测用模板

> ⚠️ 这是一个**评测用模板项目**,不是完整应用。

## 用途

作为评测系统使用的前端壳子模板,用于评测 AI agent 把固定的 React + Vite UI
接到任意后端(CloudBase 云开发 / 自建服务器 / Supabase 等)的实现质量。

## 项目现状

- ✅ 已有完整的 UI 页面(登录页、注册页、Todo 列表页)
- ✅ 页面路由、表单字段、按钮位置已经固定
- ✅ 所有交互控件都有稳定的 `data-testid`
- ❌ 所有与后端交互的 TODO 逻辑还没有实现

## Agent 需要完成的工作

1. 安装并初始化后端客户端(在 `src/lib/backend.ts`)
2. 实现用户名 + 密码注册/登录/登出(在 `src/lib/auth.ts`)
3. 实现 Todo CRUD(在 `src/lib/todo-service.ts`)
4. 确保所有功能真实读写到后端,不使用 mock/静态假数据
5. 后端层面实现数据隔离:不同用户互相看不到对方的 Todo

## 文件结构

```
src/
  lib/
    backend.ts       # TODO: 后端客户端初始化
    auth.ts          # TODO: 注册/登录/登出
    todo-service.ts  # TODO: Todo CRUD
  pages/
    LoginPage.tsx    # 登录页(已完成)
    RegisterPage.tsx # 注册页(已完成)
    TodoListPage.tsx # Todo 列表页(已完成)
  components/
    ProtectedRoute.tsx  # 路由守卫(已完成,依赖 auth.ts)
    UserContext.tsx     # 用户上下文(已完成)
  types.ts           # 类型定义
  App.tsx            # 路由配置
  main.tsx           # 入口
  index.css          # 样式
```

## 页面路由

| 路由 | 用途 | 权限 |
|------|------|------|
| `/login` | 登录 | 公开 |
| `/register` | 注册 | 公开 |
| `/todos` | Todo 列表 | 需登录 |

## data-testid 契约(评测依赖,不要修改)

**登录页** (`/login`):
- `login-account-input` / `login-password-input` / `login-submit`
- `login-error`

**注册页** (`/register`):
- `register-account-input` / `register-password-input` / `register-confirm-password-input` / `register-submit`
- `register-error` / `register-success`

**Todo 页** (`/todos`):
- `current-user-name` / `logout-button`
- `todo-new-title-input` / `todo-new-submit`
- `todos-empty`(空列表占位)
- `todo-item-{id}` / `todo-title-{id}` / `todo-checkbox-{id}` / `todo-delete-{id}`

## 重要约束

- **必须**使用 npm 安装依赖,不能用 CDN
- **不要**修改页面结构和 `data-testid`
- **不要**修改路由配置
- 用户名是普通文本标识符(例如 `alice`、`bob`),不是邮箱
- 所有数据必须真实读写到后端

## 本地开发

```bash
npm install
npm run dev
```
