# 五子棋实时联机对战

一个完全通过**AI编程**开发的实时联机对战五子棋应用，基于 Vue 3 + Vite + 腾讯云开发（CloudBase）构建，展示了AI辅助开发全栈应用的完整过程。


## 💻 效果演示

![](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/turbo-deploy/turbo-deploy-004.png)

## 在线体验

[🎮 立即体验联机对战](https://cloud1-5g39elugeec5ba0f-1300855855.tcloudbaseapp.com/gobang/?t=1234)

> 💡 **对战小贴士**：邀请朋友一起游戏，创建房间后分享房间号，即可开始跨设备实时对弈！
> 
> 📝 **说明**：这是AI开发的完整应用演示。想要学习如何用AI开发类似应用，请参考下面的开发提示词和代码实现。

## 📝 AI开发提示词记录

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)  

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效，支持AI生成全栈代码、一键部署至腾讯云开发（免服务器）、智能日志修复。

首先可以按照 [CloudBase AI ToolKit 快速上手指南](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/getting-started) 准备好 AI 开发环境。

以下是开发本项目时使用的完整提示词，展示了如何通过自然语言与AI协作完成全栈应用开发：

<details>
<summary><strong>阶段一：项目需求描述</strong></summary>

```
我想开发一个在线五子棋游戏，功能要求：

1. 可以创建游戏房间，设置密码保护
2. 朋友可以通过房间号和密码加入游戏
3. 支持两人实时对战，也可以观战
4. 可以分享房间链接邀请朋友
5. 手机和电脑都能正常使用

请用Vue3做前端，腾讯云开发做后端，帮我开发这个游戏。
```

</details>

<details>
<summary><strong>阶段二：界面设计要求</strong></summary>

```
请设计以下几个页面：

1. 首页：有"创建房间"和"加入房间"两个按钮
2. 创建房间页：输入昵称，自动生成房间号和密码
3. 加入房间页：输入房间号、密码和昵称
4. 游戏页面：显示15x15的棋盘，可以点击下棋

界面要求：
- 设计要现代化、好看
- 手机和电脑都要适配
- 棋盘要清晰，容易点击
- 显示当前该谁下棋
- 有分享房间的功能

请用Tailwind CSS来做样式。
```

</details>

<details>
<summary><strong>阶段三：游戏功能实现</strong></summary>

```
请实现五子棋的游戏逻辑：

1. 游戏规则：
   - 15x15的棋盘
   - 黑白双方轮流下棋，黑棋先下
   - 横竖斜任意方向连成5个子就获胜

2. 需要的功能：
   - 检查下棋位置是否合法
   - 判断是否有人获胜
   - 多个人可以同时观看同一局游戏
   - 游戏结束后可以重新开始
   - 实时同步所有人看到的棋盘状态

3. 用户角色：
   - 房主（下黑棋）
   - 加入者（下白棋）  
   - 观战者（只能看不能下）
```

</details>

<details>
<summary><strong>阶段四：数据存储和实时同步</strong></summary>

```
请用腾讯云开发来存储游戏数据：

1. 需要存储的数据：
   - 房间信息（房间号、密码、玩家名单）
   - 棋盘状态（每个位置的棋子）
   - 游戏状态（等待开始、进行中、已结束）
   - 当前轮到谁下棋、谁获胜了

2. 实时同步：
   - 有人下棋时，其他人立即看到
   - 有新玩家加入时，所有人都知道
   - 游戏状态变化时，实时更新

3. 用云函数处理：
   - 创建和加入房间
   - 下棋操作
   - 游戏逻辑验证
```

</details>

<details>
<summary><strong>阶段五：分享和部署</strong></summary>

```
请完成以下功能：

1. 分享功能：
   - 生成包含房间号和密码的分享链接
   - 点击分享按钮可以复制邀请文字
   - 朋友点击链接可以直接进入房间

2. 项目部署：
   - 把前端页面部署到腾讯云，生成网址
   - 确保在手机浏览器和微信里都能正常打开
   - 部署后端云函数和数据库

3. 写一个README文档：
   - 说明这个项目是做什么的
   - 列出用到了哪些云开发资源
   - 如何本地运行和部署
```

