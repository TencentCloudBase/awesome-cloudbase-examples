# 艺术展览预约系统

一个完全通过**AI 编程**开发的艺术展览预约管理应用，基于 React + Vite + 腾讯云开发（CloudBase）构建，展示了 AI 辅助开发全栈应用的完整过程。

## 💻 效果演示

![艺术展览预约系统](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/turbo-deploy/art-exhibition.jpg)

## 📝 AI 开发提示词记录

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)

> 本项目基于 [**CloudBase AI Builder**](https://tcb.cloud.tencent.com/dev#/ai-builder) 开发， 使用[**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 二次开发，通过 AI 提示词和 MCP 协议+云开发，让开发更智能、更高效，支持 AI 生成全栈代码、一键部署至腾讯云开发（免服务器）、智能日志修复。

1. 首先使用 [**CloudBase AI Builder**](https://tcb.cloud.tencent.com/dev#/ai-builder) 进行开发，开发预览完毕后可选择导出代码包进行二次开发
2. 二次开发时可以按照 [CloudBase AI ToolKit 快速上手指南](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/getting-started) 准备好 AI 开发环境。

以下是开发本项目时使用的完整提示词，展示了如何通过自然语言与 AI 协作完成全栈应用开发：

<details>
<summary><strong>阶段一：项目需求描述</strong></summary>

```
我想开发一个艺术展览预约系统，功能要求：

1. 用户可以浏览当前和即将举办的艺术展览
2. 查看展览详情，包括艺术品信息
3. 可以预约参观展览，填写个人信息和时间
4. 个人页面显示预约记录和状态
5. 支持艺术品搜索和收藏功能
6. 手机和电脑都能正常使用

请用React + shadcn 做前端 components/ui 中是 shadn 的组件库，帮我开发这个系统。
```

</details>

<details>
<summary><strong>阶段二：界面设计要求</strong></summary>

```
请设计以下几个页面：

1. 首页：展示热门展览和艺术品，有导航栏
2. 展览页面：展览列表，可以筛选当前和即将举办的
3. 展览详情页：展览信息、艺术品列表、预约按钮
4. 预约页面：填写预约表单（姓名、电话、邮箱、时间）
5. 个人页面：用户信息、预约记录、统计数据
6. 艺术品搜索页：搜索和筛选艺术品

界面要求：
- 设计要现代化、艺术感强
- 需要响应式设计，满足大小屏要求
- 底部导航栏方便切换页面

请用Tailwind CSS和shadcn/ui组件库来做样式。
```

</details>

<details>
<summary><strong>阶段三：数据集成和路由</strong></summary>

```
请实现数据管理和页面路由：

1. 数据结构设计，创建数据模型修改前端接入调用：
   - artworks：艺术品信息集合（标题、艺术家、描述、图片、所属展览）
   - appointments：预约记录集合（用户信息、展览ID、预约时间、状态）

2. 页面路由：
   - 使用React Router实现单页应用
   - 支持参数传递（展览ID、艺术品ID等）
   - 页面间的导航和返回功能

```

</details>

<details>
<summary><strong>阶段四：分享和部署</strong></summary>

```
请完成以下功能：

1. 项目部署：
   - 把前端页面部署到腾讯云，生成网址
   - 确保在手机浏览器和微信里都能正常打开
   - 部署后端云函数和数据库

2. 写一个README文档：
   - 说明这个项目是做什么的
   - 列出用到了哪些云开发资源
   - 如何本地运行和部署
```

</details>

> 💡 **学习要点**：通过这些提示词可以看出，AI 开发的关键是**逐步细化需求**，从整体功能到具体实现，从前端界面到后端逻辑，层层递进完成复杂应用的开发。

## 🤖 项目特色

这是一个**AI 编程实践案例**，从需求分析到完整应用，全程通过与 AI 对话完成开发：

- 🧠 **纯 AI 开发**：通过自然语言描述需求，AI 生成全部代码
- 🎯 **学习参考**：展示 AI 辅助开发的完整 workflow 和最佳实践
- 📚 **提示词分享**：公开完整的开发提示词，供学习参考
- 🚀 **一键部署**：结合 CloudBase AI ToolKit 实现智能部署

## 项目架构

### 前端技术栈

- **框架**：React + Shadcn UI
- **构建工具**：Vite
- **路由管理**：React Router 6（使用 BrowserRouter）
- **样式框架**：Tailwind CSS
- **云开发 SDK**：@cloudbase/js-sdk @cloudbase/weda-client

### 云开发资源

本项目使用了以下腾讯云开发（CloudBase）资源来实现艺术展览预约功能：

#### 1. 数据源定义

项目在 `.datasources/` 目录中定义了数据模型，包含完整的字段定义和示例数据：

- **`artwork`**: 艺术品数据源
  - **字段定义** (`.datasources/artwork/schema.json`):
    - `title`: 标题 (String)
    - `artist`: 艺术家 (String)
    - `image`: 图片 (Image)
    - `description`: 描述 (MultiLineString)
    - `year`: 创作年份 (Number)
    - `style`: 艺术风格 (String)
    - `location`: 收藏地点 (String)
  - **示例数据**: 包含《星空》、《蒙娜丽莎》、《呐喊》等经典艺术品

- **`appointment`**: 预约数据源
  - **字段定义** (`.datasources/appointment/schema.json`):
    - `date`: 预约日期 (Date)
    - `time`: 预约时间段 (String)
    - `name`: 姓名 (String)
    - `phone`: 电话 (String)
    - `email`: 邮箱 (Email)
    - `notes`: 备注 (MultiLineString)
    - `exhibitionId`: 关联展览ID (String)
  - **示例数据**: 包含预约记录样例

#### 2. 数据源操作

项目通过 `props.$w.cloud.callDataSource()` 调用数据源方法：

- **获取艺术品数据**: `wedaGetRecordsV2` 方法，支持搜索和分页
- **创建预约记录**: `wedaCreateV2` 方法，创建新的预约记录
- **查询预约记录**: `wedaGetRecordsV2` 方法，获取用户预约历史

#### 3. 静态网站托管

- **部署路径**: `/`（可自定义）
- **访问域名**: 您的云开发环境静态托管域名
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

#### 2. 配置环境 ID

打开 `src/configs/env.ts` 文件，将环境 ID 替换为您的实际环境 ID：

```typescript
export default {
  env: 'your-env-id' // 替换为您的实际环境 ID
}
```

#### 3. 创建数据源

本项目使用数据源模式，您需要在云开发控制台创建以下数据源：

- **`artwork`**: 艺术品数据源
  - 参考 `.datasources/artwork/schema.json` 创建字段
  - 可导入 `.datasources/artwork/data.json` 中的示例数据

- **`appointment`**: 预约数据源
  - 参考 `.datasources/appointment/schema.json` 创建字段
  - 可导入 `.datasources/appointment/data.json` 中的示例数据

#### 4. 配置数据源权限

建议设置以下权限：
- `artwork`: 所有人可读
- `appointment`: 仅创建者可读写（保护用户隐私）

### 本地开发

```bash
npm run dev
```

项目将在 `http://localhost:8085` 启动

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录

## 部署指南

> ⚠️ **部署前提**：确保已完成云开发环境配置，包括数据库集合和云函数的创建。

### 方式一：使用 CloudBase CLI（推荐）

1. 安装 CloudBase CLI

```bash
npm install -g @cloudbase/cli
```

2. 登录腾讯云

```bash
tcb login
```

3. 修改 `cloudbaserc.json` 中的环境 ID：

```json
{
  "envId": "your-env-id"
}
```

4. 部署应用

```bash
tcb framework deploy
```

### 方式二：手动部署

1. 构建项目

```bash
npm run build
```

2. 登录腾讯云开发控制台
3. 进入您的环境 -> 静态网站托管
4. 上传 `dist` 目录中的文件到指定路径（如 `/`）
5. 记录访问域名，用于后续访问

## 目录结构

```
├── public/               # 静态资源
├── src/
│   ├── components/      # 可复用组件
│   │   ├── ui/             # shadcn/ui 组件库
│   │   │   ├── button.tsx      # 按钮组件
│   │   │   ├── card.tsx        # 卡片组件
│   │   │   ├── input.tsx       # 输入框组件
│   │   │   ├── calendar.tsx    # 日历组件
│   │   │   ├── toast.tsx       # 提示组件
│   │   │   └── ...             # 其他UI组件
│   │   ├── Navbar.jsx          # 导航栏组件
│   │   ├── TabBar.jsx          # 底部导航组件
│   │   ├── ExhibitionCard.jsx  # 展览卡片组件
│   │   ├── ArtworkCard.jsx     # 艺术品卡片组件
│   │   ├── ArtworkList.jsx     # 艺术品列表组件
│   │   └── index.js            # 组件导出
│   ├── pages/           # 页面组件
│   │   ├── HomePage.jsx        # 首页
│   │   ├── ExhibitionsPage.jsx # 展览列表页
│   │   ├── ExhibitionDetailPage.jsx # 展览详情页
│   │   ├── ArtworkDetailPage.jsx    # 艺术品详情页
│   │   ├── ArtworkSearchPage.jsx    # 艺术品搜索页
│   │   ├── AppointmentPage.jsx      # 预约页面
│   │   └── ProfilePage.jsx          # 个人页面
│   ├── configs/         # 配置文件
│   │   ├── routers.ts          # 路由配置
│   │   └── env.ts              # 环境配置
│   ├── hooks/           # 自定义Hooks
│   │   ├── use-mobile.tsx      # 移动端检测Hook
│   │   └── use-toast.ts        # Toast提示Hook
│   ├── layouts/         # 布局组件
│   │   └── AppLayout.tsx       # 应用布局
│   ├── lib/             # 工具库
│   │   ├── weda-client.ts      # 微搭客户端
│   │   ├── utils.ts            # 工具函数
│   │   └── img-adapter.ts      # 图片适配器
│   ├── App.tsx          # 应用入口
│   ├── main.tsx         # 渲染入口
│   ├── index.css        # 全局样式
│   ├── lowcode.json     # 低代码配置
│   └── vite-env.d.ts    # TypeScript声明
├── .datasources/        # 数据源定义
│   ├── artwork/         # 艺术品数据源
│   │   ├── schema.json     # 数据模型定义
│   │   └── data.json       # 示例数据
│   └── appointment/     # 预约数据源
│       ├── schema.json     # 数据模型定义
│       └── data.json       # 示例数据
├── components.json      # shadcn/ui配置
├── index.html           # HTML 模板
├── tailwind.config.ts   # Tailwind 配置
├── vite.config.ts       # Vite 配置
├── webpack.config.js    # Webpack 配置
├── tsconfig.json        # TypeScript 配置
└── package.json         # 项目依赖
```

## 开发指南

### 添加新功能

1. **数据源变更**
   - 修改 `.datasources/` 目录下的 `schema.json` 文件添加新字段
   - 在云开发控制台同步更新数据源结构
   - 更新示例数据文件 `data.json`

2. **页面组件开发**
   - 在 `src/pages/` 目录创建新页面组件
   - 在 `src/configs/routers.ts` 中添加路由配置
   - 使用 `props.$w.utils.navigateTo()` 进行页面跳转

3. **UI组件开发**
   - 使用 `src/components/ui/` 中的 shadcn/ui 组件
   - 创建业务组件放在 `src/components/` 目录
   - 遵循 Tailwind CSS 样式规范

4. **数据操作**
   - 使用 `props.$w.cloud.callDataSource()` 调用数据源
   - 支持的方法：`wedaGetRecordsV2`、`wedaCreateV2`、`wedaUpdateV2`
   - 在组件中处理加载状态和错误处理

### 核心功能实现

#### 1. 艺术品展示
```jsx
// 获取艺术品数据
const result = await props.$w.cloud.callDataSource({
  dataSourceName: 'artwork',
  methodName: 'wedaGetRecordsV2',
  params: {
    pageSize: 10,
    pageNumber: 1,
    select: { $master: true }
  }
});
```

#### 2. 预约功能
```jsx
// 创建预约记录
const result = await props.$w.cloud.callDataSource({
  dataSourceName: 'appointment',
  methodName: 'wedaCreateV2',
  params: {
    data: {
      date: '2024-01-15',
      time: '14:00-15:00',
      name: '张三',
      phone: '13800138000',
      email: 'zhangsan@example.com',
      exhibitionId: 'exhibition1'
    }
  }
});
```

#### 3. 路由跳转
```jsx
// 页面跳转并传递参数
props.$w.utils.navigateTo({
  pageId: 'ExhibitionDetailPage',
  params: {
    id: exhibitionId,
    title: exhibitionTitle
  }
});

// 返回上一页
props.$w.utils.navigateBack();
```

### 常见问题

1. **数据加载问题**
   - 检查数据源名称是否正确
   - 确认数据源权限配置
   - 添加错误处理和加载状态

2. **路由跳转问题**
   - 确保页面ID在 `routers.ts` 中已配置
   - 检查参数传递格式是否正确
   - 使用 `props.$w.page.dataset.params` 获取参数

3. **样式问题**
   - 确保 Tailwind CSS 类名正确
   - 检查响应式设计在不同设备上的表现
   - 使用 shadcn/ui 组件保持一致性

4. **部署问题**
   - 确保环境ID配置正确
   - 检查数据源是否已在云开发控制台创建
   - 验证静态托管配置

## 核心API文档

### 数据源操作API

#### artwork 数据源

```javascript
// 获取艺术品列表
const getArtworks = async (page = 1, pageSize = 10) => {
  return await props.$w.cloud.callDataSource({
    dataSourceName: 'artwork',
    methodName: 'wedaGetRecordsV2',
    params: {
      pageSize,
      pageNumber: page,
      select: { $master: true }
    }
  });
};

// 搜索艺术品
const searchArtworks = async (searchTerm) => {
  return await props.$w.cloud.callDataSource({
    dataSourceName: 'artwork',
    methodName: 'wedaGetRecordsV2',
    params: {
      filter: {
        where: {
          $or: [
            { title: { $search: searchTerm } },
            { artist: { $search: searchTerm } }
          ]
        }
      },
      select: { $master: true }
    }
  });
};
```

#### appointment 数据源

```javascript
// 创建预约
const createAppointment = async (appointmentData) => {
  return await props.$w.cloud.callDataSource({
    dataSourceName: 'appointment',
    methodName: 'wedaCreateV2',
    params: {
      data: appointmentData
    }
  });
};

// 获取用户预约记录
const getUserAppointments = async (userId) => {
  return await props.$w.cloud.callDataSource({
    dataSourceName: 'appointment',
    methodName: 'wedaGetRecordsV2',
    params: {
      filter: {
        where: { createBy: userId }
      },
      select: { $master: true },
      orderBy: [{ createdAt: 'desc' }]
    }
  });
};
```

### 路由API

```javascript
// 页面跳转
const navigateToPage = (pageId, params = {}) => {
  props.$w.utils.navigateTo({
    pageId,
    params
  });
};

// 获取页面参数
const getPageParams = () => {
  return props.$w.page.dataset.params || {};
};

// 返回上一页
const goBack = () => {
  props.$w.utils.navigateBack();
};
```

## 测试指南

### 功能测试

#### 1. 艺术品浏览测试
- 访问首页，检查艺术品卡片是否正常显示
- 点击艺术品卡片，验证跳转到详情页
- 测试艺术品搜索功能，输入关键词验证搜索结果

#### 2. 预约流程测试
- 从展览详情页点击"预约参观"按钮
- 填写预约表单，测试表单验证
- 提交预约后检查是否跳转到个人页面
- 在个人页面验证预约记录是否显示

#### 3. 页面导航测试
- 测试底部导航栏各个页面切换
- 验证页面参数传递是否正确
- 测试返回按钮功能

### 数据源测试

#### 1. 本地测试数据
项目提供了示例数据，可以直接导入测试：
```bash
# 艺术品数据
.datasources/artwork/data.json

# 预约数据
.datasources/appointment/data.json
```

#### 2. API调用测试
在浏览器控制台测试数据源调用：
```javascript
// 测试获取艺术品数据
$w.cloud.callDataSource({
  dataSourceName: 'artwork',
  methodName: 'wedaGetRecordsV2',
  params: { pageSize: 5 }
}).then(console.log);

// 测试创建预约
$w.cloud.callDataSource({
  dataSourceName: 'appointment',
  methodName: 'wedaCreateV2',
  params: {
    data: {
      name: '测试用户',
      phone: '13800138000',
      email: 'test@example.com',
      date: '2024-01-15',
      time: '14:00-15:00',
      exhibitionId: '1'
    }
  }
}).then(console.log);
```

### 性能测试

#### 1. 页面加载速度
- 使用浏览器开发者工具检查页面加载时间
- 优化图片加载，使用适当的图片格式和尺寸
- 检查网络请求数量和响应时间

#### 2. 移动端适配
- 在不同尺寸的移动设备上测试
- 验证触摸操作的响应性
- 检查横竖屏切换的适配

## 故障排除

### 常见错误及解决方案

#### 1. 数据源调用失败
**错误信息**: `DataSource not found` 或 `Permission denied`

**解决方案**:
- 检查 `src/configs/env.ts` 中的环境ID是否正确
- 确认数据源已在云开发控制台创建
- 验证数据源权限配置是否正确

#### 2. 页面跳转失败
**错误信息**: `Page not found` 或跳转无响应

**解决方案**:
- 检查 `src/configs/routers.ts` 中是否已配置目标页面
- 确认页面ID拼写是否正确
- 验证参数传递格式是否符合要求

#### 3. 图片加载失败
**现象**: 图片显示为占位符或加载错误

**解决方案**:
- 检查图片URL是否有效
- 确认图片服务器是否支持跨域访问
- 使用 `src/lib/img-adapter.ts` 处理图片适配

#### 4. 样式显示异常
**现象**: 页面布局错乱或样式不生效

**解决方案**:
- 确认 Tailwind CSS 配置是否正确
- 检查是否有CSS类名冲突
- 验证响应式断点设置

#### 5. 本地开发环境问题
**现象**: 开发服务器启动失败或热更新不工作

**解决方案**:
```bash
# 清除依赖重新安装
rm -rf node_modules package-lock.json
npm install

# 清除构建缓存
rm -rf dist
npm run build

# 检查端口占用
lsof -ti:8085
```

### 调试技巧

#### 1. 使用浏览器开发者工具
- **Console**: 查看错误日志和调试信息
- **Network**: 检查API请求和响应
- **Elements**: 调试CSS样式问题
- **Application**: 检查本地存储和缓存

#### 2. 数据源调试
```javascript
// 在控制台直接测试数据源调用
window.$w.cloud.callDataSource({
  dataSourceName: 'artwork',
  methodName: 'wedaGetRecordsV2',
  params: { pageSize: 1 }
}).then(result => {
  console.log('数据源调用成功:', result);
}).catch(error => {
  console.error('数据源调用失败:', error);
});
```

#### 3. 路由调试
```javascript
// 检查当前页面参数
console.log('页面参数:', window.$w.page.dataset.params);

// 测试页面跳转
window.$w.utils.navigateTo({
  pageId: 'HomePage',
  params: { test: 'debug' }
});
```

## 后续优化建议

### 功能增强

- [ ] **用户注册登录**：完整的用户账号体系
- [ ] **收藏功能**：收藏喜欢的展览和艺术品
- [ ] **评论系统**：用户可以对展览进行评价
- [ ] **分享功能**：分享展览到社交媒体
- [ ] **推荐算法**：基于用户喜好推荐展览
- [ ] **多语言支持**：国际化展览信息

### 体验优化

- [ ] **离线缓存**：支持离线浏览部分内容
- [ ] **推送通知**：展览开始前的提醒通知
- [ ] **语音导览**：展览的语音介绍功能
- [ ] **无障碍访问**：支持视障用户访问
- [ ] **图片优化**：WebP格式和响应式图片
- [ ] **性能监控**：用户体验数据收集分析

### 管理功能

- [ ] **展览管理后台**：管理员可以添加、编辑展览信息
- [ ] **预约管理系统**：查看和管理所有预约记录
- [ ] **数据统计分析**：展览热度、用户行为分析
- [ ] **内容审核**：用户评论和反馈的审核机制

### 技术升级

- [ ] **PWA支持**：渐进式Web应用体验
- [ ] **微信小程序版本**：扩展到微信生态
- [ ] **AI智能客服**：自动回答用户常见问题

## 🚀 学习实践指南

如果您想基于此项目学习 AI 开发或搭建类似应用：

1. **研究源码结构**：了解 Vue3 + CloudBase 联机应用的架构设计
2. **分析提示词**：学习如何与 AI 协作，逐步完成复杂需求
3. **实践开发**：
   - 克隆项目到本地：`git clone ...`
   - 安装依赖：`npm install`
   - 配置您的云开发环境（参考配置说明）
   - 本地运行：`npm run dev`
   - 部署测试：`npm run build` + 部署到 CloudBase

## 💡 扩展学习方向

基于本项目的技术架构，您可以学习开发：

**文化艺术类**

- 博物馆导览系统
- 音乐会票务平台
- 画廊作品展示
- 艺术教育平台

**预约管理类**

- 医院挂号系统
- 餐厅预订平台
- 会议室预约
- 健身房预约

**内容管理类**

- 新闻发布系统
- 产品展示平台
- 企业官网
- 个人博客系统

**核心技术要点**：数据管理、用户交互、内容展示、预约流程

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License
