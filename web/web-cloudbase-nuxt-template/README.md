# CloudBase Nuxt 模板

基于 Nuxt 3、Vue 3 和腾讯云开发（CloudBase）的 SSG 静态站点模板，为开发者提供了快速构建全栈应用的能力。

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)  

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效，支持AI生成全栈代码、一键部署至腾讯云开发（免服务器）、智能日志修复。

## 项目特点

- 🚀 基于 Nuxt 3，支持 SSG 静态生成
- ⚡ 使用 Vue 3 Composition API 构建现代化 UI
- 🎨 集成 Tailwind CSS 和 DaisyUI 组件库，快速构建漂亮的界面
- 📦 通过 `nuxt generate` 输出纯静态文件，可部署到任意静态托管服务
- 🎁 深度集成腾讯云开发 CloudBase，提供一站式后端云服务

## 项目架构

### 前端架构

- **框架**：Nuxt 3
- **UI 库**：Vue 3（Composition API）
- **样式**：Tailwind CSS + DaisyUI（通过 @nuxtjs/tailwindcss 模块）
- **SSG**：`nitro.preset: 'static'`，通过 `nuxt generate` 生成到 `.output/public/` 目录

### 云开发资源

本项目使用了以下腾讯云开发（CloudBase）资源：

- **身份认证**：用于用户登录和身份验证
- **云数据库**：可用于存储应用数据
- **云函数**：可用于实现业务逻辑
- **云存储**：可用于存储文件
- **静态网站托管**：用于部署前端应用

## 开始使用

### 前提条件

- 安装 Node.js (版本 20.12 或更高)
- 腾讯云开发账号 (可在[腾讯云开发官网](https://tcb.cloud.tencent.com/)注册)

### 安装依赖

```bash
npm install
```

### 配置云开发环境

1. 打开 `nuxt.config.ts` 文件
2. 将 `runtimeConfig.public.envId` 的值修改为您的云开发环境 ID
3. 或者设置环境变量 `NUXT_PUBLIC_ENV_ID=your-env-id`

### 本地开发

```bash
npm run dev
```

### 构建生产版本（SSG 静态生成）

```bash
npm run generate
```

构建结果输出到 `.output/public/` 目录。

> **说明**：构建过程会自动执行 `scripts/fix-paths.mjs`，将静态资源路径和运行时 `baseURL` 从绝对路径转换为相对路径，使构建产物可以部署到任意目录（根目录或子目录），无需额外配置。

## 部署指南

### 手动部署到云开发静态网站托管

```bash
# 1. 安装依赖
npm install

# 2. 构建 SSG 静态文件
npm run generate

# 3. 将 .output/public/ 目录上传到云开发静态托管
#    - 部署到根目录：上传 .output/public/ 内容到 /
#    - 部署到子目录：上传 .output/public/ 内容到 /your-sub-path/
#    无需修改任何配置，同一份构建产物适用于所有部署路径
```

### 通过控制台部署

1. 生成静态文件：`npm run generate`
2. 登录腾讯云开发控制台
3. 进入您的环境 -> 静态网站托管
4. 上传 `.output/public` 目录中的文件

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
├── pages/
│   └── index.vue              # 首页
├── components/
│   └── Footer.vue             # 页脚组件
├── composables/
│   └── useCloudbase.js        # 云开发组合式函数
├── plugins/
│   └── cloudbase.client.js    # 云开发客户端插件
├── scripts/
│   └── fix-paths.mjs          # 构建后路径修复脚本（绝对路径→相对路径）
├── assets/
│   └── css/
│       └── main.css           # 全局样式
├── public/                    # 静态资源
├── cloudfunctions/            # 云函数
├── rules/                     # AI 规则文件
├── app.vue                    # 根组件
├── nuxt.config.ts             # Nuxt 配置
├── tailwind.config.js         # Tailwind 配置
├── cloudbaserc.json           # CloudBase CLI 配置
└── package.json               # 项目依赖
```

## SSG 静态生成说明

本模板使用 Nuxt 3 的 `nitro.preset: 'static'` 配置，通过 `nuxt generate` 预渲染所有路由为静态文件。注意事项：

- CloudBase JS SDK 仅在客户端运行，通过 `plugins/cloudbase.client.js` 插件初始化
- 页面中使用 CloudBase 功能需在 `onMounted` 钩子中调用
- 新页面自动被 Nuxt 文件系统路由发现

### 如何添加新页面

在 `pages/` 目录下创建新的 `.vue` 文件：

```vue
<!-- pages/about.vue -->
<template>
  <div class="container mx-auto py-8">
    <h1 class="text-3xl font-bold mb-4">关于页面</h1>
    <p>这是关于页面的内容</p>
  </div>
</template>
```

## 云开发功能说明

通过 `useCloudbase` 组合式函数访问云开发服务：

```vue
<script setup>
const { app, ensureLogin } = useCloudbase()

onMounted(async () => {
  // 数据库操作
  await ensureLogin()
  const db = app.database()
  const result = await db.collection('users').get()
  await db.collection('users').add({ name: 'test' })

  // 调用云函数
  const funcResult = await app.callFunction({ name: 'getEnvInfo' })

  // 文件上传
  const uploadResult = await app.uploadFile({ cloudPath: 'test.jpg', filePath: file })
})
</script>
```

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个模板！

## 许可证

MIT
