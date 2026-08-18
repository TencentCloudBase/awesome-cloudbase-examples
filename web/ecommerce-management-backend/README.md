# 电商管理 Web 后台系统

一个完全通过**AI编程**开发的电商管理后台系统，基于 React + Vite + 腾讯云开发（CloudBase）构建，提供商品、订单、活动、会员四大核心管理模块，展示了AI辅助开发全栈应用的完整过程。

## 💻 效果演示

![电商管理后台系统](https://qcloudimg.tencent-cloud.cn/raw/5e744e8578fad7c87d2417bc113faa76.png)

## 在线体验

[🛒 立即体验管理后台](https://lowcode-5ghz6bdo8b89686c-1307578329.tcloudbaseapp.com/ecommerce-admin?t=1735287489)

> 💡 **体验小贴士**：系统已预置测试数据，您可以直接体验商品管理、订单处理、会员管理等完整功能！
>
> ⚠️ **演示模式说明**：为保护演示数据，所有操作按钮（新增、编辑、删除等）已被禁用，您可以浏览查看所有功能界面和数据展示。如需体验完整功能，请下载源码到本地运行。
>
> 📝 **说明**：这是AI开发的完整应用演示。想要学习如何用AI开发类似应用，请参考下面的开发提示词和代码实现。

## 📝 AI开发提示词记录

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效，支持AI生成全栈代码、一键部署至腾讯云开发（免服务器）、智能日志修复。

首先可以按照 [CloudBase AI ToolKit 快速上手指南](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/getting-started) 准备好 AI 开发环境。

以下是开发本项目时使用的完整提示词，展示了如何通过自然语言与AI协作完成全栈应用开发：

**阶段一：项目需求描述**
```
开发电商管理 Web 后台系统，包含商品、订单、活动、会员四大核心管理模块，采用前后端分离架构，实现数据管理与业务操作功能。

为电商运营人员提供一体化管理平台，实现商品上下架、订单处理、活动配置、会员分层运营等核心场景的数字化操作，提升运营效率。

技术要求：
- 前端使用React + Vite + Tailwind CSS
- 后端使用腾讯云开发数据库
- 支持CRUD操作、分页、搜索等功能
- 响应式设计，适配PC端
```

**阶段二：数据库设计**
```
在云开发环境 your-envId 下面进行数据库设计：

1. 商品表（goods）
   - sku：字符串（商品唯一标识）
   - goodName：字符串（商品名称）
   - price：浮点数（价格）
   - picture：字符串数组（商品图片URL列表）
   - description：文本（商品详情描述）
   - stock：整数（库存数量）
   - status：枚举（online/offline，上下架状态）

2. 会员表（user）
   - id：字符串（会员ID）
   - name：字符串（会员名称）
   - orderIds：字符串数组（关联订单ID）
   - grade：枚举（bronze/silver/gold，会员等级）
   - createTime：时间戳（注册时间）

3. 订单表（order）
   - id：字符串（订单ID）
   - goodsSku：字符串（关联商品SKU）
   - num：整数（商品数量）
   - salesPromotionId：字符串（关联促销活动ID）
   - totalPrice：浮点数（订单总价）
   - status：枚举（pending/shipped/completed/refunded）
   - userId：字符串（关联用户ID）

4. 促销活动表（salesPromotion）
   - id：字符串（活动ID）
   - name：字符串（活动名称）
   - description：文本（活动规则描述）
   - startTime：时间戳（开始时间）
   - endTime：时间戳（结束时间）
   - multiPrize：浮点数（减免金额）
   - lowestPrice：浮点数（最低消费门槛）
```

**阶段三：前端页面开发**
```
开发以下管理页面：

1. 仪表板页面：
   - 业务数据统计（商品数、会员数、订单数、活动数）
   - 收入统计和业务指标
   - 最近订单列表

2. 商品管理页面：
   - 商品列表展示（支持搜索、分页）
   - 新增/编辑商品表单
   - 商品上下架状态切换
   - 多图片URL管理

3. 会员管理页面：
   - 会员列表展示（支持搜索、分页）
   - 会员等级管理（铜牌/银牌/金牌）
   - 查看会员关联订单

4. 订单管理页面：
   - 订单列表展示（支持搜索、状态筛选、分页）
   - 批量状态更新
   - 订单详情查看（包含商品、用户、促销信息）

5. 促销活动管理页面：
   - 活动列表展示（支持搜索、分页）
   - 活动时间管理和优惠规则配置
   - 活动状态标识（未开始/进行中/已结束）

界面要求：
- 使用现代化的管理后台布局
- 侧边栏导航 + 顶部栏设计
- 表格展示数据，支持操作按钮
- 模态框进行新增/编辑操作
- 响应式设计，适配不同屏幕尺寸
```

**阶段四：功能实现和部署**
```
完成以下功能：

1. 数据交互：
   - 集成云开发SDK，实现数据库CRUD操作
   - 实现搜索、分页、筛选功能
   - 错误处理和用户反馈

2. 业务逻辑：
   - 商品库存管理
   - 订单状态流转
   - 会员等级体系
   - 促销活动时间控制

3. 部署发布：
   - 构建生产版本
   - 部署到腾讯云开发静态托管
   - 生成访问地址

4. 文档完善：
   - 编写README文档
   - 说明项目架构和使用方法
   - 记录云开发资源配置
```

> 💡 **学习要点**：通过这些提示词可以看出，AI开发的关键是**逐步细化需求**，从整体功能到具体实现，从数据设计到界面开发，层层递进完成复杂应用的开发。

## 🤖 项目特色

这是一个**AI编程实践案例**，从需求分析到完整应用，全程通过与AI对话完成开发：

- 🧠 **纯AI开发**：通过自然语言描述需求，AI生成全部代码
- 🎯 **学习参考**：展示AI辅助开发的完整workflow和最佳实践
- 📚 **提示词分享**：公开完整的开发提示词，供学习参考
- 🚀 **一键部署**：结合CloudBase AI ToolKit实现智能部署
- 💡 **最佳实践**：展示React + CloudBase管理系统的标准架构

## 项目特点

- 🌐 **完整的管理系统**：涵盖电商运营的核心业务模块
- ⚡ **实时数据同步**：基于云开发数据库，数据变更实时反映
- 🎮 **丰富的交互功能**：搜索、分页、批量操作、状态管理
- 🏆 **业务数据统计**：仪表板展示关键业务指标和趋势
- 📱 **响应式设计**：完美支持PC端各种屏幕尺寸
- 🔄 **状态管理机制**：商品上下架、订单流转、活动时效控制
- 🎯 **用户体验优化**：加载状态、错误提示、操作反馈
- 🎁 **云端数据存储**：基于腾讯云开发，免服务器运维

## 项目架构

### 前端技术栈

- **框架**：React 18 + Hooks
- **构建工具**：Vite
- **路由管理**：React Router 6（使用 HashRouter）
- **样式框架**：Tailwind CSS + DaisyUI
- **图标库**：Heroicons
- **云开发SDK**：@cloudbase/js-sdk

### 云开发资源

本项目使用了以下腾讯云开发（CloudBase）资源来实现电商管理功能：

#### 1. 数据库集合

- **`goods`**: 商品管理集合
  - `_id`: 商品唯一标识
  - `sku`: 商品SKU编码
  - `goodName`: 商品名称
  - `price`: 商品价格
  - `picture`: 商品图片URL数组
  - `description`: 商品描述
  - `stock`: 库存数量
  - `status`: 商品状态（online/offline）
  - `createTime`: 创建时间
  - `updateTime`: 更新时间

- **`user`**: 会员管理集合
  - `_id`: 会员唯一标识
  - `id`: 会员ID
  - `name`: 会员姓名
  - `grade`: 会员等级（bronze/silver/gold）
  - `orderIds`: 关联订单ID数组
  - `createTime`: 注册时间
  - `updateTime`: 更新时间

- **`order`**: 订单管理集合
  - `_id`: 订单唯一标识
  - `id`: 订单编号
  - `goodsSku`: 关联商品SKU
  - `num`: 商品数量
  - `userId`: 关联用户ID
  - `salesPromotionId`: 关联促销活动ID
  - `totalPrice`: 订单总价
  - `status`: 订单状态（pending/shipped/completed/refunded）
  - `createTime`: 创建时间
  - `updateTime`: 更新时间

- **`salesPromotion`**: 促销活动管理集合
  - `_id`: 活动唯一标识
  - `id`: 活动ID
  - `name`: 活动名称
  - `description`: 活动描述
  - `startTime`: 开始时间
  - `endTime`: 结束时间
  - `multiPrize`: 减免金额
  - `lowestPrice`: 最低消费门槛
  - `createTime`: 创建时间
  - `updateTime`: 更新时间

#### 2. 静态网站托管

- **部署路径**: `/ecommerce-admin`（可自定义）
- **访问域名**: 您的云开发环境静态托管域名
- **CDN缓存**: 支持全球CDN加速

### 功能模块

#### 1. 仪表板
- 📊 业务数据统计概览
- 📈 收入统计和业务指标
- 📋 最近订单列表

#### 2. 商品管理
- ✅ 商品CRUD操作（增删改查）
- 🔍 按商品名称搜索
- 📄 分页显示（每页10条）
- 🔄 商品上下架状态切换
- 🖼️ 支持多图片URL管理
- 📊 库存管理

#### 3. 会员管理
- ✅ 会员CRUD操作
- 🏆 会员等级管理（铜牌/银牌/金牌）
- 🔍 按会员名称搜索
- 📄 分页显示
- 👁️ 查看会员订单关联

#### 4. 订单管理
- ✅ 订单CRUD操作
- 🔍 按订单ID搜索
- 🏷️ 按状态筛选（待发货/已发货/已完成/已退款）
- 📄 分页显示
- 🔄 批量状态更新
- 👁️ 订单详情查看（包含商品、用户、促销信息）

#### 5. 促销活动管理
- ✅ 活动CRUD操作
- 🔍 按活动名称搜索
- 📄 分页显示
- ⏰ 活动时间管理（开始/结束时间）
- 💰 优惠规则配置（减免金额、最低消费门槛）
- 🏷️ 活动状态标识（未开始/进行中/已结束）

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

打开 `src/utils/cloudbase.js` 文件，将环境 ID 替换为您的实际环境 ID：

```javascript
// 将 'your-envId' 替换为您的实际环境 ID
const ENV_ID = 'your-env-id';
```

#### 3. 创建数据库集合

在云开发控制台的数据库中创建以下集合：

- `goods`：商品集合（权限建议设置为"所有人可读，仅创建者可写"）
- `user`：会员集合（权限建议设置为"所有人可读，仅创建者可写"）
- `order`：订单集合（权限建议设置为"所有人可读，仅创建者可写"）
- `salesPromotion`：促销活动集合（权限建议设置为"所有人可读，仅创建者可写"）

> ⚠️ **重要提醒：数据库权限配置**
>
> 如果前端查询数据时返回空结果（count为0），很可能是数据库权限配置问题：
>
> 1. **检查权限设置**：在云开发控制台 -> 数据库 -> 集合设置中，确保权限设置为"所有人可读"或"所有人可读，仅创建者可写"
> 2. **避免过严权限**：如果设置为"仅创建者可读写"或"仅管理端可读写"，前端将无法查询数据
> 3. **权限说明**：
>    - "所有人可读，仅创建者可写"：推荐设置，前端可查询，但只能修改自己创建的数据
>    - "所有人可读"：前端可查询所有数据，适合展示类数据
>    - "仅管理端可读写"：只有云函数可以操作，前端无法直接访问
>
> 💡 **解决方案**：如果遇到查询返回空的问题，请检查并调整数据库集合的权限设置。

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

## 在线访问

🌐 **项目已部署到腾讯云开发静态托管**

**访问地址**: [https://lowcode-5ghz6bdo8b89686c-1307578329.tcloudbaseapp.com/ecommerce-admin?t=1735287489](https://your-envId-1307578329.tcloudbaseapp.com/ecommerce-admin?t=1735287489)

> ⚠️ **重要提醒**：在线演示为只读模式，所有操作按钮已被禁用以保护演示数据。如需体验完整功能，请下载源码到本地运行。
>
> 注：由于CDN缓存，首次访问可能需要等待几分钟。如遇到问题，请尝试刷新页面。

## 部署指南

> ⚠️ **部署前提**：确保已完成云开发环境配置，包括数据库集合的创建。

### 方式一：使用 CloudBase CLI（推荐）

1. 安装 CloudBase CLI
```bash
npm install -g @cloudbase/cli
```

2. 登录腾讯云
```bash
tcb login
```

3. 修改 `cloudbaserc.json` 中的环境ID：
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
4. 上传 `dist` 目录中的文件到指定路径（如 `/ecommerce-admin`）
5. 记录访问域名，用于后续访问

## 目录结构

```
├── public/                    # 静态资源
├── src/
│   ├── components/            # 可复用组件
│   │   ├── AdminLayout.jsx    # 管理后台布局组件
│   │   ├── Footer.jsx         # 页脚组件
│   │   └── Navbar.jsx         # 导航栏组件
│   ├── pages/                 # 页面组件
│   │   ├── DashboardPage.jsx  # 仪表板页面
│   │   ├── GoodsPage.jsx      # 商品管理页面
│   │   ├── UsersPage.jsx      # 会员管理页面
│   │   ├── OrdersPage.jsx     # 订单管理页面
│   │   └── PromotionsPage.jsx # 促销活动管理页面
│   ├── utils/                 # 工具函数
│   │   └── cloudbase.js       # 云开发初始化和配置
│   ├── App.jsx                # 应用入口
│   ├── main.jsx               # 渲染入口
│   └── index.css              # 全局样式
├── cloudbaserc.json           # 云开发部署配置
├── index.html                 # HTML 模板
├── tailwind.config.js         # Tailwind 配置
├── postcss.config.js          # PostCSS 配置
├── vite.config.js             # Vite 配置
└── package.json               # 项目依赖
```

## 电商管理功能说明

### 核心业务模块

#### 1. 仪表板
- 📊 业务数据统计概览（商品数、会员数、订单数、活动数）
- 📈 收入统计和业务指标分析
- 📋 最近订单列表展示

#### 2. 商品管理
- ✅ 商品CRUD操作（增删改查）
- 🔍 按商品名称搜索
- 📄 分页显示（每页10条）
- 🔄 商品上下架状态切换
- 🖼️ 支持多图片URL管理
- 📊 库存数量管理

#### 3. 会员管理
- ✅ 会员CRUD操作
- 🏆 会员等级管理（铜牌/银牌/金牌）
- 🔍 按会员名称搜索
- 📄 分页显示
- 👁️ 查看会员订单关联

#### 4. 订单管理
- ✅ 订单CRUD操作
- 🔍 按订单ID搜索
- 🏷️ 按状态筛选（待发货/已发货/已完成/已退款）
- 📄 分页显示
- 🔄 批量状态更新
- 👁️ 订单详情查看（包含商品、用户、促销信息）

#### 5. 促销活动管理
- ✅ 活动CRUD操作
- 🔍 按活动名称搜索
- 📄 分页显示
- ⏰ 活动时间管理（开始/结束时间）
- 💰 优惠规则配置（减免金额、最低消费门槛）
- 🏷️ 活动状态标识（未开始/进行中/已结束）

## 云开发功能说明

### 初始化云开发

本项目在 `src/utils/cloudbase.js` 中集中管理云开发的初始化和匿名登录功能。

### 电商管理核心技术

通过 `src/utils/cloudbase.js` 实现电商管理功能：

```javascript
import { app, ensureLogin } from '../utils/cloudbase';

// 确保已登录
await ensureLogin();

// 获取商品列表 - 支持搜索和分页
const fetchGoods = async (page = 1, search = '') => {
  const db = app.database();
  let query = db.collection('goods');

  if (search) {
    query = query.where({
      goodName: db.RegExp({
        regexp: search,
        options: 'i'
      })
    });
  }

  const result = await query
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  return result.data;
};

// 创建订单
const createOrder = async (orderData) => {
  const db = app.database();
  const result = await db.collection('order').add({
    ...orderData,
    createTime: new Date(),
    updateTime: new Date()
  });
  return result;
};

// 批量更新订单状态
const batchUpdateOrderStatus = async (orderIds, newStatus) => {
  const db = app.database();
  const promises = orderIds.map(id =>
    db.collection('order').doc(id).update({
      status: newStatus,
      updateTime: new Date()
    })
  );
  await Promise.all(promises);
};

// 统计业务数据
const getBusinessStats = async () => {
  const db = app.database();
  const [goodsCount, usersCount, ordersCount, promotionsCount] = await Promise.all([
    db.collection('goods').count(),
    db.collection('user').count(),
    db.collection('order').count(),
    db.collection('salesPromotion').count()
  ]);

  return {
    totalGoods: goodsCount.total,
    totalUsers: usersCount.total,
    totalOrders: ordersCount.total,
    totalPromotions: promotionsCount.total
  };
};
```

### 电商管理技术亮点

1. **环境配置**：在 `src/utils/cloudbase.js` 中配置云开发环境 ID
2. **免注册体验**：使用匿名登录，降低管理员使用门槛
3. **数据库操作**：基于云开发数据库，实现完整的CRUD操作
4. **搜索和分页**：支持模糊搜索和分页查询，提升数据管理效率
5. **批量操作**：订单状态批量更新，提高运营效率
6. **业务统计**：实时统计业务数据，为决策提供支持

> 💡 **AI开发优势**：通过AI生成的代码架构清晰、注释完整，非常适合学习CloudBase管理系统开发的最佳实践。

## 路由系统说明

本项目使用 React Router 6 作为路由系统，并采用 HashRouter 实现路由管理，这样可以更好地兼容静态网站托管服务，避免刷新页面时出现 404 错误。


### 当前路由结构

```jsx
<Router>
  <div className="flex flex-col min-h-screen">
    <main className="flex-grow">
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* 可以在这里添加新的路由 */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </main>
    <Footer />
  </div>
</Router>
```

### 如何添加新页面和路由

1. 在 `src/pages` 目录下创建新页面组件，例如 `ProductPage.jsx`：

```jsx
import React from 'react';

const ProductPage = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">产品页面</h1>
      <p>这是产品页面的内容</p>
    </div>
  );
};

export default ProductPage;
```

2. 在 `App.jsx` 中导入新页面并添加路由：

```jsx
import ProductPage from './pages/ProductPage';

// 在 Routes 中添加新路由
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/products" element={<ProductPage />} />
  <Route path="*" element={<HomePage />} />
</Routes>
```

3. 使用 Link 组件在页面中添加导航链接：

```jsx
import { Link } from 'react-router-dom';

// 在页面中添加链接
<Link to="/products" className="btn btn-primary">前往产品页面</Link>
```

### 使用路由参数

对于需要动态参数的路由，可以使用参数路径：

```jsx
// 在 App.jsx 中定义带参数的路由
<Route path="/product/:id" element={<ProductDetailPage />} />

// 在 ProductDetailPage.jsx 中获取参数
import { useParams } from 'react-router-dom';

const ProductDetailPage = () => {
  const { id } = useParams();
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">产品详情</h1>
      <p>产品ID: {id}</p>
    </div>
  );
};
```

### 路由导航

除了使用 `<Link>` 组件，还可以使用编程式导航：

```jsx
import { useNavigate } from 'react-router-dom';

const ComponentWithNavigation = () => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate('/products');
    // 或者带参数: navigate('/product/123');
    // 或者返回上一页: navigate(-1);
  };
  
  return (
    <button onClick={handleClick} className="btn btn-primary">
      前往产品页面
    </button>
  );
};
```



## 云开发功能说明

### 初始化云开发

本模板在 `src/utils/cloudbase.js` 中集中管理云开发的初始化和匿名登录功能。这个工具文件提供了云开发示例的获取/登录，调用云函数，云存储，云数据库等能力

### 重要说明

1. 在使用前请先在 `src/utils/cloudbase.js` 文件中将 `ENV_ID` 变量的值修改为您的云开发环境 ID。
2. 本模板默认使用匿名登录，这适合快速开发和测试，但在生产环境中可能需要更严格的身份验证。
3. 所有云开发功能都通过初始化的应用实例直接调用，无需二次封装。
4. `ensureLogin` 方法会检查当前登录状态，如果已登录则返回当前登录状态，否则会进行匿名登录。
5. 匿名登录状态无法使用 `logout` 方法退出，只有其他登录方式（如微信登录、邮箱登录等）可以退出。

## 开发指南

### 添加新功能

1. **数据库变更**
   - 在相应集合中添加新字段
   - 更新前端页面中的数据库操作逻辑

2. **页面开发**
   - 在 `src/pages/` 目录下创建新页面组件
   - 在 `src/components/AdminLayout.jsx` 中添加导航菜单
   - 更新 `src/App.jsx` 中的路由配置

3. **组件开发**
   - 在 `src/components/` 中创建可复用组件
   - 遵循React Hooks最佳实践
   - 使用Tailwind CSS进行样式设计

### 常见问题

1. **数据加载问题**
   - 检查云开发环境ID配置是否正确
   - 确认数据库权限配置是否正确

2. **搜索和分页问题**
   - 搜索功能基于云开发数据库的正则表达式查询
   - 分页逻辑在各个页面组件中实现

3. **部署问题**
   - 确保构建命令正确执行
   - 检查云开发静态托管配置
   - 验证环境ID是否正确

## 后续优化建议

### 功能增强
- [ ] **权限管理**：添加管理员角色和权限控制
- [ ] **数据导出**：支持Excel格式的数据导出功能
- [ ] **图表分析**：添加更丰富的数据可视化图表
- [ ] **消息通知**：订单状态变更的实时通知
- [ ] **操作日志**：记录管理员的操作历史

### 用户体验优化
- [ ] **暗色主题**：支持明暗主题切换
- [ ] **快捷键支持**：常用操作的键盘快捷键
- [ ] **拖拽排序**：表格数据的拖拽排序功能
- [ ] **批量导入**：支持Excel批量导入数据
- [ ] **高级筛选**：更多维度的数据筛选条件

### 技术升级
- [ ] **TypeScript支持**：增加类型安全
- [ ] **单元测试**：添加组件和功能测试
- [ ] **性能优化**：虚拟滚动、懒加载等优化
- [ ] **PWA支持**：离线访问和桌面应用

## 🚀 学习实践指南

如果您想基于此项目学习AI开发或搭建类似应用：

1. **研究源码结构**：了解React + CloudBase管理系统的架构设计
2. **分析提示词**：学习如何与AI协作，逐步完成复杂需求
3. **实践开发**：
   - 克隆项目到本地：`git clone ...`
   - 安装依赖：`npm install`
   - 配置您的云开发环境（参考配置说明）
   - 本地运行：`npm run dev`
   - 部署测试：`npm run build` + 部署到CloudBase

## 💡 扩展学习方向

基于本项目的技术架构，您可以学习开发：

**管理系统类**
- 内容管理系统（CMS）
- 客户关系管理（CRM）
- 人力资源管理（HRM）
- 库存管理系统

**业务应用类**
- 在线教育平台管理
- 医疗预约管理系统
- 酒店预订管理系统
- 活动报名管理平台

**核心技术要点**：数据库设计、CRUD操作、搜索分页、状态管理、权限控制

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License
