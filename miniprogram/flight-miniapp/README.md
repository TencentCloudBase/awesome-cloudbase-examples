# 航班对比预订小程序

一个完全通过**AI编程**开发的航班对比预订小程序，基于微信小程序 + 腾讯云开发（CloudBase）构建，展示了从**Figma设计稿到完整应用**的AI辅助开发全流程。

## 💻 效果演示

![项目预览](https://6c75-luke-agent-dev-7g1nc8tqc2ab76af-1259218801.tcb.qcloud.la/%E4%BC%81%E4%B8%9A%E5%BE%AE%E4%BF%A1%E6%88%AA%E5%9B%BE_56ed2227-55ae-4cce-b3d4-0d946fcb4c6e.png)
![项目预览](https://6c75-luke-agent-dev-7g1nc8tqc2ab76af-1259218801.tcb.qcloud.la/%E4%BC%81%E4%B8%9A%E5%BE%AE%E4%BF%A1%E6%88%AA%E5%9B%BE_ae3dae6d-d535-4447-ab8b-144c9e96de06.png)


## 📱 功能特色

> 💡 **应用亮点**：通过智能航班对比系统，帮助用户快速找到最优航班选择，轻松完成在线预订！
> 
> 📝 **说明**：这是AI开发的完整小程序应用演示。想要学习如何用AI开发类似应用，请参考下面的开发提示词和代码实现。

## 🎨 Figma设计稿驱动开发

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)  

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过 **Figma AI + MCP Server** 实现从AI设计稿生成到AI代码实现的完整开发链路。

## 🤖 Figma AI设计稿生成

### AI驱动的设计过程

本项目的设计稿完全通过 **Figma 内置AI能力** 生成，展示了AI时代从设计构思到代码实现的无缝衔接：

#### 设计稿生成流程

1. **AI对话生成设计**
   ```
   我向Figma AI描述需求：
   "请帮我设计一个航班对比预订小程序，需要包含：
   - 深色主题的现代化UI设计
   - 航班搜索和筛选界面
   - 多维度对比展示页面
   - 预订流程和用户中心
   - 使用橙红色作为强调色，体现专业和现代感"
   ```

2. **AI设计稿展示**
   
   **🎨 Figma AI生成的设计稿**
    
   > ![Figma AI设计稿](https://6c75-luke-agent-dev-7g1nc8tqc2ab76af-1259218801.tcb.qcloud.la/Clipboard_Screenshot_1751376680.png)
   

3. **设计系统提取**
   ```
   Figma AI自动生成了完整的设计系统：
   ✅ 深色主题色彩系统 (#0d0402背景 + #ff5733强调色)
   ✅ 现代化组件库 (卡片、按钮、表单、导航等)
   ✅ 响应式布局规则 (Auto Layout + Constraints)
   ✅ 交互状态设计 (正常、悬停、选中、禁用等)
   ✅ 图标和插画系统 (航班、时间、价格等主题图标)
   ```

### Figma AI的优势

✨ **自然语言交互**：通过对话即可生成专业级UI设计  
🎯 **设计系统完整**：自动生成配套的颜色、字体、组件规范  
🔄 **快速迭代**：设计调整只需重新描述需求  
🎨 **视觉专业性**：AI具备专业的设计美学和用户体验认知  
⚡ **高效协作**：设计师和开发者基于同一AI生成的设计稿协作  

### 基于Figma的AI开发工作流

本项目创新性地采用了 **Figma AI设计 → MCP Server读取 → AI代码生成 → 云开发部署** 的完整开发流程：

#### 1. 设计稿生成阶段
```bash
# 通过Figma AI生成设计稿
- 与Figma AI对话描述产品需求
- AI自动生成完整的UI设计方案
- 包含页面布局、组件设计、交互状态
- 生成配套的设计系统和规范
```

#### 2. 设计稿读取阶段
```bash
# 通过Figma MCP Server获取设计稿
- 启用Figma Desktop App的MCP Server
- 配置Cursor等代码编辑器连接MCP
- 自动读取Figma设计文件
- 解析UI组件结构和样式信息
```

#### 3. AI代码生成阶段  
```bash
# AI根据设计稿生成代码
- 在Cursor中选择Figma设计组件
- AI解析组件为小程序页面结构
- 自动生成WXML、WXSS、JS代码
- 保持与设计稿的高度一致性
```

#### 4. 功能实现阶段
```bash
# 基于设计稿完善业务逻辑
- 实现航班搜索和对比功能
- 集成云开发数据库和云函数
- 添加用户交互和状态管理
- 优化性能和用户体验
```

### Figma MCP Server 配置 (基于官方指南)

> 📖 **参考文档**：[Figma Dev Mode MCP Server 官方指南](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Dev-Mode-MCP-Server)

#### 系统要求
- **Figma计划**: Professional、Organization 或 Enterprise 计划的 Dev 或 Full 席位
- **代码编辑器**: 支持MCP的编辑器 (VS Code、Cursor、Windsurf、Claude Code)
- **Figma应用**: 必须使用 Figma Desktop App (非网页版)

#### 步骤1: 启用Figma MCP Server

1. **下载并更新Figma Desktop App**
   ```bash
   # 确保使用最新版本的Figma Desktop App
   # 下载地址：https://www.figma.com/downloads/
   ```

2. **启用MCP Server**
   ```bash
   1. 打开Figma Desktop App
   2. 创建或打开Figma设计文件
   3. 点击左上角的Figma菜单
   4. 选择 Preferences → Enable Dev Mode MCP Server
   5. 看到确认消息表示服务器已启动
   ```

3. **记录服务器地址**
   ```bash
   # MCP Server运行在本地地址
   http://127.0.0.1:3845/sse
   ```

#### 步骤2: 配置Cursor编辑器

1. **打开Cursor设置**
   ```bash
   # macOS: Cursor → Settings → Cursor Settings
   # Windows: File → Preferences → Settings
   ```

2. **添加MCP Server配置**
   ```bash
   1. 进入 MCP 标签页
   2. 点击 "+ Add new global MCP server"
   3. 输入以下配置并保存：
   ```

   ```json
   {
     "mcpServers": {
       "Figma": {
         "url": "http://127.0.0.1:3845/sse"
       }
     }
   }
   ```

3. **验证连接**
   ```bash
   # 重启Cursor和Figma Desktop App
   # 在Cursor中应该能看到Figma MCP server连接成功
   # 可以看到可用的MCP工具列表
   ```

#### 步骤3: 使用MCP进行设计到代码转换

##### 选择式开发流程
```bash
1. 在Figma Desktop App中选择设计组件或页面
2. 切换到Cursor，在聊天界面输入提示词：
   "请根据我在Figma中选择的组件生成小程序代码"
3. AI会自动读取选中的设计并生成对应代码
```

##### 链接式开发流程  
```bash
1. 在Figma中右键复制设计组件的链接
2. 在Cursor中提供链接并输入提示词：
   "请根据这个Figma链接的设计生成小程序页面: [粘贴链接]"
3. AI会解析链接中的node-id并生成代码
```

#### MCP最佳实践配置

##### Cursor规则配置
在Cursor中创建项目级规则文件，确保AI按照项目规范生成代码：

```markdown
---
description: Figma Dev Mode MCP rules for 航班预订小程序
globs: 
alwaysApply: true
---

# Figma MCP Server 规则
- Figma Dev Mode MCP Server 提供资源端点来服务图片和SVG资源
- 重要：如果Figma MCP Server返回localhost资源，直接使用该资源
- 重要：不要导入新的图标包，所有资源都应在Figma设计稿中
- 重要：如果提供了localhost资源，不要使用占位符

# 小程序开发规则  
- 使用微信小程序原生组件和语法
- 保持与Figma设计稿的视觉一致性
- 使用项目的深色主题色彩系统
- 优先使用云开发SDK进行数据操作
- 遵循小程序最佳实践和性能优化
```


> 💡 **技术优势**：基于官方MCP Server的方案确保了设计稿解析的准确性和稳定性，AI生成的代码与Figma设计100%匹配。


## 📝 AI开发提示词记录

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)  

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效，支持AI生成全栈代码、一键部署至腾讯云开发（免服务器）、智能日志修复。

首先可以按照 [CloudBase AI ToolKit 快速上手指南](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/getting-started) 准备好 AI 开发环境。

以下是开发本项目时使用的完整提示词，展示了如何通过自然语言与AI协作完成全栈应用开发：

<details>
<summary><strong>阶段一：根据figma 设计稿UI，还原界面交互</strong></summary>

```
严格参考当前选中的 figma UI 节点，开发一个航班对比预订小程序的前端交互，功能要求：

1. 用户可以搜索和筛选航班（按时间、航空公司、价格等）
2. 支持多个航班同时选择和详细对比
3. 航班对比功能要包含价格、时长、准点率、机型等多维度对比
4. 用户可以预订选中的航班，填写乘客信息
5. 个人中心显示预订记录和用户信息管理

请用微信小程序做前端，帮我开发这个应用。
```

</details>

<details>
<summary><strong>阶段二：功能逻辑实现</strong></summary>

```
请基于云数据库和云函数，实现航班对比预订系统的核心逻辑：

1. 航班管理：
   - 支持多条件搜索（航空公司、出发地、目的地、时间）
   - 航班信息包含价格、时长、机型、准点率、航班类型
   - 智能筛选功能（直飞/中转、舱位等级、价格区间）

2. 对比功能：
   - 用户可选择最多3个航班进行对比
   - 对比维度：价格、时长、准点率、机型、航班类型、航站楼等
   - 智能推荐：自动标识最低价格、最高准点率、直飞航班

3. 预订系统：
   - 完整的预订流程，支持多乘客信息填写
   - 乘客类型区分（成人、儿童、婴儿）
   - 联系人信息管理和价格自动计算
   - 预订记录状态管理

4. 用户系统：
   - 微信登录获取用户信息
   - 个人资料管理和偏好设置
   - 预订历史查看和详情展示
```

</details>

## 🤖 项目特色

这是一个**Figma AI设计 + MCP Server驱动的AI编程实践案例**，从AI设计构思到完整应用，展示现代化AI全栈开发工作流：

- 🎨 **Figma AI设计生成**：通过自然语言对话，AI自动生成专业级UI设计稿
- 🔗 **官方MCP Server集成**：基于Figma官方Dev Mode MCP Server实现设计稿精确读取
- 🧠 **双AI协作开发**：Figma AI负责设计，Cursor AI负责代码实现
- 🔄 **设计代码同步**：设计稿变更可通过MCP Server快速同步到代码
- 🎯 **端到端AI流程**：从产品构思、UI设计到代码实现的完整AI辅助链路
- 📚 **完整学习案例**：公开Figma AI对话记录和代码生成提示词
- 🚀 **一键部署**：结合CloudBase AI ToolKit实现智能部署
- 💡 **最佳实践**：展示微信小程序 + CloudBase + Figma的标准架构
- 🛠️ **官方工具集成**：使用Figma官方推荐的MCP开发工作流

### 技术创新亮点

#### 🎨 AI设计到AI代码的无缝衔接
```mermaid
graph LR
    A[需求描述] --> B[Figma AI设计]
    B --> C[设计稿生成]
    C --> D[MCP Server读取]
    D --> E[Cursor AI编码]
    E --> F[小程序应用]
```

#### 🔧 基于官方标准的开发流程
- **设计标准化**: 遵循Figma官方设计系统规范
- **接口标准化**: 使用Figma官方MCP Server API
- **代码标准化**: 基于官方最佳实践生成代码
- **部署标准化**: 符合微信小程序和云开发规范

#### 💡 AI协作开发模式
- **设计AI**: Figma内置AI处理视觉设计和用户体验
- **开发AI**: Cursor AI处理代码生成和业务逻辑实现  
- **部署AI**: CloudBase AI ToolKit处理自动化部署
- **优化AI**: 基于日志和反馈的智能问题修复

## 应用特点

- ✈️ **智能航班对比**：多维度对比分析，智能推荐最优选择
- 🔍 **强大搜索功能**：支持多条件搜索、智能筛选、语音输入
- 📊 **可视化对比**：直观的对比表格，绿色高亮最优选项
- 📱 **预订管理系统**：完整的预订流程，支持多乘客信息管理
- 🌙 **深色主题设计**：现代化的深色UI，护眼舒适的视觉体验
- 🎨 **交互体验优化**：流畅的动画效果，清晰的用户反馈
- 📋 **数据持久化**：完整的用户信息和预订记录云端存储
- 🛡️ **安全可靠**：基于微信登录体系，保障用户数据安全

## 项目架构

### 前端技术栈

- **框架**：微信小程序原生开发
- **样式**：WXSS + 深色主题设计
- **交互**：原生组件 + 自定义交互逻辑
- **状态管理**：页面级数据管理 + 全局状态
- **云开发SDK**：微信小程序云开发

### 云开发资源

本项目使用了以下腾讯云开发（CloudBase）资源来实现航班对比预订功能：

#### 1. 数据库集合

- **`flights`**: 航班信息集合
  - `_id`: 航班ID
  - `flightNumber`: 航班号
  - `airline`: 航空公司名称
  - `departure`: 出发城市
  - `arrival`: 到达城市
  - `departureTime`: 出发时间
  - `arrivalTime`: 到达时间
  - `duration`: 飞行时长
  - `price`: 票价（人民币）
  - `type`: 航班类型（直飞/中转）
  - `class`: 舱位等级
  - `aircraft`: 机型
  - `terminal`: 航站楼
  - `gate`: 登机口
  - `punctualityRate`: 准点率（百分比）

- **`bookings`**: 预订记录集合
  - `_id`: 预订ID
  - `openid`: 用户ID（openid）
  - `flightId`: 航班ID
  - `bookingNumber`: 预订号
  - `passengers`: 乘客信息数组
  - `contactInfo`: 联系人信息
  - `totalPrice`: 总价格
  - `status`: 预订状态（confirmed/cancelled）
  - `createTime`: 预订时间

- **`users`**: 用户信息集合
  - `_id`: 用户ID（openid）
  - `nickName`: 用户昵称
  - `avatarUrl`: 头像地址
  - `preferences`: 用户偏好设置
  - `createTime`: 注册时间
  - `lastLoginTime`: 最后登录时间

#### 2. 云函数

- **`getFlights`**: 获取航班列表
  - 支持多条件搜索和筛选
  - 包含智能搜索逻辑
  - 返回格式化的航班数据

- **`getBookings`**: 获取用户预订记录
  - 根据用户openid获取预订历史
  - 包含航班基本信息
  - 支持预订状态筛选

- **`createBooking`**: 创建航班预订
  - 处理乘客信息验证
  - 自动生成预订号
  - 计算总价格
  - 保存预订记录

- **`saveUserInfo`**: 保存用户信息
  - 处理微信登录信息
  - 更新用户偏好设置
  - 记录登录时间

- **`getOpenId`**: 获取用户OpenID
  - 通过微信code获取用户身份
  - 用于用户身份验证

#### 3. 小程序配置

- **AppID**: `wx5ceb4e4809aa1d28`
- **页面结构**: 
  - 首页（快速搜索）
  - 航班对比页
  - 对比详情页
  - 预订页面
  - 预订记录页
  - 个人中心页
- **TabBar导航**: 首页、对比、预订、我的

## 开始使用

### 前提条件

- 微信开发者工具
- 腾讯云开发账号 ([腾讯云开发官网](https://tcb.cloud.tencent.com/)注册)
- 微信小程序AppID

### 配置云开发环境

**学习实践：如何配置云开发环境**

#### 1. 创建云开发环境

1. 访问 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
2. 创建新的云开发环境，选择按量计费模式
3. 记录您的环境 ID（格式类似：`your-env-id-1234567890`）

#### 2. 配置环境 ID

打开 `miniprogram/app.js` 文件，将环境 ID 替换为您的实际环境 ID：

```javascript
wx.cloud.init({
  env: 'your-env-id', // 替换为您的实际环境 ID
  traceUser: true,
});
```

#### 3. 创建数据库集合

在云开发控制台的数据库中创建以下集合：

- `flights`：航班信息集合（权限设置为"所有人可读，仅管理端可写"）
- `bookings`：预订记录集合（权限设置为"仅创建者可读写"）
- `users`：用户信息集合（权限设置为"仅创建者可读写"）

#### 4. 部署云函数

1. 使用微信开发者工具打开项目
2. 右键点击 `cloudfunctions` 目录下的各个云函数
3. 选择"上传并部署（云端安装依赖）"
4. 等待所有云函数部署完成

### 本地开发

1. 使用微信开发者工具打开项目
2. 确保已配置正确的AppID和云开发环境
3. 点击编译，即可在模拟器中预览

### 初始化数据

项目已预置中文航班数据样本，包含国内主要航线的航班信息。如需添加更多数据，可在云开发控制台的数据库中手动添加。

## 目录结构

```
miniprogram-cloudbase-miniprogram-template/
├── miniprogram/                    # 小程序前端代码
│   ├── pages/                      # 页面文件
│   │   ├── index/                      # 首页（快速搜索）
│   │   ├── flight-comparison/          # 航班对比主页
│   │   ├── comparison/                 # 航班对比详情页
│   │   ├── booking/                    # 航班预订页
│   │   ├── bookings/                   # 预订记录页
│   │   └── profile/                    # 个人中心页
│   ├── images/                     # 图标和图片资源
│   ├── app.js                      # 应用入口逻辑
│   ├── app.json                    # 应用配置
│   └── app.wxss                    # 全局样式
├── cloudfunctions/                 # 云函数目录
│   ├── getFlights/                     # 获取航班信息
│   ├── getBookings/                    # 获取预订记录
│   ├── createBooking/                  # 创建预订
│   ├── saveUserInfo/                   # 保存用户信息
│   └── getOpenId/                      # 获取用户ID
├── design/                         # 设计相关文件（可选）
│   ├── figma-export/                   # Figma设计稿导出文件
│   ├── design-tokens.json             # 设计令牌文件
│   ├── component-specs.md             # 组件规范文档
│   └── style-guide.md                 # 视觉设计指南
├── docs/                           # 项目文档
│   ├── figma-workflow.md              # Figma开发工作流说明
│   ├── ai-prompts.md                  # AI提示词集合
│   └── design-to-code.md              # 设计到代码映射指南
├── cloudbaserc.json                # 云开发配置
├── project.config.json             # 项目配置
├── 部署指南.md                     # 详细部署说明
├── 使用说明.md                     # 用户使用指南
└── README.md                       # 项目说明
```

## 云函数 API

### 1. 获取航班列表 (getFlights)

获取航班列表，支持多条件搜索和筛选。

```javascript
wx.cloud.callFunction({
  name: 'getFlights',
  data: {
    departure: '北京',           // 出发地
    arrival: '上海',             // 目的地
    searchText: '国航',          // 搜索关键词
    includeBasicFares: true,     // 包含基础舱位
    nonstopFlights: false        // 仅直飞航班
  }
})
```

### 2. 获取预订记录 (getBookings)

获取用户的预订历史记录。

```javascript
wx.cloud.callFunction({
  name: 'getBookings',
  data: {
    status: 'all' // 预订状态：all/confirmed/cancelled
  }
})
```

### 3. 创建预订 (createBooking)

创建新的航班预订。

```javascript
wx.cloud.callFunction({
  name: 'createBooking',
  data: {
    flightId: 'flight_id_here',
    passengers: [
      {
        name: '张三',
        idCard: '123456789012345678',
        phone: '13800138000',
        type: 'adult'
      }
    ],
    contactInfo: {
      name: '张三',
      phone: '13800138000',
      email: 'zhangsan@example.com'
    }
  }
})
```

### 4. 保存用户信息 (saveUserInfo)

保存或更新用户信息。

```javascript
wx.cloud.callFunction({
  name: 'saveUserInfo',
  data: {
    userInfo: {
      nickName: '用户昵称',
      avatarUrl: '头像URL'
    }
  }
})
```

## 云开发功能说明

### 初始化云开发

本项目在小程序中通过 `wx.cloud.init()` 初始化云开发环境。

### 航班对比核心实现

通过云函数实现高效的航班搜索和对比：

```javascript
// 搜索航班
wx.cloud.callFunction({
  name: 'getFlights',
  data: { 
    searchText: '国航',
    departure: '北京',
    arrival: '上海'
  },
  success: (res) => {
    if (res.result.success) {
      this.setData({
        flights: res.result.flights
      });
    }
  }
});

// 创建预订
wx.cloud.callFunction({
  name: 'createBooking',
  data: {
    flightId: selectedFlight.id,
    passengers: passengerList,
    contactInfo: contactInfo
  },
  success: (res) => {
    if (res.result.success) {
      wx.showToast({
        title: '预订成功',
        icon: 'success'
      });
      // 跳转到预订记录页
      wx.switchTab({
        url: '/pages/bookings/bookings'
      });
    }
  }
});
```

### 技术点

1. **环境配置**：在 `cloudbaserc.json` 中配置云开发环境和资源
2. **微信登录**：使用微信小程序原生登录体系
3. **数据安全**：通过云函数控制数据访问权限
4. **性能优化**：合理的数据库查询和结果缓存
5. **实时同步**：实时更新航班状态和预订信息
6. **智能对比**：AI辅助的对比算法和推荐系统
7. **Figma集成**：基于Figma MCP Server的设计稿驱动开发
8. **代码自动生成**：AI根据设计稿自动生成对应的小程序代码
9. **设计系统提取**：自动从Figma中提取颜色、字体、间距等设计令牌
10. **视觉一致性保证**：确保最终实现与设计稿的100%视觉一致性

## 后续优化建议

### 功能增强
- [ ] **实时航班数据**：接入真实航班API，获取实时航班信息
- [ ] **价格走势**：显示航班价格历史趋势和预测
- [ ] **航班提醒**：预订航班的状态变更通知
- [ ] **座位选择**：在线选择座位功能
- [ ] **支付集成**：接入微信支付完成在线支付

### 用户体验优化  
- [ ] **个性化推荐**：基于用户历史偏好推荐航班
- [ ] **地图导航**：显示机场位置和交通信息
- [ ] **航班动态**：实时显示航班延误、登机口变更等信息
- [ ] **社交分享**：分享航班信息给朋友
- [ ] **离线功能**：缓存重要信息，支持离线查看

### 技术升级
- [ ] **数据分析**：用户行为分析和航班热度统计
- [ ] **性能优化**：图片压缩和懒加载
- [ ] **多端支持**：H5版本和其他平台适配
- [ ] **AI智能**：基于AI的最优航班推荐算法

## ⚠️ 踩坑经验与解决方案

在实际的**Figma AI + MCP Server**开发实践中，我们遇到了一些挑战并找到了有效的解决方案。这些经验对于想要采用类似工作流的开发者非常重要：

### 🎯 核心挑战：多页面设计一致性问题

#### 问题描述

**Figma AI的局限性**：
- ❌ **单页面生成**：Figma AI默认一次只能生成单个页面的设计
- ❌ **一致性难保证**：多次AI对话生成的不同页面，在视觉风格、组件设计、色彩使用等方面容易出现不一致
- ❌ **设计系统零散**：每次生成都可能创建新的颜色、字体或组件变体，导致设计系统混乱
- ❌ **开发效率降低**：不一致的设计稿会让AI生成的代码风格差异很大，增加后期统一的工作量

### 💡 解决方案

经过实践，我们总结出两种有效的解决方案，各有优缺点：

#### 方案一：Figma单页面 + Cursor AI补全

**核心思路**：充分发挥两个AI的各自优势，Figma AI负责核心页面设计，Cursor AI负责页面扩展和一致性保证。

**实施步骤**：

1. **选择核心页面进行Figma AI设计**
   ```
   选择应用中最复杂、最能体现设计风格的页面（如主功能页面）
   与Figma AI深度对话，生成高质量的单页面设计
   确保这个页面包含：完整的设计系统、多种组件状态、典型的布局模式
   ```

2. **提取设计系统到Cursor**
   ```
   通过MCP Server读取Figma设计稿
   让Cursor AI分析并提取：
   - 颜色系统（主色、辅助色、背景色、文本色等）
   - 字体系统（字号、行高、字重等）
   - 间距系统（内边距、外边距、组件间距等）
   - 组件规范（按钮样式、卡片样式、表单控件等）
   ```

3. **Cursor AI生成其他页面**
   ```
   提示词模板：
   "基于当前Figma设计稿中提取的设计系统，请生成航班搜索页面，要求：
   1. 严格遵循已有的颜色系统：主色#ff5733，背景色#0d0402
   2. 使用相同的组件设计模式：圆角12rpx，间距24rpx
   3. 保持一致的字体层级和视觉权重
   4. 复用已定义的按钮、卡片、表单等组件样式
   5. 功能需求：[具体的搜索页面功能描述]"
   ```

#### 方案二：Google Stitch + Figma导入

**核心思路**：利用专业的多页面AI设计工具生成一致性设计，再导入Figma进行MCP开发。

**实施步骤**：

1. **Google Stitch AI设计**
   ```bash
   # 访问 Google Stitch (或类似的多页面AI设计工具)
   # 输入完整的应用需求描述
   
   提示词示例：
   "设计一个航班对比预订小程序，包含以下页面：
   1. 首页：快速搜索入口和功能导航
   2. 搜索页：航班搜索和筛选界面  
   3. 对比页：多维度航班对比展示
   4. 预订页：乘客信息填写和确认
   5. 记录页：预订历史和管理
   6. 个人中心：用户信息和设置
   
   要求：深色主题，橙红色强调色，现代化设计，保持多页面一致性"
   ```

2. **设计稿导入Figma**
   ```bash
   # 从Google Stitch导出设计稿（通常是PNG、SVG或Figma格式）
   # 方式一：直接复制粘贴到Figma文件中
   # 方式二：使用Figma的导入功能
   # 方式三：重新在Figma中参照创建（保持MCP可读性）
   ```

3. **Cursor 开发流程**
   ```bash
   # 正常使用MCP Server + Cursor AI的开发流程
   # 由于设计稿本身具有一致性，生成的代码也会更统一
   ```

## 💡 扩展学习方向

基于本项目的**Figma AI + MCP Server + 云开发**技术架构，您可以学习开发：

### AI设计驱动的应用开发

**电商类应用**
- 通过Figma AI设计商品展示界面
- 基于MCP Server生成购物车和支付流程
- 学习商品对比和推荐系统设计

**社交类应用**
- AI生成现代化的聊天界面设计
- 通过MCP转换为即时通讯组件
- 实现用户资料和动态展示页面

**工具类应用**
- 设计简洁高效的工具界面
- 生成数据可视化和图表组件
- 开发生产力提升类小程序

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License

---

**让航班选择更智能，让出行体验更美好！** ✈️🚀