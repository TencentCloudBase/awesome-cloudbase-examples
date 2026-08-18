# 脱单课程小程序

一个完全通过**AI编程**开发的脱单课程预约小程序，基于微信小程序 + 腾讯云开发（CloudBase）构建，展示了AI辅助开发全栈应用的完整过程。

## 💻 效果演示

![项目预览](./image.png)

## 📱 功能特色

> 💡 **应用亮点**：通过科学的脱单课程体系，帮助用户提升社交能力，轻松预约线下活动课程！
> 
> 📝 **说明**：这是AI开发的完整小程序应用演示。想要学习如何用AI开发类似应用，请参考下面的开发提示词和代码实现。

## 📝 AI开发提示词记录

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)  

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效，支持AI生成全栈代码、一键部署至腾讯云开发（免服务器）、智能日志修复。

首先可以按照 [CloudBase AI ToolKit 快速上手指南](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/getting-started) 准备好 AI 开发环境。

以下是开发本项目时使用的完整提示词，展示了如何通过自然语言与AI协作完成全栈应用开发：

<details>
<summary><strong>阶段一：项目需求描述</strong></summary>

```
我想开发一个脱单课程预约小程序，功能要求：

1. 用户可以浏览各种脱单课程（咖啡约会、电影约会、运动约会等）
2. 支持按分类筛选课程
3. 用户可以预约感兴趣的课程，查看课程详情
4. 个人中心显示预约记录，支持取消预约
5. 用户登录和个人信息管理

请用微信小程序做前端，腾讯云开发做后端，帮我开发这个应用。
```

</details>

<details>
<summary><strong>阶段二：界面设计要求</strong></summary>

```
请设计以下几个页面：

1. 首页：轮播图展示热门课程，课程分类导航，课程列表
2. 课程详情页：课程介绍、时间地点、预约按钮
3. 个人中心：用户信息、预约记录、设置等

界面要求：
- 设计要现代化、符合年轻人审美
- 使用粉色系主题色，营造温馨浪漫氛围
- 支持下拉刷新和分类切换
- 清晰的课程卡片设计
- 完善的交互反馈

请使用微信小程序原生组件和样式。
```

</details>

<details>
<summary><strong>阶段三：功能逻辑实现</strong></summary>

```
请实现课程预约系统的核心逻辑：

1. 课程管理：
   - 支持多种课程分类（咖啡、电影、运动、美食等）
   - 课程信息包含名称、描述、时间、地点、价格、人数限制
   - 课程状态管理（开放预约、已满、已结束）

2. 预约功能：
   - 用户预约课程时检查是否重复预约
   - 预约成功后更新课程剩余名额
   - 支持取消预约，释放名额

3. 用户系统：
   - 微信登录获取用户信息
   - 用户个人资料管理
   - 预约记录查看和管理
```

</details>

<details>
<summary><strong>阶段四：数据存储和云函数</strong></summary>

```
请用腾讯云开发来存储数据：

1. 需要存储的数据：
   - 课程信息（名称、分类、时间、地点、价格、容量等）
   - 用户信息（微信用户数据、个人资料）
   - 预约记录（用户、课程、预约时间、状态）

2. 云函数设计：
   - dating_getCourses: 获取课程列表，支持分类筛选
   - dating_getCourseDetail: 获取课程详情
   - dating_bookCourse: 预约课程
   - dating_cancelBooking: 取消预约
   - dating_getUserBookings: 获取用户预约记录
   - dating_userLogin: 用户登录
   - dating_getUserInfo/updateUserInfo: 用户信息管理

3. 数据库权限：
   - 课程信息：所有人可读
   - 用户信息：仅本人可读写
   - 预约记录：通过云函数控制访问权限
```

</details>

<details>
<summary><strong>阶段五：部署和优化</strong></summary>

```
请完成以下功能：

1. 小程序配置：
   - 设置合适的导航栏样式和tabBar
   - 配置页面路由和参数传递
   - 添加下拉刷新和错误处理

2. 部署配置：
   - 配置cloudbaserc.json部署文件
   - 部署云函数和初始化数据库
   - 测试所有功能是否正常

3. 写一个README文档：
   - 说明这个项目是做什么的
   - 列出用到了哪些云开发资源
   - 如何本地开发和部署
```

</details>