</details>

> 💡 **学习要点**：通过这些提示词可以看出，AI开发的关键是**逐步细化需求**，从整体功能到具体实现，从前端界面到后端逻辑，层层递进完成复杂应用的开发。

## 🤖 项目特色

这是一个**AI编程实践案例**，从需求分析到完整应用，全程通过与AI对话完成开发：

- 🧠 **纯AI开发**：通过自然语言描述需求，AI生成全部代码
- 🎯 **学习参考**：展示AI辅助开发的完整workflow和最佳实践  
- 📚 **提示词分享**：公开完整的开发提示词，供学习参考
- 🚀 **一键部署**：结合CloudBase AI ToolKit实现智能部署
- 💡 **最佳实践**：展示Vue3 + CloudBase联机应用的标准架构



## 项目特点

- 🌐 **真正的联机对战**：基于云数据库实时监听，支持跨设备、跨平台的实时对弈
- ⚡ **零延迟同步**：利用腾讯云开发实时数据库，棋子落下瞬间同步到对手端
- 🎮 **多人房间系统**：创建私人房间或加入公开对战，支持密码保护
- 🏆 **竞技排行榜**：实时记录胜负战绩，展示玩家实力排名
- 📱 **跨端对战体验**：完美支持手机、平板、电脑多设备联机对战
- 🔄 **断线重连机制**：网络波动不影响对战，自动恢复游戏状态
- 🎯 **实时状态监控**：对手在线状态、落子动作实时可见
- 🎁 **云端游戏逻辑**：服务端验证每一步棋，杜绝作弊行为

## 项目架构

### 前端技术栈

- **框架**：Vue 3 + Composition API
- **构建工具**：Vite
- **状态管理**：Pinia
- **路由管理**：Vue Router 4（使用 HashRouter）
- **样式框架**：Tailwind CSS
- **云开发SDK**：@cloudbase/js-sdk

### 云开发资源

本项目使用了以下腾讯云开发（CloudBase）资源来实现联机对战功能：

#### 1. 数据库集合

- **`game_rooms`**: 游戏房间集合
  - `_id`: 房间ID
  - `name`: 房间名称
  - `password`: 房间密码
  - `gameStatus`: 游戏状态（waiting/playing/finished）
  - `board`: 棋盘数据（15x15二维数组）
  - `currentTurn`: 当前回合（black/white）
  - `blackPlayer`: 黑棋玩家信息 { id, name }
  - `whitePlayer`: 白棋玩家信息 { id, name }
  - `lastMove`: 最后一步棋 { row, col, player }
  - `winner`: 获胜者（black/white/draw/null）
  - `createdAt`: 创建时间

- **`user_rankings`**: 玩家排行榜集合
  - `_id`: 玩家ID
  - `name`: 玩家名称
  - `score`: 玩家分数
  - `wins`: 胜利场次
  - `losses`: 失败场次
  - `draws`: 平局场次
  - `totalGames`: 总游戏场次
  - `lastActiveAt`: 最后活跃时间

#### 2. 云函数

- **`gameRoom`**: 游戏房间管理云函数
  - 创建房间 (createRoom)
  - 加入房间 (joinRoom)
  - 落子逻辑 (placeStone)
  - 更新房间 (updateRoom)
  - 获取房间信息 (getRoomInfo)
  - 重新开始游戏 (restartGame)
  - 获取排行榜 (getRankings)
  - 胜负判定和分数更新

#### 3. 静态网站托管

