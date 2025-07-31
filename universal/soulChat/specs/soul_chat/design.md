# 技术方案设计

## 技术架构

### 前端架构
- **框架**: UniApp + Vue 3 Composition API  
- **状态管理**: Vue 3 Reactivity API + 本地存储
- **UI组件**: 原生组件 + 自定义组件
- **类型支持**: TypeScript
- **构建工具**: Vite

### 后端架构
- **云平台**: 腾讯云开发 CloudBase
- **身份认证**: CloudBase Auth（手机验证码登录）
- **数据库**: CloudBase 云数据库（文档型数据库）
- **实时通信**: CloudBase 数据库实时监听（watch）
- **云函数**: CloudBase 云函数（匹配逻辑、房间管理）

## 技术选型

### 前端技术栈
1. **UniApp**: 跨平台支持，一套代码多端运行
2. **Vue 3**: 现代化响应式框架，Composition API
3. **TypeScript**: 类型安全，提升开发体验
4. **CloudBase JS SDK**: 云开发前端SDK

### 后端技术栈
1. **CloudBase 云数据库**: NoSQL文档数据库，支持实时监听
2. **CloudBase 云函数**: Serverless函数计算，处理业务逻辑
3. **CloudBase Auth**: 身份认证服务，支持手机验证码登录

## 数据库设计

### 用户表 (users)
```javascript
{
  _id: "user_id",           // 用户ID
  phone: "13800138000",     // 手机号
  nickname: "匿名用户001",   // 昵称（随机生成）
  avatar: "avatar_url",     // 头像（预设头像）
  status: "online",         // 状态: online/offline/matching/chatting
  lastActive: Date,         // 最后活跃时间
  createTime: Date,         // 创建时间
  _openid: "openid"         // CloudBase 用户标识
}
```

### 匹配队列表 (match_queue)
```javascript
{
  _id: "queue_id",          // 队列ID
  userId: "user_id",        // 用户ID
  status: "waiting",        // 状态: waiting/matched/timeout
  createTime: Date,         // 加入队列时间
  matchedWith: "user_id",   // 匹配到的用户ID（可选）
  _openid: "openid"         // CloudBase 用户标识
}
```

### 聊天房间表 (chat_rooms)
```javascript
{
  _id: "room_id",           // 房间ID
  participants: [],         // 参与者ID数组 [user1_id, user2_id]
  status: "active",         // 状态: active/closed
  createTime: Date,         // 创建时间
  lastMessageTime: Date,    // 最后消息时间
  closeReason: "user_left"  // 关闭原因（可选）
}
```

### 聊天消息表 (chat_messages)
```javascript
{
  _id: "message_id",        // 消息ID
  roomId: "room_id",        // 房间ID
  senderId: "user_id",      // 发送者ID
  content: "消息内容",       // 消息内容
  type: "text",             // 消息类型: text
  sendTime: Date,           // 发送时间
  status: "sent",           // 状态: sending/sent/failed
  _openid: "openid"         // CloudBase 用户标识
}
```

## 接口设计

### 云函数接口

#### 1. 用户匹配函数 (userMatch)
```javascript
// 输入参数
{
  action: "join" | "cancel" | "check"  // 操作类型
}

// 返回结果
{
  code: 0,                    // 状态码 0-成功
  message: "success",         // 消息
  data: {
    roomId: "room_id",        // 房间ID（匹配成功时）
    status: "matched"         // 匹配状态
  }
}
```

#### 2. 房间管理函数 (roomManager)
```javascript
// 输入参数
{
  action: "leave" | "close",  // 操作类型
  roomId: "room_id"           // 房间ID
}

// 返回结果
{
  code: 0,                    // 状态码
  message: "success",         // 消息
  data: {}
}
```

### 前端页面设计

#### 页面结构
```
src/pages/
├── login/                  # 登录相关页面
│   └── phone-login.vue    # 手机验证码登录（复用现有）
├── chat/                   # 聊天相关页面
│   ├── home.vue           # 聊天主页（匹配页面）
│   └── room.vue           # 聊天房间页面
└── profile/               # 用户信息页面（复用现有）
    └── profile.vue
```

## 实时通信方案

使用 CloudBase 数据库的 watch 功能实现实时通信：

1. **消息监听**: 监听 chat_messages 集合的变化
2. **房间状态监听**: 监听 chat_rooms 集合的状态变化
3. **匹配结果监听**: 监听 match_queue 集合的匹配结果

## 安全性考虑

1. **数据库权限**: 
   - users: 仅创建者可读写
   - match_queue: 仅创建者可读写
   - chat_rooms: 参与者可读写
   - chat_messages: 房间参与者可读写

2. **云函数安全**: 
   - 验证用户身份
   - 参数校验
   - 防止恶意请求

3. **前端安全**:
   - 输入内容过滤
   - XSS防护
   - 敏感信息保护

## 性能优化策略

1. **数据库优化**:
   - 添加必要索引
   - 限制查询数量
   - 定期清理过期数据

2. **前端优化**:
   - 消息分页加载
   - 图片懒加载
   - 组件按需加载

3. **云函数优化**:
   - 减少冷启动
   - 合理设置超时时间
   - 错误重试机制

## 测试策略

1. **单元测试**: 核心业务逻辑函数测试
2. **集成测试**: 前后端接口集成测试  
3. **端到端测试**: 完整用户流程测试
4. **兼容性测试**: 多端运行兼容性测试

## 部署方案

1. **开发环境**: 使用 cloudbase-test-v1-8e8tzqa7290d87
2. **云函数部署**: 自动部署到 CloudBase
3. **静态托管**: H5版本部署到云开发静态托管
4. **小程序发布**: 打包发布到各小程序平台 