> 💡 **学习要点**：通过这些提示词可以看出，AI开发的关键是**逐步细化需求**，从整体功能到具体实现，从前端界面到后端逻辑，层层递进完成复杂应用的开发。

## 🤖 项目特色

这是一个**AI编程实践案例**，从需求分析到完整应用，全程通过与AI对话完成开发：

- 🧠 **纯AI开发**：通过自然语言描述需求，AI生成全部代码
- 🎯 **学习参考**：展示AI辅助开发的完整workflow和最佳实践  
- 📚 **提示词分享**：公开完整的开发提示词，供学习参考
- 🚀 **一键部署**：结合CloudBase AI ToolKit实现智能部署
- 💡 **最佳实践**：展示微信小程序 + CloudBase的标准架构

## 应用特点

- 💝 **科学脱单体系**：多样化课程分类，涵盖社交各个场景
- 📅 **便捷预约系统**：一键预约心仪课程，实时查看预约状态
- 👥 **智能匹配推荐**：根据用户兴趣推荐合适的脱单课程
- 📱 **原生小程序体验**：流畅的用户交互，符合微信使用习惯
- 🔄 **实时数据同步**：预约状态实时更新，避免重复预约
- 🎨 **现代化UI设计**：温馨浪漫的视觉风格，符合年轻用户审美
- 📊 **个人数据管理**：完整的用户信息和预约记录管理
- 🛡️ **安全可靠**：基于微信登录体系，保障用户数据安全

## 项目架构

### 前端技术栈

- **框架**：微信小程序原生开发
- **样式**：WXSS + 小程序原生组件
- **状态管理**：页面级数据管理
- **路由**：小程序原生路由系统
- **云开发SDK**：微信小程序云开发

### 云开发资源

本项目使用了以下腾讯云开发（CloudBase）资源来实现课程预约功能：

#### 1. 数据库集合

- **`dating_courses`**: 脱单课程集合
  - `_id`: 课程ID
  - `title`: 课程标题
  - `description`: 课程描述
  - `category`: 课程分类（coffee/movie/sports/food/art/music/shopping/game）
  - `instructor`: 导师信息
  - `datetime`: 课程时间
  - `location`: 课程地点
  - `price`: 课程价格
  - `capacity`: 课程容量
  - `booked`: 已预约人数
  - `status`: 课程状态（active/full/ended）
  - `image`: 课程封面图
  - `tags`: 课程标签
  - `createdAt`: 创建时间

- **`dating_bookings`**: 课程预约记录集合
  - `_id`: 预约ID
  - `userId`: 用户ID（openid）
  - `courseId`: 课程ID
  - `status`: 预约状态（active/cancelled）
  - `bookedAt`: 预约时间
  - `cancelledAt`: 取消时间
  - `userInfo`: 预约用户信息

- **`dating_users`**: 用户信息集合
  - `_id`: 用户ID（openid）
  - `nickName`: 用户昵称
  - `avatarUrl`: 头像地址
  - `gender`: 性别
  - `age`: 年龄
  - `interests`: 兴趣爱好
  - `registeredAt`: 注册时间
  - `lastLoginAt`: 最后登录时间

#### 2. 云函数

- **`dating_getCourses`**: 获取课程列表
  - 支持按分类筛选课程
  - 分页获取课程数据
  - 返回课程基本信息和预约状态

- **`dating_getCourseDetail`**: 获取课程详情
  - 根据courseId获取详细课程信息
  - 检查用户是否已预约该课程
  - 返回完整课程数据

- **`dating_bookCourse`**: 预约课程
  - 验证课程是否可预约
  - 检查用户是否重复预约
  - 更新课程预约人数
  - 创建预约记录

- **`dating_cancelBooking`**: 取消预约
  - 验证预约记录有效性
  - 更新预约状态为已取消
  - 释放课程名额

- **`dating_getUserBookings`**: 获取用户预约记录
  - 获取用户所有预约记录
  - 包含课程基本信息
  - 支持按状态筛选

- **`dating_userLogin`**: 用户登录
  - 处理微信登录流程
  - 获取或创建用户信息
  - 更新登录时间

- **`dating_getUserInfo`**: 获取用户信息
  - 根据openid获取用户详细信息
  - 返回用户个人资料

- **`dating_updateUserInfo`**: 更新用户信息
  - 更新用户个人资料
  - 包括昵称、年龄、兴趣等

