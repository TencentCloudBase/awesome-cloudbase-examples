# AI 智能客户关系管理系统 (AI-CRM)

一个完全通过**AI 编程**开发的现代化客户关系管理系统，基于 React + Vite + 腾讯云开发（CloudBase）构建，展示了 AI 辅助开发全栈应用的完整过程。

## 💻 效果演示

![AI-CRM 系统界面](https://lowcode-5ghz6bdo8b89686c-1307578329.tcloudbaseapp.com/images/ai-crm-demo.png)

## 在线体验

🌐 **正式部署地址**: [https://lowcode-5ghz6bdo8b89686c-1307578329.tcloudbaseapp.com/ai-crm/?t=1735310783](https://lowcode-5ghz6bdo8b89686c-1307578329.tcloudbaseapp.com/ai-crm/?t=1735310783)

> 💡 **体验小贴士**：系统支持完整的客户管理流程，包括客户信息管理、互动记录跟踪、数据可视化分析等功能！
>
> 🚀 **快速体验**：点击"匿名体验"按钮可直接试用系统，无需注册账号！
>
> ✅ **部署状态**：已部署到环境 `lowcode-5ghz6bdo8b89686c`，包含完整的云函数和数据库资源
>
> 📝 **说明**：这是 AI 开发的完整 CRM 应用演示。想要学习如何用 AI 开发类似应用，请参考下面的开发提示词和代码实现。

## 📝 AI 开发提示词记录

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过 AI 提示词和 MCP 协议+云开发，让开发更智能、更高效，支持 AI 生成全栈代码、一键部署至腾讯云开发（免服务器）、智能日志修复。

首先可以按照 [CloudBase AI ToolKit 快速上手指南](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/getting-started) 准备好 AI 开发环境。

以下是开发本项目时使用的完整提示词，展示了如何通过自然语言与 AI 协作完成全栈 CRM 应用开发：

<details>
<summary><strong>阶段一：项目需求描述</strong></summary>

```
我想开发一个智能客户关系管理系统(CRM)，功能要求：

1. 客户信息管理：添加、编辑、删除、搜索客户信息
2. 互动记录管理：记录与客户的各种互动（电话、邮件、会议等）
3. 跟进状态管理：跟踪客户的跟进状态和销售进度
4. 数据可视化：展示客户统计、增长趋势、行业分布等图表
5. 用户身份认证：支持用户登录和权限管理
6. 响应式设计：支持桌面和移动设备访问

请用React做前端，腾讯云开发做后端，帮我开发这个CRM系统。
```

</details>

<details>
<summary><strong>阶段二：界面设计要求</strong></summary>

```
请设计以下几个页面：

1. 登录页面：用户名密码登录
2. 控制台页面：显示关键指标和快速操作
3. 客户管理页面：客户列表、添加/编辑客户表单、搜索功能
4. 互动记录页面：互动记录列表、添加/编辑记录、筛选功能
5. 数据分析页面：各种统计图表和数据可视化

界面要求：
- 使用现代化的设计风格
- 集成 Tailwind CSS 和 DaisyUI 组件库
- 响应式设计，适配手机和电脑
- 使用 Framer Motion 添加流畅动画
- 清晰的导航和用户体验
```

</details>

<details>
<summary><strong>阶段三：数据模型设计</strong></summary>

```
请设计CRM系统的数据模型：

1. 客户信息表 (dx_customers)：
   - 基本信息：姓名、电话、邮箱、公司、职位
   - 扩展信息：地址、备注、创建时间、更新时间
   - 状态信息：跟进状态、客户来源

2. 互动记录表 (dx_interactions)：
   - 关联信息：客户ID、创建者
   - 互动内容：类型、标题、内容、时间
   - 跟进信息：当前状态、下次跟进时间
   - 元数据：创建时间、更新时间

3. 用户认证：使用云开发身份认证
4. 数据权限：确保用户只能访问自己的数据
```

</details>

<details>
<summary><strong>阶段四：云函数业务逻辑</strong></summary>

```
请实现以下云函数来处理业务逻辑：

1. dx_customer 云函数：
   - 客户信息的增删改查
   - 客户搜索和分页
   - 数据验证和权限控制

2. dx_interaction 云函数：
   - 互动记录的增删改查
   - 状态管理和更新
   - 客户状态同步

3. dx_analytics 云函数：
   - 统计数据计算
   - 图表数据生成
   - 趋势分析

每个云函数都要包含完整的错误处理和数据验证。
```

</details>

<details>
<summary><strong>阶段五：数据可视化和部署</strong></summary>

```
请完成以下功能：

1. 数据可视化：
   - 使用 Chart.js 和 react-chartjs-2
   - 实现折线图、柱状图、饼图
   - 显示客户增长趋势、行业分布、跟进状态等
   - 支持数据实时刷新

2. 系统优化：
   - 添加加载状态和错误处理
   - 实现数据分页和搜索
   - 优化移动端体验
   - 添加表单验证

3. 项目部署：
   - 配置云开发环境
   - 部署前端到静态托管
   - 部署云函数和数据库
   - 编写完整的部署文档
```

</details>

> 💡 **学习要点**：通过这些提示词可以看出，AI 开发 CRM 系统的关键是**模块化设计**，从数据模型到业务逻辑，从前端界面到后端服务，层层递进完成复杂企业应用的开发。

## 🤖 项目特色

这是一个**AI 编程实践案例**，从需求分析到完整应用，全程通过与 AI 对话完成开发：

- 🧠 **纯 AI 开发**：通过自然语言描述需求，AI 生成全部代码
- 🎯 **学习参考**：展示 AI 辅助开发企业级应用的完整 workflow 和最佳实践
- 📚 **提示词分享**：公开完整的开发提示词，供学习参考
- 🚀 **一键部署**：结合 CloudBase AI ToolKit 实现智能部署
- 💡 **最佳实践**：展示 React + CloudBase 企业应用的标准架构

## 项目特点

- � **完整 CRM 功能**：客户管理、互动跟踪、数据分析一体化解决方案
- 🎯 **智能数据分析**：实时统计图表，客户增长趋势，行业分布分析
- 🔄 **全流程跟进**：从初步接触到成交，完整的销售流程管理
- 📱 **响应式设计**：完美支持手机、平板、电脑多设备访问
- �🚀 **极速开发体验**：基于 Vite 构建，提供毫秒级热更新
- ⚛️ **现代化技术栈**：React 18 + React Router 6 + Tailwind CSS + DaisyUI
- 🎨 **优雅用户界面**：精美的 UI 设计，流畅的 Framer Motion 动画效果
- 🔐 **灵活登录方式**：支持用户名密码登录和匿名体验，满足不同使用场景
- ☁️ **免服务器部署**：深度集成腾讯云开发，一键部署到云端
- 📈 **数据可视化**：Chart.js 图表库，专业的数据展示效果

## 项目架构

### 前端架构

- **框架**：React 18
- **构建工具**：Vite
- **路由**：React Router 6（使用 HashRouter）
- **样式**：Tailwind CSS + DaisyUI
- **动画**：Framer Motion

### 云开发资源

本项目使用了以下腾讯云开发（CloudBase）资源来实现完整的 CRM 功能：

#### 1. 数据库集合

- **`dx_customers`**: 客户信息集合

  - `_id`: 客户唯一标识
  - `name`: 客户姓名
  - `phone`: 联系电话
  - `email`: 邮箱地址
  - `company`: 公司名称
  - `position`: 职位
  - `address`: 地址
  - `notes`: 备注信息
  - `status`: 跟进状态（初步接触/需求确认/方案制定/合同谈判/成交/暂停跟进）
  - `source`: 客户来源
  - `industry`: 所属行业
  - `createdAt`: 创建时间
  - `updatedAt`: 更新时间
  - `createdBy`: 创建者 ID

- **`dx_interactions`**: 互动记录集合
  - `_id`: 记录唯一标识
  - `customerId`: 关联客户 ID
  - `type`: 互动类型（电话/邮件/会议/其他）
  - `title`: 互动标题
  - `content`: 互动内容
  - `status`: 跟进状态
  - `nextFollowUp`: 下次跟进时间
  - `interactionDate`: 互动时间
  - `createdAt`: 创建时间
  - `updatedAt`: 更新时间
  - `createdBy`: 创建者 ID

#### 2. 云函数

- **`dx_customer`**: 客户管理云函数

  - 客户信息的增删改查 (create/read/update/delete)
  - 客户搜索和分页 (search/pagination)
  - 数据验证和权限控制
  - 客户状态统计

- **`dx_interaction`**: 互动记录管理云函数

  - 互动记录的增删改查
  - 跟进状态管理和更新
  - 客户状态同步更新
  - 互动记录筛选和分页

- **`dx_analytics`**: 数据分析云函数
  - 客户统计数据计算
  - 增长趋势分析
  - 行业分布统计
  - 互动类型统计
  - 跟进状态分布
  - 图表数据生成

#### 3. 身份认证

- **用户名密码登录**：支持正式用户登录
- **匿名登录体验**：支持匿名用户直接体验系统功能
- **权限控制**：确保用户只能访问自己的数据
- **会话管理**：自动维护登录状态

#### 4. 静态网站托管

- **部署路径**: `/ai-crm`（可自定义）
- **访问域名**: `lowcode-5ghz6bdo8b89686c-1307578329.tcloudbaseapp.com`
- **CDN 缓存**: 支持全球 CDN 加速

## 开始使用

### 前提条件

- 安装 Node.js (版本 16 或更高)
- 腾讯云开发账号 ([腾讯云开发官网](https://tcb.cloud.tencent.com/)注册)

### 安装依赖

```bash
npm install
```

### 配置云开发环境

**学习实践：如何配置云开发环境**

#### 1. 创建云开发环境

1. 访问 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
2. 创建新的云开发环境，选择按量计费模式
3. 记录您的环境 ID（格式类似：`your-env-id-1234567890`）

#### 2. 配置环境变量

1. 复制环境变量模板文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，设置您的云开发环境 ID：
```bash
# .env 文件内容
VITE_CLOUDBASE_ENV_ID=your-actual-env-id
```

> 💡 **获取环境ID**：登录 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb) -> 选择环境 -> 复制环境ID

#### 3. 创建数据库集合

在云开发控制台的数据库中创建以下集合：

- `dx_customers`：客户信息集合（权限建议设置为"仅创建者可读写"）
- `dx_interactions`：互动记录集合（权限建议设置为"仅创建者可读写"）

#### 4. 部署云函数

1. 确保 `cloudfunctions/` 目录下有完整的云函数代码
2. 使用云开发控制台或 CLI 部署以下云函数：
   - `dx_customer`：客户管理云函数
   - `dx_interaction`：互动记录管理云函数
   - `dx_analytics`：数据分析云函数
3. 配置云函数权限，确保可以访问数据库

#### 5. 配置静态托管域名

将 `vite.config.js` 中的域名替换为您的云开发环境静态托管默认域名：

```javascript
// 替换为您的实际域名
base: "https://your-env-id-appid.tcloudbaseapp.com/ai-crm/";
```

### 本地开发

```bash
npm run dev
```

项目将在 `http://localhost:5173` 启动

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录

> 💡 **环境变量说明**：构建时会自动读取 `.env` 文件中的环境变量。确保 `VITE_CLOUDBASE_ENV_ID` 已正确设置。

## 目录结构

```
├── public/               # 静态资源
├── src/
│   ├── components/       # 可复用组件
│   │   ├── CustomerForm.jsx       # 客户信息表单组件
│   │   ├── CustomerList.jsx       # 客户列表组件
│   │   ├── InteractionForm.jsx    # 互动记录表单组件
│   │   ├── InteractionList.jsx    # 互动记录列表组件
│   │   ├── CustomerStatusBadge.jsx # 客户状态标签组件
│   │   ├── AuthGuard.jsx          # 路由守卫组件
│   │   ├── Navbar.jsx             # 导航栏组件
│   │   └── Footer.jsx             # 页脚组件
│   ├── pages/            # 页面组件
│   │   ├── HomePage.jsx           # 首页
│   │   ├── LoginPage.jsx          # 登录页
│   │   ├── DashboardPage.jsx      # 控制台页面
│   │   ├── CustomerPage.jsx       # 客户管理页面
│   │   ├── InteractionPage.jsx    # 互动记录页面
│   │   └── AnalyticsPage.jsx      # 数据可视化页面
│   ├── utils/            # 工具函数和云开发初始化
│   │   └── cloudbase.js        # 云开发配置和工具函数
│   ├── App.jsx           # 应用入口
│   ├── main.jsx          # 渲染入口
│   └── index.css         # 全局样式
├── cloudfunctions/       # 云函数目录
│   ├── dx_customer/      # 客户管理云函数
│   │   ├── index.js      # 云函数主文件
│   │   └── package.json  # 云函数依赖配置
│   ├── dx_interaction/   # 互动记录管理云函数
│   │   ├── index.js      # 云函数主文件
│   │   └── package.json  # 云函数依赖配置
│   └── dx_analytics/     # 数据分析云函数
│       ├── index.js      # 云函数主文件
│       └── package.json  # 云函数依赖配置
├── index.html            # HTML 模板
├── tailwind.config.js    # Tailwind 配置
├── postcss.config.js     # PostCSS 配置
├── vite.config.js        # Vite 配置
├── cloudbaserc.json      # 云开发配置文件
└── package.json          # 项目依赖
```

## 功能模块

### 已实现功能

#### 1. 用户登录功能 ✅

- **用户名密码登录**：使用云开发身份认证进行正式登录
- **匿名登录体验**：支持匿名登录，用户可直接体验系统功能
- **登录状态管理**：支持登录状态检查和自动跳转
- **安全机制**：完善的登录/退出机制

#### 2. 客户管理功能 ✅

- **客户信息管理**：支持添加、编辑、删除客户信息
- **客户信息字段**：姓名、联系电话、邮箱、公司、职位、地址、备注
- **搜索功能**：支持按姓名、电话、公司进行搜索
- **分页显示**：支持大量客户数据的分页浏览
- **数据验证**：前端表单验证和后端数据校验
- **响应式设计**：适配桌面和移动设备

#### 3. 互动记录功能 ✅

- **互动记录管理**：支持添加、编辑、删除客户互动记录
- **互动类型**：支持电话、邮件、会议、其他类型的互动记录
- **跟进状态管理**：初步接触、需求确认、方案制定、合同谈判、成交、暂停跟进
- **客户状态同步**：互动记录会自动更新客户的最新跟进状态
- **筛选功能**：支持按客户、互动类型、跟进状态进行筛选
- **下次跟进提醒**：可设置下次跟进时间
- **分页显示**：支持大量互动记录的分页浏览
- **响应式设计**：适配桌面和移动设备

#### 4. 数据可视化功能 ✅

- **仪表板概览**：显示总客户数、本月新增、互动记录数、成交率等关键指标
- **客户增长趋势**：折线图展示客户数量随时间的增长趋势
- **行业分布分析**：饼图展示客户所属行业的分布情况
- **互动类型统计**：柱状图展示不同互动类型的数量分布
- **跟进状态分布**：饼图展示客户跟进状态的分布情况
- **实时数据刷新**：支持手动刷新获取最新统计数据
- **图表库集成**：使用 Chart.js 和 react-chartjs-2 实现专业图表展示
- **响应式设计**：图表自适应不同屏幕尺寸

## 开始开发

首页位于 `src/pages/HomePage.jsx`，是应用的默认入口页面。您可以根据项目需求自定义首页内容。

## 云开发功能说明

### 初始化云开发

本模板在 `src/utils/cloudbase.js` 中集中管理云开发的初始化和匿名登录功能。这个工具文件提供了云开发示例的获取/登录，调用云函数，云存储，云数据库等能力

### 重要说明

1. 在使用前请先配置环境变量：复制 `.env.example` 为 `.env`，并设置 `VITE_CLOUDBASE_ENV_ID` 为您的云开发环境 ID。
2. 本模板默认使用匿名登录，这适合快速开发和测试，但在生产环境中可能需要更严格的身份验证。
3. 所有云开发功能都通过初始化的应用实例直接调用，无需二次封装。
4. `ensureLogin` 方法会检查当前登录状态，如果已登录则返回当前登录状态，否则会进行匿名登录。
5. 匿名登录状态无法使用 `logout` 方法退出，只有其他登录方式（如微信登录、邮箱登录等）可以退出。

## 云函数 API

### dx_customer 云函数支持以下操作：

#### 1. 创建客户 (create)

创建一个新的客户记录。

```javascript
{
  action: "create",
  data: {
    name: "客户姓名",
    phone: "联系电话",
    email: "邮箱地址",
    company: "公司名称",
    position: "职位",
    address: "地址",
    notes: "备注信息",
    source: "客户来源",
    industry: "所属行业"
  }
}
```

#### 2. 获取客户列表 (list)

获取客户列表，支持分页和搜索。

```javascript
{
  action: "list",
  data: {
    page: 1,
    limit: 10,
    search: "搜索关键词" // 可选
  }
}
```

#### 3. 更新客户 (update)

更新客户信息。

```javascript
{
  action: "update",
  data: {
    id: "客户ID",
    name: "新的客户姓名",
    // 其他要更新的字段...
  }
}
```

#### 4. 删除客户 (delete)

删除客户记录。

```javascript
{
  action: "delete",
  data: {
    id: "客户ID"
  }
}
```

### dx_interaction 云函数支持以下操作：

#### 1. 创建互动记录 (create)

创建新的客户互动记录。

```javascript
{
  action: "create",
  data: {
    customerId: "客户ID",
    type: "互动类型", // 电话/邮件/会议/其他
    title: "互动标题",
    content: "互动内容",
    status: "跟进状态",
    nextFollowUp: "下次跟进时间",
    interactionDate: "互动时间"
  }
}
```

#### 2. 获取互动记录列表 (list)

获取互动记录列表，支持筛选。

```javascript
{
  action: "list",
  data: {
    page: 1,
    limit: 10,
    customerId: "客户ID", // 可选，筛选特定客户
    type: "互动类型", // 可选，筛选特定类型
    status: "跟进状态" // 可选，筛选特定状态
  }
}
```

### dx_analytics 云函数支持以下操作：

#### 1. 获取统计数据 (getStats)

获取 CRM 系统的统计数据。

```javascript
{
  action: "getStats",
  data: {
    period: "month" // 统计周期：day/week/month/year
  }
}
```

## 🚀 学习实践指南

如果您想基于此项目学习 AI 开发或搭建类似 CRM 应用：

1. **研究源码结构**：了解 React + CloudBase 企业应用的架构设计
2. **分析提示词**：学习如何与 AI 协作，逐步完成复杂业务需求
3. **实践开发**：
   - 克隆项目到本地：`git clone ...`
   - 安装依赖：`npm install`
   - 配置您的云开发环境（参考配置说明）
   - 本地运行：`npm run dev`
   - 部署测试：`npm run build` + 部署到 CloudBase

## 💡 扩展学习方向

基于本项目的技术架构，您可以学习开发：

**企业管理类应用**

- 项目管理系统 (Project Management)
- 人力资源管理系统 (HRM)
- 库存管理系统 (Inventory Management)
- 财务管理系统 (Financial Management)

**数据分析类应用**

- 销售数据分析平台
- 用户行为分析系统
- 业务报表生成系统
- 实时监控仪表板

**协作办公类应用**

- 团队协作平台
- 文档管理系统
- 任务跟踪系统
- 客服工单系统

**核心技术要点**：数据建模、业务逻辑设计、用户权限控制、数据可视化

## 后续优化建议

### CRM 功能增强

- [ ] **高级搜索**：支持多条件组合搜索和保存搜索条件
- [ ] **批量操作**：支持批量导入/导出客户数据
- [ ] **自动化跟进**：基于规则的自动跟进提醒和任务分配
- [ ] **销售漏斗**：可视化销售流程和转化率分析
- [ ] **客户标签**：灵活的标签系统，支持客户分类管理

### 用户体验优化

- [ ] **移动端优化**：针对手机端的操作体验优化
- [ ] **离线支持**：支持离线数据缓存和同步
- [ ] **多语言支持**：国际化支持，多语言界面
- [ ] **主题定制**：支持深色模式和主题切换
- [ ] **快捷键支持**：提高操作效率的键盘快捷键

### 技术升级

- [ ] **实时通知**：WebSocket 实时消息推送
- [ ] **AI 智能分析**：集成 AI 分析客户行为和预测
- [ ] **API 开放**：提供 RESTful API 供第三方集成
- [ ] **微服务架构**：拆分为微服务架构，提高可扩展性

## 开发指南

### 添加新功能

1. **数据库变更**

   - 在相应集合中添加新字段
   - 更新云函数中的数据库操作逻辑

2. **云函数更新**

   - 在相应云函数中添加新的业务逻辑
   - 更新函数配置和依赖

3. **前端开发**
   - 在 `src/components/` 中创建新组件
   - 在 `src/pages/` 中创建新页面
   - 更新路由配置（如有需要）

### 常见问题

1. **数据权限问题**

   - 检查云函数中的用户身份验证
   - 确认数据库权限配置是否正确

2. **图表显示问题**

   - 检查 Chart.js 数据格式是否正确
   - 确认图表容器尺寸设置

3. **部署问题**
   - 确保构建命令正确执行
   - 检查云开发静态托管配置
   - 验证云函数是否正常运行

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License
