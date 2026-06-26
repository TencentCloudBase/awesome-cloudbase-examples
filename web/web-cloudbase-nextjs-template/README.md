# CloudBase Next.js 模板

基于 Next.js、React 和腾讯云开发（CloudBase）的 SSG 静态站点模板，为开发者提供了快速构建全栈应用的能力。

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)  

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效，支持AI生成全栈代码、一键部署至腾讯云开发（免服务器）、智能日志修复。

## 项目特点

- 🚀 基于 Next.js 15 App Router，支持 SSG 静态导出
- ⚛️ 使用 React 19 构建现代化 UI
- 🎨 集成 Tailwind CSS 和 DaisyUI 组件库，快速构建漂亮的界面
- 📦 构建输出纯静态文件，可部署到任意静态托管服务
- 🎁 深度集成腾讯云开发 CloudBase，提供一站式后端云服务

## 项目架构

### 前端架构

- **框架**：Next.js 15（App Router）
- **UI 库**：React 19
- **样式**：Tailwind CSS + DaisyUI
- **SSG**：`output: 'export'` 静态导出到 `out/` 目录

### 云开发资源

本项目使用了以下腾讯云开发（CloudBase）资源：

- **身份认证**：用于用户登录和身份验证
- **云数据库**：可用于存储应用数据
- **云函数**：可用于实现业务逻辑
- **云存储**：可用于存储文件
- **静态网站托管**：用于部署前端应用

## 开始使用

### 前提条件

- 安装 Node.js (版本 18 或更高)
- 腾讯云开发账号 (可在[腾讯云开发官网](https://tcb.cloud.tencent.com/)注册)

### 安装依赖

```bash
npm install
```

### 配置云开发环境

1. 打开 `utils/cloudbase.js` 文件
2. 将 `ENV_ID` 变量的值修改为您的云开发环境 ID
3. 或者创建 `.env.local` 文件，设置 `NEXT_PUBLIC_ENV_ID=your-env-id`

### 本地开发

```bash
npm run dev
```

### 构建生产版本（SSG 静态导出）

```bash
npm run build
```

构建结果输出到 `out/` 目录。

> **说明**：构建过程会自动执行 `scripts/fix-paths.js`，将静态资源路径从绝对路径转换为相对路径，使构建产物可以部署到任意目录（根目录或子目录），无需额外配置。

## 部署指南

### 手动部署到云开发静态网站托管

```bash
# 1. 安装依赖
npm install

# 2. 构建 SSG 静态文件
npm run build

# 3. 将 out/ 目录上传到云开发静态托管
#    - 部署到根目录：上传 out/ 内容到 /
#    - 部署到子目录：上传 out/ 内容到 /your-sub-path/
#    无需修改任何配置，同一份构建产物适用于所有部署路径
```

### 通过控制台部署

1. 构建项目：`npm run build`
2. 登录腾讯云开发控制台
3. 进入您的环境 -> 静态网站托管
4. 上传 `out` 目录中的文件

### 使用 CloudBase CLI 部署

```bash
# 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 设置环境变量
export ENV_ID=your-env-id

# 部署
tcb framework deploy
```

## 目录结构

```
├── app/
│   ├── layout.js              # 根布局组件
│   ├── page.js                # 首页组件
│   └── globals.css            # 全局样式
├── components/
│   └── Footer.jsx             # 页脚组件
├── utils/
│   └── cloudbase.js           # 云开发配置和工具
├── scripts/
│   └── fix-paths.js           # 构建后路径修复脚本（绝对路径→相对路径）
├── public/                    # 静态资源
├── cloudfunctions/            # 云函数
├── rules/                     # AI 规则文件
├── next.config.mjs            # Next.js 配置
├── tailwind.config.js         # Tailwind 配置
├── postcss.config.js          # PostCSS 配置
├── cloudbaserc.json           # CloudBase CLI 配置
└── package.json               # 项目依赖
```

## SSG 静态导出说明

本模板使用 Next.js 的 `output: 'export'` 配置，构建时生成纯静态 HTML/CSS/JS 文件。注意事项：

- 不支持 Next.js 的服务端特性（如 API Routes、Server Components 的服务端逻辑）
- 图片优化已禁用（`images.unoptimized: true`），请使用普通 `<img>` 标签
- 页面路由使用文件系统路由（`app/` 目录）

### 如何添加新页面

在 `app/` 目录下创建新文件夹和 `page.js` 文件：

```jsx
// app/about/page.js
export default function AboutPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">关于页面</h1>
      <p>这是关于页面的内容</p>
    </div>
  )
}
```

## 云开发功能说明

通过 `utils/cloudbase.js` 访问云开发服务：

```jsx
import { app, ensureLogin } from '@/utils/cloudbase'

// 数据库操作
await ensureLogin()
const db = app.database()
const result = await db.collection('users').get()
await db.collection('users').add({ name: 'test' })

// 调用云函数
const funcResult = await app.callFunction({ name: 'getEnvInfo' })

// 文件上传
const uploadResult = await app.uploadFile({ cloudPath: 'test.jpg', filePath: file })
```

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

## 许可证

MIT