- **`getOpenId`**: 获取用户OpenID
  - 通过code获取用户openid
  - 用于用户身份识别

#### 3. 小程序配置

- **AppID**: `wx8c2a1161b0dc1bdc`
- **页面结构**: 
  - 首页（课程列表）
  - 课程详情页
  - 个人中心页
- **TabBar导航**: 首页、个人中心

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

打开 `cloudbaserc.json` 文件，将环境 ID 替换为您的实际环境 ID：

```json
{
  "envId": "your-env-id"
}
```

#### 3. 创建数据库集合

在云开发控制台的数据库中创建以下集合：

- `dating_courses`：脱单课程集合（权限设置为"所有人可读，仅管理端可写"）
- `dating_bookings`：预约记录集合（权限设置为"仅创建者可读写"）
- `dating_users`：用户信息集合（权限设置为"仅创建者可读写"）

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

可以在云开发控制台的数据库中手动添加一些示例课程数据，或者创建初始化云函数来批量添加数据。

## 目录结构

```
├── cloudfunctions/           # 云函数目录
│   ├── dating_getCourses/        # 获取课程列表
│   ├── dating_getCourseDetail/   # 获取课程详情
│   ├── dating_bookCourse/        # 预约课程
│   ├── dating_cancelBooking/     # 取消预约
│   ├── dating_getUserBookings/   # 获取用户预约
│   ├── dating_userLogin/         # 用户登录
│   ├── dating_getUserInfo/       # 获取用户信息
│   ├── dating_updateUserInfo/    # 更新用户信息
│   └── getOpenId/                # 获取OpenID
├── miniprogram/              # 小程序源码目录
│   ├── components/               # 可复用组件
│   ├── images/                   # 图片资源
│   ├── pages/                    # 页面文件
│   │   ├── index/                    # 首页
│   │   ├── course-detail/            # 课程详情页
│   │   └── profile/                  # 个人中心页
│   ├── app.js                    # 小程序逻辑
│   ├── app.json                  # 小程序配置
│   ├── app.wxss                  # 全局样式
│   └── sitemap.json              # 站点地图
├── cloudbaserc.json          # 云开发配置
├── project.config.json       # 项目配置
└── README.md                 # 项目说明
```

## 云函数 API

### 1. 获取课程列表 (dating_getCourses)

获取脱单课程列表，支持分类筛选。

```javascript
wx.cloud.callFunction({
  name: 'dating_getCourses',
  data: {
    category: 'all', // 课程分类：all/coffee/movie/sports等
    limit: 20,       // 每页数量
    offset: 0        // 偏移量
  }
})
```

### 2. 获取课程详情 (dating_getCourseDetail)

根据课程ID获取详细信息。

```javascript
wx.cloud.callFunction({
  name: 'dating_getCourseDetail',
  data: {
    courseId: 'course_id_here'
  }
})
```

### 3. 预约课程 (dating_bookCourse)

用户预约指定课程。

```javascript
wx.cloud.callFunction({
  name: 'dating_bookCourse',
  data: {
    courseId: 'course_id_here'
  }
})
```

### 4. 取消预约 (dating_cancelBooking)

取消已预约的课程。

```javascript
wx.cloud.callFunction({
  name: 'dating_cancelBooking',
  data: {
    bookingId: 'booking_id_here'
  }
})
```

### 5. 获取用户预约记录 (dating_getUserBookings)

获取当前用户的所有预约记录。

```javascript
wx.cloud.callFunction({
  name: 'dating_getUserBookings',
  data: {
    status: 'active' // 预约状态：active/cancelled/all
  }
})
```

## 小程序功能特性

### 课程展示系统
- 🎯 **分类导航**：8大类脱单课程，精准匹配用户兴趣
- 📱 **响应式设计**：适配不同尺寸的手机屏幕
- 🔄 **下拉刷新**：实时获取最新课程信息
- 🎨 **视觉设计**：温馨粉色主题，营造浪漫氛围

### 预约管理系统
- ⚡ **一键预约**：简单快捷的预约流程
- 🚫 **重复检测**：防止用户重复预约同一课程
- 📊 **实时更新**：课程容量和预约状态实时同步
- 📋 **记录管理**：完整的预约历史和状态管理

