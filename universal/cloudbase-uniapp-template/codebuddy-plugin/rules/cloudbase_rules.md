---
description: CloudBase AI 开发插件，提供 Web、小程序、云函数、CloudRun、数据库、AI 模型等全栈开发能力
alwaysApply: true
enabled: true
updatedAt: 2026-03-10T00:00:00.000Z
provider:
---

<system_reminder>

## Available Capabilities

### CloudBase Full-Stack Development
- Web 项目（React/Vue）：SDK 集成、静态托管部署、构建配置
- 微信小程序：项目结构、wx.cloud、WeChat Developer Tools
- 云函数：事件型/HTTP 型函数开发、部署、日志、触发器
- CloudRun：容器化后端服务（支持 Java/Go/Python/Node.js/PHP 等）
- NoSQL 数据库：文档数据库 CRUD、聚合、实时监听
- MySQL 数据库：关系型数据库 SQL 操作
- 云存储：文件上传、下载、临时链接管理
- 身份认证：手机号、邮箱、微信、匿名等多种登录方式
- AI 模型调用：混元、DeepSeek 文本生成、流式输出、图片生成

### Skills Available
- `cloudbase`: 涵盖上述所有能力的统一技能入口

## Core Rules

**1. MCP 工具优先**
所有 CloudBase 操作必须优先使用 MCP 工具（envQuery、uploadFiles、createFunction、manageCloudRun、executeWriteSQL 等），不要生成 CLI 命令让用户手动执行。

**2. 环境检查（每次对话第一步）**
对话历史中没有环境 ID 时，必须先调用 `envQuery`（action=info）获取当前环境，后续代码自动填入环境 ID。

**3. 新项目必须下载模板**
- Web 项目：`downloadTemplate` template=react 或 vue
- 小程序：`downloadTemplate` template=miniprogram
- UniApp：`downloadTemplate` template=uniapp
- 禁止手动创建项目文件，除非模板下载失败或用户明确要求。

**4. UI 设计强制规则**
生成任何页面、界面、组件、样式前，必须先读取 `skills/cloudbase/references/ui-design/SKILL.md`，输出设计规格（目的说明、美学方向、色板、字体、布局策略）后再写 UI 代码。

**5. 认证配置优先**
用户提到登录/注册/认证时，必须先读取 `skills/cloudbase/references/auth-tool/SKILL.md`，通过 `callCloudApi` 检查并开启所需认证方式，再实现前端认证代码。

**6. 平台限制**
原生 App（iOS/Android/Flutter/React Native）不支持 CloudBase SDK，必须改用 HTTP API，且只支持 MySQL 数据库。

## Common User Intents

- "开发一个 Web 应用" → 读取 `references/web-development/SKILL.md`
- "开发小程序" → 读取 `references/miniprogram-development/SKILL.md`
- "写一个云函数" → 读取 `references/cloud-functions/SKILL.md`
- "部署后端服务" → 读取 `references/cloudrun-development/SKILL.md`
- "用户登录/注册" → 先读取 `references/auth-tool/SKILL.md` 配置认证
- "存储数据" → NoSQL: `references/no-sql-web-sdk/SKILL.md` 或 MySQL: `references/relational-database-tool/SKILL.md`
- "上传文件" → 读取 `references/cloud-storage-web/SKILL.md`
- "接入 AI 大模型" → Web: `references/ai-model-web/SKILL.md` / Node.js: `references/ai-model-nodejs/SKILL.md` / 小程序: `references/ai-model-wechat/SKILL.md`
- "设计页面/UI" → 先读取 `references/ui-design/SKILL.md`

</system_reminder>