- **部署路径**: `/gomoku`（可自定义）
- **访问域名**: 您的云开发环境静态托管域名
- **CDN缓存**: 支持全球CDN加速



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
// 将 'your-env-id' 替换为您的实际环境 ID
const envId = 'your-env-id';
```

#### 3. 创建数据库集合

在云开发控制台的数据库中创建以下集合：

- `game_rooms`：游戏房间集合（权限建议设置为"所有人可读，仅创建者可写"）
- `user_rankings`：排行榜集合（权限建议设置为"所有人可读，仅创建者可写"）

#### 4. 部署云函数

1. 确保 `cloudfunctions/gameRoom` 目录下有完整的云函数代码
2. 使用云开发控制台或 CLI 部署 `gameRoom` 云函数
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
4. 上传 `dist` 目录中的文件到指定路径（如 `/gomoku`）
5. 记录访问域名，用于后续访问

## 目录结构

```
├── public/               # 静态资源
├── src/
│   ├── assets/          # 静态资源文件
│   ├── components/      # 可复用组件
│   │   ├── GameBoard.vue    # 棋盘组件
│   │   ├── PlayerInfo.vue   # 玩家信息组件
│   │   └── RoomList.vue     # 房间列表组件
│   ├── router/          # 路由配置
│   │   └── index.js         # 路由定义
│   ├── stores/          # Pinia 状态管理
│   │   └── gameStore.js     # 游戏状态管理
│   ├── utils/           # 工具函数
│   │   ├── cloudbase.js     # 云开发初始化
│   │   └── gameUtils.js     # 游戏逻辑工具
│   ├── views/           # 页面组件
│   │   ├── Home.vue         # 首页
│   │   ├── Game.vue         # 游戏页面
│   │   └── Rankings.vue     # 排行榜页面
│   ├── App.vue          # 应用入口
│   ├── main.js          # 渲染入口
│   └── style.css        # 全局样式
├── cloudfunctions/       # 云函数目录
│   └── gameRoom/        # 游戏房间云函数
├── cloudbaserc.json     # 云开发配置
├── index.html           # HTML 模板
├── tailwind.config.js   # Tailwind 配置
├── postcss.config.js    # PostCSS 配置
├── vite.config.js       # Vite 配置
└── package.json         # 项目依赖
```

## 云函数 API

gameRoom 云函数支持以下操作：

### 1. 创建房间 (createRoom)

创建一个新的游戏房间。

```javascript
{
  action: "createRoom",
  data: {
    roomData: {
      name: "房间名称",
      password: "房间密码",
      blackPlayer: {
        id: "玩家ID",
        name: "玩家名称"
      }
    }
  }
}
```

### 2. 加入房间 (joinRoom)

加入一个已存在的游戏房间。

```javascript
{
  action: "joinRoom",
  data: {
    roomId: "房间ID",
    password: "房间密码",
    player: {
      id: "玩家ID",
      name: "玩家名称"
    }
  }
}
```

### 3. 落子 (placeStone)

在棋盘上放置一颗棋子。

```javascript
{
  action: "placeStone",
  data: {
    roomId: "房间ID",
    row: 7,
    col: 7,
    player: "black" // "black" 或 "white"
  }
}
```

### 4. 获取排行榜 (getRankings)

获取玩家排行榜。

```javascript
{
  action: "getRankings",
  data: {
    limit: 10 // 获取前10名玩家
  }
}
```

## 联机对战规则

- 🔵 **双人实时对弈**：黑棋先行，白棋后行，轮流落子
- 🏆 **获胜条件**：率先在棋盘上形成连续五子（横/纵/斜）的玩家获胜
- ⚖️ **平局判定**：棋盘下满且无人获胜时判为平局
- 🎯 **实时同步**：每一步棋瞬间同步到对手设备
- 📊 **积分系统**：获胜+3分，失败-1分，平局不计分
- 🏅 **排行榜**：根据积分实时更新玩家排名
- 🔄 **断线处理**：玩家掉线后可重新连接继续对战

## 云开发功能说明

### 初始化云开发

本项目在 `src/utils/cloudbase.js` 中集中管理云开发的初始化和匿名登录功能。

### 联机对战核心技术

通过 `src/utils/cloudbase.js` 实现实时对战功能：

```javascript
import { app, ensureLogin } from '../utils/cloudbase';

// 确保已登录
await ensureLogin();

// 创建对战房间
const result = await app.callFunction({
  name: 'gameRoom',
  data: {
    action: 'createRoom',
    data: { roomData }
  }
});