### 用户体验优化
- 🔐 **微信登录**：基于微信授权，安全便捷
- 💾 **数据持久化**：用户信息和预约记录云端存储
- ⚠️ **错误处理**：完善的异常处理和用户提示
- 📱 **原生体验**：符合微信小程序设计规范

## 云开发功能说明

### 初始化云开发

本项目在小程序中通过 `wx.cloud.init()` 初始化云开发环境。

### 课程预约核心技术

通过云函数实现安全可靠的预约系统：

```javascript
// 预约课程流程
wx.cloud.callFunction({
  name: 'dating_bookCourse',
  data: { courseId },
  success: (res) => {
    if (res.result.success) {
      // 预约成功，更新界面状态
      this.setData({
        isBooked: true,
        currentCourse: res.result.data
      });
      wx.showToast({
        title: '预约成功',
        icon: 'success'
      });
    } else {
      // 处理预约失败情况
      wx.showToast({
        title: res.result.error,
        icon: 'none'
      });
    }
  }
});

// 获取用户预约记录
wx.cloud.callFunction({
  name: 'dating_getUserBookings',
  data: { status: 'active' },
  success: (res) => {
    this.setData({
      bookings: res.result.data
    });
  }
});
```

### 云开发技术亮点

1. **环境配置**：在 `cloudbaserc.json` 中配置云开发环境和资源
2. **微信登录**：使用微信小程序原生登录体系
3. **数据安全**：通过云函数控制数据访问权限
4. **性能优化**：合理的数据库索引和查询优化
5. **状态同步**：实时更新课程容量和预约状态
6. **错误处理**：完善的异常处理和重试机制

> 💡 **AI开发优势**：通过AI生成的代码架构清晰、注释完整，非常适合学习CloudBase小程序开发的最佳实践。

## 开发指南

### 添加新功能

1. **数据库变更**
   - 在相应集合中添加新字段
   - 更新云函数中的数据库操作逻辑

2. **云函数更新**
   - 创建新的云函数或扩展现有函数功能
   - 更新函数配置和依赖

3. **小程序开发**
   - 创建新页面或组件
   - 更新 `app.json` 中的页面配置
   - 实现前端交互逻辑

### 常见问题

1. **预约状态同步问题**
   - 检查云函数是否正确更新数据库
   - 确认数据库权限配置是否正确

2. **用户登录问题**
   - 确保小程序AppID配置正确
   - 检查云开发环境是否正常

3. **部署问题**
   - 确保所有云函数都已正确部署
   - 检查数据库集合和索引是否创建

## 后续优化建议

### 功能增强
- [ ] **课程评价系统**：用户可以对参与的课程进行评价
- [ ] **好友邀请**：邀请微信好友一起参加课程
- [ ] **消息通知**：课程提醒和状态变更通知
- [ ] **课程分享**：分享感兴趣的课程给朋友
- [ ] **优惠券系统**：新用户优惠和活动促销

### 用户体验优化  
- [ ] **个性化推荐**：基于用户兴趣推荐相关课程
- [ ] **地理位置**：显示课程地点和距离信息
- [ ] **日历集成**：将预约的课程添加到日历
- [ ] **课程搜索**：支持关键词搜索课程
- [ ] **离线缓存**：缓存常用数据，提升加载速度

### 技术升级
- [ ] **数据分析**：用户行为分析和课程热度统计
- [ ] **性能优化**：图片压缩和懒加载
- [ ] **多端支持**：H5版本和其他平台适配

## 🚀 学习实践指南

如果您想基于此项目学习AI开发或搭建类似应用：

1. **研究源码结构**：了解微信小程序 + CloudBase的架构设计
2. **分析提示词**：学习如何与AI协作，逐步完成复杂需求
3. **实践开发**：
   - 克隆项目到本地
   - 配置您的云开发环境（参考配置说明）
   - 使用微信开发者工具打开项目
   - 部署云函数和测试功能

## 💡 扩展学习方向

基于本项目的技术架构，您可以学习开发：

**预约类应用**
- 健身房预约系统
- 会议室预约管理
- 医疗挂号系统
- 餐厅订座系统

**社交类应用**
- 兴趣小组活动
- 同城交友平台
- 技能交换社区
- 学习伙伴匹配

**核心技术要点**：用户登录体系、数据权限控制、状态管理、预约冲突处理

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License
