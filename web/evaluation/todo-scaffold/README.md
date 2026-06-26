# Todo Scaffold - 评测用模板(匿名会话版)

> ⚠️ 这是一个**评测用模板项目**,不是完整应用。

## 用途

评测 AI agent 将固定 React + Vite UI 接入不同后端(CloudBase / 自建 VM)的实现质量。
核心评测点:**匿名多会话数据隔离**——不同浏览器窗口各自拥有独立会话,互相看不到对方的 Todo。

## 项目现状

- ✅ 已有完整的 Todo 列表页(创建、勾选、删除)
- ✅ 所有控件有稳定的 `data-testid`
- ✅ 页面加载时自动调用 `ensureSession()` 建立匿名会话
- ❌ `src/lib/` 下三个文件的 TODO 逻辑还没实现

## Agent 需要完成的工作

1. 安装并初始化后端客户端(`src/lib/backend.ts`)
2. 实现匿名会话管理(`src/lib/session.ts`)——页面加载自动建立会话
3. 实现 Todo CRUD(`src/lib/todo-service.ts`)——增删改查,后端隔离
4. 确保所有数据真实读写到后端,不用 mock/静态假数据
5. 后端层面实现数据隔离:不同会话互相看不到对方的 Todo

## 文件结构

```
src/
  lib/
    backend.ts       # TODO: 后端客户端初始化
    session.ts       # TODO: 匿名会话管理
    todo-service.ts  # TODO: Todo CRUD
  pages/
    TodoListPage.tsx # Todo 列表页(已完成)
  types.ts           # 类型定义
  App.tsx            # 路由配置
  main.tsx           # 入口
  index.css          # 样式
```

## data-testid 契约(评测依赖,不要修改)

- `todos-page` — 页面容器
- `session-id` — 当前会话 ID 显示
- `session-error` — 会话初始化失败提示
- `todo-create-form` / `todo-new-title-input` / `todo-new-submit` — 创建表单
- `todos-empty` — 空列表占位
- `todos-list` — 列表容器
- `todo-item-{id}` / `todo-title-{id}` / `todo-checkbox-{id}` / `todo-delete-{id}` — 列表项

## 重要约束

- **必须**使用 npm 安装依赖,不能用 CDN
- **不要**修改页面结构和 `data-testid`
- **不要**修改路由配置
- 所有数据必须真实读写到后端

## 本地开发

```bash
npm install
npm run dev
```