// 实时监听对手落子 - 联机对战的核心
const watcher = db.collection('game_rooms')
  .doc(roomId)
  .watch({
    onChange: (snapshot) => {
      const roomData = snapshot.data;
      // 实时同步棋盘状态
      updateGameBoard(roomData.board);
      // 更新当前回合
      updateCurrentTurn(roomData.currentTurn);
      // 检查游戏结果
      if (roomData.winner) {
        showGameResult(roomData.winner);
      }
    },
    onError: (error) => {
      console.error('对战连接错误:', error);
      // 实现重连机制
      reconnectToGame(roomId);
    }
  });

// 发送落子指令到对手
const placeStone = async (row, col) => {
  await app.callFunction({
    name: 'gameRoom',
    data: {
      action: 'placeStone',
      data: { roomId, row, col, player: currentPlayer }
    }
  });
};
```

### 联机对战技术亮点

1. **环境配置**：在 `src/utils/cloudbase.js` 中配置云开发环境 ID
2. **免注册体验**：使用匿名登录，降低用户使用门槛
3. **实时同步**：基于云数据库 Watch 监听，实现毫秒级对战同步
4. **防作弊设计**：所有游戏逻辑在云函数中验证，确保对战公平性
5. **跨设备联机**：支持手机、平板、电脑之间的跨设备对战
6. **网络优化**：自动重连机制，网络波动不影响对战体验

> 💡 **AI开发优势**：通过AI生成的代码架构清晰、注释完整，非常适合学习CloudBase实时应用开发的最佳实践。

## 开发指南

### 添加新功能

1. **数据库变更**
   - 在相应集合中添加新字段
   - 更新云函数中的数据库操作逻辑

2. **云函数更新**
   - 在 `gameRoom` 函数中添加新的 action
   - 更新函数配置和依赖

3. **前端开发**
   - 在 `stores/gameStore.js` 中添加新的状态和方法
   - 创建新的组件或更新现有组件
   - 更新路由配置（如有需要）

### 常见问题

1. **房间状态同步问题**
   - 检查实时数据库监听是否正常
   - 确认数据库权限配置是否正确

2. **游戏逻辑问题**
   - 胜负判定逻辑在云函数 `gameRoom` 中
   - 客户端游戏工具函数在 `utils/gameUtils.js`

3. **部署问题**
   - 确保构建命令正确执行
   - 检查云开发静态托管配置
   - 验证云函数是否正常运行

## 后续优化建议

### 联机对战增强
- [ ] **实时语音对话**：添加语音通话功能，让对战更有趣
- [ ] **观战系统**：支持其他玩家观看对战直播
- [ ] **好友联机**：添加好友系统，快速邀请好友对战
- [ ] **联机聊天**：对战过程中实时文字交流
- [ ] **对战重播**：保存并回看精彩对局

### 游戏体验优化  
- [ ] **断线重连**：优化网络断线后的重连体验
- [ ] **匹配系统**：智能匹配相近水平的对手
- [ ] **计时对战**：添加限时下棋模式，增加紧张感
- [ ] **悔棋申请**：联机对战中的悔棋协商机制
- [ ] **投降确认**：双方确认的投降机制

### 技术升级
- [ ] **WebRTC支持**：点对点连接，降低延迟
- [ ] **移动端优化**：针对触屏设备的操作优化
- [ ] **AI陪练模式**：单人练习时的AI对手

## 🚀 学习实践指南

如果您想基于此项目学习AI开发或搭建类似应用：

1. **研究源码结构**：了解Vue3 + CloudBase联机应用的架构设计
2. **分析提示词**：学习如何与AI协作，逐步完成复杂需求
3. **实践开发**：
   - 克隆项目到本地：`git clone ...`
   - 安装依赖：`npm install`
   - 配置您的云开发环境（参考配置说明）
   - 本地运行：`npm run dev`
   - 部署测试：`npm run build` + 部署到CloudBase

## 💡 扩展学习方向

基于本项目的技术架构，您可以学习开发：

**联机游戏类**
- 中国象棋、国际象棋
- 井字棋、四子棋  
- 德州扑克、斗地主
- 实时问答竞赛

**协作应用类**
- 在线白板协作
- 实时文档编辑
- 团队任务看板
- 在线投票系统

**核心技术要点**：实时数据同步、多人状态管理、云端业务逻辑验证

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License 