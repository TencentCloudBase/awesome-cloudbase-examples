# 分手厨房实时联机对战小游戏

一个完全通过**AI编程**开发的实时联机分手厨房游戏，基于 React + Phaser + Vite + 腾讯云开发（CloudBase）构建，展示了AI辅助开发全栈游戏的完整过程。

## 💻 效果演示

![分手厨房游戏截图](https://6c75-luke-agent-dev-7g1nc8tqc2ab76af-1259218801.tcb.qcloud.la/multi-mode.gif)

## 在线体验

[🍳 立即体验分手厨房](https://luke-agent-dev-7g1nc8tqc2ab76af-1259218801.tcloudbaseapp.com/overcooked-game/)

> 💡 **合作小贴士**：邀请朋友一起烹饪，创建房间后分享房间号，即可开始跨设备实时合作制作美食！
>
> 📝 **说明**：这是AI开发的完整游戏演示。想要学习如何用AI开发类似游戏，请参考下面的开发提示词和代码实现。

## 📝 AI开发提示词记录

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效，支持AI生成全栈代码、一键部署至腾讯云开发（免服务器）、智能日志修复。

首先可以按照 [CloudBase AI ToolKit 快速上手指南](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/getting-started) 准备好 AI 开发环境。

以下是开发本项目时使用的完整提示词，展示了如何通过自然语言与AI协作完成全栈游戏开发：

<details>
<summary><strong>阶段一：基础框架搭建</strong></summary>

```
帮我开发一款 Web 端的分手厨房（Overcooked）小游戏
- 玩法参考 Overcooked，支持单机和双人联机
- 像素风美术，Phaser.js 2D游戏引擎
- 主要物品：番茄、生菜、面包、切菜台、烹饪台、出餐台、洗碗台、盘子、灭火器、垃圾桶
- 支持玩家拾取、放置、加工物品，支持多人实时同步
- 代码结构清晰，便于维护和扩展

游戏物品参考：
- 食材类别：番茄，生菜，面包
- 作台类别：切菜台，烹饪台，出餐台，洗碗台
- 其他物品：盘子，灭火器，垃圾桶

基础框架搭建
- 创建游戏场景和基础界面
- 实现玩家角色和基本移动
- 创建游戏世界中的各种物品
- 建立基础的物品交互系统
```

</details>

<details>
<summary><strong>阶段二：单机游戏逻辑</strong></summary>

```
单机游戏逻辑
- 实现完整的烹饪工作流程
- 添加进度反馈和状态指示
- 建立订单生成和订单完成检测机制
```

</details>

<details>
<summary><strong>阶段三：多人联机模式</strong></summary>

```
多人联机模式
- 设计多人游戏房间状态表
- 通过云函数和数据库实现实时状态同步
```

</details>

<details>
<summary><strong>阶段四：完善安全和清洁逻辑</strong></summary>

```
完善安全和清洁逻辑
- 实现超时惩罚和火灾机制
- 添加灭火和恢复流程
- 建立餐具清洁循环
- 添加烤糊食物处理
```

</details>

> 💡 **学习要点**：通过这些提示词可以看出，AI游戏开发的关键是**分层次实现功能**，从游戏机制到技术实现，从单机到联机，逐步构建完整的游戏体验。

## 🤖 项目特色

这是一个**AI编程实践案例**，从需求分析到完整游戏，全程通过与AI对话完成开发：

- 🧠 **纯AI开发**：通过自然语言描述需求，AI生成全部代码
- 🎯 **学习参考**：展示AI辅助游戏开发的完整workflow和最佳实践
- 📚 **提示词分享**：公开完整的开发提示词，供学习参考
- 🚀 **一键部署**：结合CloudBase AI ToolKit实现智能部署
- 💡 **最佳实践**：展示React + Phaser + CloudBase游戏开发的标准架构

## 游戏特点

- 🍳 **真正的合作料理**：基于云数据库实时监听，支持跨设备、跨平台的实时合作烹饪
- ⚡ **零延迟同步**：利用腾讯云开发实时数据库，操作瞬间同步到队友端
- 🎮 **多人房间系统**：创建私人厨房或加入公开对战，支持密码保护
- 🏆 **竞技排行榜**：实时记录最高分和游戏数据，展示厨师实力排名
- 📱 **跨端游戏体验**：完美支持手机、平板、电脑多设备联机合作
- 🔄 **断线重连机制**：网络波动不影响游戏，自动恢复游戏状态
- 🎯 **实时状态监控**：队友位置、操作动作实时可见
- 🎁 **云端游戏逻辑**：服务端验证游戏状态，确保公平游戏体验

## 项目架构

### 前端技术栈

- **框架**：React 18 + Hooks
- **游戏引擎**：Phaser 3
- **构建工具**：Vite
- **路由管理**：React Router 6（使用 HashRouter）
- **样式框架**：Tailwind CSS + DaisyUI
- **动画效果**：Framer Motion
- **云开发SDK**：@cloudbase/js-sdk

### 云开发资源

本项目使用了以下腾讯云开发（CloudBase）资源来实现联机合作功能：

#### 1. 数据库集合

- **`game_rooms`**: 游戏房间集合

  - `_id`: 房间ID（自动生成）
  - `roomCode`: 6位房间邀请码（如：AB1234）
  - `status`: 房间状态（waiting/playing/finished）
  - `maxPlayers`: 最大玩家数（默认2）
  - `currentPlayers`: 当前玩家数
  - `players`: 玩家列表数组
    - `playerId`: 玩家ID
    - `nickname`: 玩家昵称
    - `isHost`: 是否为房主
    - `isReady`: 是否准备就绪
    - `position`: 玩家位置 { x, y }
    - `holding`: 手持物品
  - `gameState`: 游戏状态对象
    - `score`: 当前分数
    - `timeLeft`: 剩余时间（秒）
    - `completedOrders`: 已完成订单数
    - `currentOrder`: 当前订单信息
    - `stations`: 工作台数组（切菜台、烹饪台、出餐台等）
    - `plates`: 盘子状态数组
    - `groundItems`: 地面物品数组
  - `createdAt`: 创建时间
  - `updatedAt`: 更新时间
- **`game_actions`**: 游戏动作同步集合

  - `_id`: 动作ID（自动生成）
  - `roomId`: 房间ID
  - `playerId`: 玩家ID
  - `actionType`: 动作类型（move/pickup/plateUpdate/stationUpdate等）
  - `actionData`: 动作数据对象
    - `position`: 位置信息 { x, y }（针对move动作）
    - `item`: 物品信息（针对pickup动作）
    - `contents`: 盘子内容（针对plateUpdate动作）
    - `plateType`: 盘子类型（针对plateUpdate动作）
    - `plateId`: 盘子ID（针对plateUpdate动作）
  - `timestamp`: 动作时间戳
- **`game_scores`**: 游戏分数记录集合

  - `_id`: 记录ID（自动生成）
  - `_openid`: 用户唯一标识（TCB_UUID或匿名ID）
  - `mode`: 游戏模式（single/multiplayer）
  - `nickname`: 玩家昵称
  - `totalScore`: 总积分
  - `bestScore`: 最佳单局分数
  - `gamesPlayed`: 游戏局数
  - `totalCompletedOrders`: 总完成订单数
  - `totalGameTime`: 总游戏时长（秒）
  - `lastPlayTime`: 最后游戏时间
  - `createTime`: 记录创建时间

#### 2. 云函数

- **`gameRoom`**: 游戏房间管理云函数

  - 创建房间 (createRoom)
  - 加入房间 (joinRoom)
  - 离开房间 (leaveRoom)
  - 获取房间信息 (getRoomInfo)
  - 开始游戏 (startGame)
- **`gameSync`**: 游戏状态同步云函数

  - 同步玩家动作 (syncPlayerAction)
  - 更新游戏状态 (updateGameState)
  - 完成订单 (completeOrder)
  - 结束游戏 (endGame)
  - 获取动作历史 (getActionHistory)
  - 获取服务器时间 (getServerTime)
- **`updateGameScore`**: 分数更新云函数

  - 更新玩家游戏记录和积分统计
- **`getLeaderboard`**: 排行榜管理云函数

  - 获取排行榜数据
  - 支持单机和联机模式分别排名

#### 3. 静态网站托管

- **部署路径**: `/overcooked-game/`（可自定义）
- **访问域名**: 您的云开发环境静态托管域名
- **CDN缓存**: 支持全球CDN加速

## 开始使用

### 前提条件

- 安装 Node.js (版本 18 或更高)
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
// 将 'your-env-id' 替换为您的实际环境 ID
const envId = 'your-env-id';
```

#### 3. 创建数据库集合

在云开发控制台的数据库中创建以下集合,同时必须设置下数据库的权限，否则会导致无法同步

- `game_rooms`：游戏房间集合（权限建议设置为"所有人可读写"）
- `game_actions`：游戏动作同步集合（权限建议设置为"所有人可读写"）
- `game_scores`：游戏分数记录集合（权限建议设置为"所有人可读写"）


#### 4. 部署云函数

1. 确保 `cloudfunctions/` 目录下有完整的云函数代码
2. 使用云开发控制台或 CLI 部署以下云函数：
   - `gameRoom`：房间管理
   - `gameSync`：游戏同步
   - `getLeaderboard`：排行榜
   - `updateGameScore`：分数更新
3. 配置云函数权限，确保可以访问数据库

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
4. 上传 `dist` 目录中的文件到指定路径（如 `/overcooked-game`）
5. 记录访问域名，用于后续访问

## 目录结构

```
├── public/               # 静态资源
├── src/
│   ├── components/       # 可复用组件
│   │   ├── Footer.vue        # 页脚组件
│   │   ├── PlayerInfo.vue    # 玩家信息组件
│   │   └── RoomCard.vue      # 房间卡片组件
│   ├── game/            # 游戏逻辑
│   │   ├── GameScene.js      # 主游戏场景
│   │   ├── Kitchen.js        # 厨房管理
│   │   └── OrderSystem.js    # 订单系统
│   ├── pages/           # 页面组件
│   │   ├── HomePage.jsx      # 首页
│   │   ├── GameModePage.jsx  # 游戏模式选择
│   │   ├── GamePage.jsx      # 游戏页面
│   │   ├── MultiplayerLobby.jsx # 联机大厅
│   │   └── LeaderboardPage.jsx  # 排行榜
│   ├── utils/           # 工具函数
│   │   ├── cloudbase.js      # 云开发初始化
│   │   └── gameUtils.js      # 游戏工具函数
│   ├── App.jsx          # 应用入口
│   ├── main.jsx         # 渲染入口
│   └── App.css          # 应用样式
├── cloudfunctions/      # 云函数目录
│   ├── gameRoom/        # 房间管理云函数
│   ├── gameSync/        # 游戏同步云函数
│   ├── getLeaderboard/  # 排行榜云函数
│   └── updateGameScore/ # 分数更新云函数
├── cloudbaserc.json    # 云开发配置
├── index.html          # HTML 模板
├── tailwind.config.js  # Tailwind 配置
├── vite.config.js      # Vite 配置
└── package.json        # 项目依赖
```

## 云函数 API

### 1. 游戏房间管理 (gameRoom)

```javascript
// 创建房间
{
  action: "createRoom",
  playerInfo: {
    playerId: "player_123",
    nickname: "玩家昵称"
  }
}

// 加入房间
{
  action: "joinRoom",
  roomCode: "AB1234",
  playerInfo: {
    playerId: "player_456", 
    nickname: "玩家昵称"
  }
}

// 离开房间
{
  action: "leaveRoom",
  roomId: "房间ID",
  playerId: "player_123"
}

// 获取房间信息
{
  action: "getRoomInfo",
  roomId: "房间ID"
}

// 开始游戏
{
  action: "startGame",
  roomId: "房间ID",
  playerId: "player_123"
}
```

### 2. 游戏状态同步 (gameSync)

```javascript
// 同步玩家动作
{
  action: "syncPlayerAction",
  roomId: "房间ID",
  playerId: "player_123",
  actionType: "move", // move/pickup/plateUpdate/stationUpdate等
  actionData: {
    position: { x: 100, y: 200 },
    holding: "tomato" // 可选，手持物品
  }
}

// 同步盘子状态
{
  action: "syncPlayerAction",
  roomId: "房间ID", 
  playerId: "player_123",
  actionType: "plateUpdate",
  actionData: {
    plateId: "plate_001",
    contents: ["chopped_tomato", "chopped_lettuce"],
    plateType: "dinner_plate",
    position: { x: 200, y: 150 },
    visible: true,
    active: true
  }
}

// 更新游戏状态
{
  action: "updateGameState",
  roomId: "房间ID",
  gameStateUpdate: {
    score: 50,
    timeLeft: 120,
    completedOrders: 3
  }
}

// 完成订单
{
  action: "completeOrder",
  roomId: "房间ID",
  orderData: {
    points: 15,
    orderId: "order_001"
  }
}

// 开始游戏（设置时间）
{
  action: "startGame",
  roomId: "房间ID",
  gameDuration: 180000 // 毫秒，默认180秒
}

// 结束游戏
{
  action: "endGame",
  roomId: "房间ID",
  finalScore: 85
}

// 获取服务器时间
{
  action: "getServerTime"
}

// 获取动作历史
{
  action: "getActionHistory",
  roomId: "房间ID",
  limit: 50 // 可选，默认50条
}
```

### 3. 分数更新 (updateGameScore)

```javascript
// 直接传参，无需action字段
{
  mode: "single", // "single" 或 "multiplayer"
  score: 85,
  completedOrders: 5,
  gameTime: 180, // 游戏时长（秒）
  nickname: "玩家昵称" // 可选
}
```

### 4. 排行榜查询 (getLeaderboard)

```javascript
// 获取排行榜
{
  mode: "single", // "single" 或 "multiplayer" 
  limit: 10 // 可选，默认获取前10名
}
```

## 游戏玩法说明

### 基础操作

- 🎮 **移动**：使用 WASD 键控制角色移动
- 🤏 **拾取/放下**：空格键拾取食材或放下物品
- 🔧 **使用工作台**：E键使用切菜台、炉灶等设备
- 🗑️ **丢弃物品**：Q键将手中物品放到地面

### 料理流程

1. **接订单**：查看右侧订单面板，了解需要制作的料理
2. **准备食材**：从食材台拾取所需的原料
3. **处理食材**：使用切菜台切菜，用炉灶烹饪
4. **装盘出餐**：将处理好的食材放到盘子上，送到出餐台

### 合作要点

- 🤝 **分工合作**：一人准备食材，一人负责烹饪
- ⏰ **时间管理**：关注订单倒计时，优先完成高分订单
- 🧹 **保持整洁**：及时清洗脏盘子，保持厨房井然有序
- 💬 **沟通协调**：与队友配合，避免重复劳动

### 评分系统

- 🏆 **基础分数**：按时完成订单获得基础分数
- ⚡ **速度奖励**：提前完成获得时间奖励
- 🎯 **连击奖励**：连续完成订单获得连击加分
- 📊 **排行榜**：最高分记录到全球排行榜

### 合作游戏技术亮点

1. **免注册体验**：使用匿名登录，降低用户使用门槛
2. **实时同步**：基于云数据库 Watch 监听，实现毫秒级动作同步
3. **动作记录**：所有游戏动作记录在 `game_actions` 集合中，确保状态一致性
4. **跨设备合作**：支持手机、平板、电脑之间的跨设备合作游戏
5. **网络优化**：自动重连机制，网络波动不影响合作体验

> 💡 **AI开发优势**：通过AI生成的游戏架构清晰、逻辑完整，非常适合学习CloudBase实时游戏开发的最佳实践。

## 开发指南

### 添加新功能

1. **新订单类型**

   - 在 `src/game/OrderSystem.js` 中添加新的订单配置
   - 更新订单验证逻辑
2. **新厨房设备**

   - 在 `src/game/Kitchen.js` 中添加新的工作台类型
   - 实现对应的交互逻辑
3. **云函数更新**

   - 在相应云函数中添加新的 action 处理
   - 更新数据库schema（如有需要）

### 常见问题

1. **游戏同步问题**

   - 检查实时数据库监听是否正常
   - 确认 `game_actions` 集合的权限设置
2. **性能优化**

   - Phaser游戏场景优化在 `src/game/GameScene.js`
   - 定期清理已处理的游戏动作记录

## 后续优化建议

### 游戏内容扩展

- [ ] **更多厨房设备**：烤箱、微波炉、搅拌机等新设备
- [ ] **丰富订单类型**：披萨、面条、甜品等更多料理
- [ ] **关卡系统**：不同难度的厨房布局和挑战
- [ ] **角色定制**：厨师形象和技能定制
- [ ] **成就系统**：完成特定挑战解锁成就

### 社交功能增强

- [ ] **好友系统**：添加好友，快速邀请合作
- [ ] **团队排行榜**：基于 `game_scores` 集合的排名系统
- [ ] **语音聊天**：游戏内语音沟通
- [ ] **表情系统**：快速表达情绪和指令
- [ ] **回放系统**：基于 `game_actions` 记录回放精彩合作片段

### 技术升级

- [ ] **WebRTC支持**：点对点连接，降低延迟
- [ ] **AI厨师助手**：单人练习时的AI队友
- [ ] **自定义厨房**：玩家设计专属厨房布局

## 🚀 学习实践指南

如果您想基于此项目学习AI游戏开发或搭建类似应用：

1. **研究源码结构**：了解React + Phaser + CloudBase游戏架构设计
2. **分析提示词**：学习如何与AI协作，逐步完成复杂游戏需求
3. **实践开发**：
   - 克隆项目到本地：`git clone ...`
   - 安装依赖：`npm install`
   - 配置您的云开发环境（参考配置说明）
   - 本地运行：`npm run dev`
   - 部署测试：`npm run build` + 部署到CloudBase

## 💡 扩展学习方向

基于本项目的技术架构，您可以学习开发：

**合作游戏类**

- 实时策略游戏
- 多人解谜游戏
- 团队竞技游戏
- 在线桌游平台

**实时应用类**

- 协作绘图工具
- 多人文档编辑
- 团队项目管理
- 在线会议白板

**核心技术要点**：实时状态同步、多人交互设计、游戏性能优化

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/NewFeature`)
3. 提交更改 (`git commit -m 'Add some NewFeature'`)
4. 推送到分支 (`git push origin feature/NewFeature`)
5. 开启 Pull Request

## 许可证

MIT License
