# SoulChat - 匿名随机聊天应用

SoulChat 是一款基于 UniApp 和腾讯云开发（CloudBase）构建的匿名随机聊天应用，让用户能够随机匹配在线用户进行实时聊天，享受真实而安全的匿名交流体验。应用支持多平台部署，包括 **H5**、**微信小程序**、**支付宝小程序**、**抖音小程序** 以及 **App (iOS/Android)**。

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效，支持AI生成全栈代码、一键部署至腾讯云开发（免服务器）、智能日志修复。

## 📦 在线体验
- **H5 体验**：[点击访问](https://cloudbase-test-v1-8e8tzqa7290d87-1259218801.tcloudbaseapp.com/soulchat-h5/?t=20250731#/)

## 🎬 效果演示

**多端实时匹配 + 聊天演示：**

### 📱 小程序端跨端匹配
![支付宝×抖音](https://636c-cloudbase-test-v1-8e8tzqa7290d87-1259218801.tcb.qcloud.la/soulChat/alipay-toutiao.gif)
*支付宝小程序 ↔️ 抖音小程序 实时匹配聊天*

### 🌐 Web端跨端通信
![H5×微信](https://636c-cloudbase-test-v1-8e8tzqa7290d87-1259218801.tcb.qcloud.la/soulChat/h5-weixin.gif)
*H5端 ↔️ 微信小程序 无缝对话*

### 📲 原生App互通
![Android×iOS](https://636c-cloudbase-test-v1-8e8tzqa7290d87-1259218801.tcb.qcloud.la/soulChat/android-ios.gif)
*Android ↔️ iOS 跨平台聊天*

**一套代码，六端运行，实时通信无缝切换！** ✨

## 🌟 产品特色

- 🎯 **随机匹配**：智能匹配在线用户，每次都是新的惊喜
- 💫 **完全匿名**：保护用户隐私，无需透露真实身份
- ⚡ **实时聊天**：基于云开发实现的高性能实时消息传输
- 🛡️ **安全可靠**：基于腾讯云开发的安全架构，数据传输加密
- 📱 **多端同步**：一套代码适配多个平台，体验一致

## 🚀 核心功能

### 匹配系统
- **随机匹配**：随机匹配在线用户，支持匹配状态实时显示
- **匹配计时器**：显示匹配等待时间，可随时取消匹配
- **连接状态监控**：实时显示连接状态和用户在线情况

### 聊天功能
- **实时消息传输**：基于云开发实现的高性能实时聊天
- **消息状态显示**：显示消息发送、已读等状态
- **消息时间戳**：准确显示消息发送时间
- **退出确认机制**：防误操作的退出确认对话框

## 🚀 快速开始

### VS Code 预览功能

本项目已配置 VS Code 预览功能，支持自动打开浏览器预览：

1. 在 VS Code 中打开项目
2. 项目会自动加载 `.vscode/preview.yml` 配置
3. 启动开发服务器后会自动打开浏览器预览页面
4. 默认端口：5173

配置文件位置：`.vscode/preview.yml`

### 安装步骤

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置云开发环境**
   
   编辑 `src/utils/cloudbase.ts` 文件：
   ```typescript
   // 将环境ID替换为您的云开发环境ID
   const ENV_ID: string = 'your-cloudbase-env-id';
   ```

3. **云开发控制台配置**
   
   在 [云开发控制台](https://console.cloud.tencent.com/tcb) 完成以下配置：
   
   - **身份认证**：开启短信验证码登录
   - **数据库**：创建聊天相关的数据集合
   - **云函数**：部署匹配和消息处理相关的云函数

4. **启动开发服务**
   ```bash
   # H5 开发
   npm run dev:h5
   
   # 微信小程序开发
   npm run dev:mp-weixin
   
   # 支付宝小程序开发
   npm run dev:mp-alipay
   
   # App 开发（需要在 HBuilderX 中进行）
   # 打开 HBuilderX，导入项目后点击运行到手机或模拟器
   ```

### 环境配置详细说明


#### 1. 配置安全域名（H5 端）

在云开发控制台的【环境配置】->【安全来源】->【安全域名】中添加：
- 开发域名：`http://localhost:5173`（本地开发）
- 生产域名：您的实际部署域名

#### 2. 配置安全域名（抖音小程序、支付宝小程序）
在云开发控制台的【环境配置】->【安全来源】->【安全域名】中添加域名：

- 抖音小程序开发域名：`tmaservice.developer.toutiao.com`
- 支付宝开发域名：`devappid.hybrid.alipay-eco.com`

#### 3. 配置微信小程序域名

在微信小程序管理后台的【开发】->【开发管理】->【开发设置】->【服务器域名】中配置：

**request 合法域名：**
```
https://tcb-api.tencentcloudapi.com
https://your-env-id.service.tcloudbase.com
```

**uploadFile 合法域名：**
```
https://cos.ap-shanghai.myqcloud.com
```

**downloadFile 合法域名：**
```
https://your-env-id.tcb.qcloud.la
https://cos.ap-shanghai.myqcloud.com
```

> 注意：请将 `your-env-id` 替换为您的实际环境 ID，地域根据您的云开发环境所在地域调整。

#### 4. （仅 App 端需要）配置安全应用来源
在云开发控制台的【环境配置】->【安全来源】->【移动应用安全来源】中添加应用：
- 应用标识：`your-appSign`
- 应用凭证：`your-appAccessKey`

在 `src/utils/cloudbase.ts` 文件中，找到 `appConfig` 对象，填入您获取到的凭证信息：

```typescript
const appConfig = {
    env: config.env || ENV_ID,
    timeout: config.timeout || 15000,
    appSign: 'your-appSign', // 应用标识
    appSecret: {
        appAccessKeyId: 1, // 凭证版本
        appAccessKey: 'your-appAccessKey' // 凭证
    }
}
```

## 📋 技术架构

### 前端技术栈
- **UniApp**：基于 Vue 3 Composition API 的跨平台框架
- **TypeScript**：提供完整的类型支持和更好的开发体验
- **Vite**：现代化的构建工具，支持热更新和快速编译
- **uni-ui**：官方UI组件库，确保各平台体验一致

### 后端服务（云开发）
- **身份认证**：多种登录方式，安全的用户身份验证
- **云数据库**：存储用户信息、聊天记录、匹配关系等数据
- **云函数**：处理匹配逻辑、消息推送等业务逻辑
- **实时数据库**：支持实时消息传输和状态同步
- **云存储**：存储用户上传的文件和媒体资源

### 支持平台
- ✅ **H5**：移动端浏览器和桌面端浏览器
- ✅ **微信小程序**：微信生态内的完整体验
- ✅ **支付宝小程序**：支付宝平台适配
- ✅ **抖音小程序**：字节跳动生态支持
- ✅ **App (iOS/Android)**：原生应用体验
- 🔄 **其他平台**：更多平台适配开发中

## 📁 项目结构

```
soulChat/
├── src/
│   ├── components/
│   │   └── show-captcha.vue          # 验证码弹窗组件
│   ├── pages/
│   │   ├── index/                    # 应用首页
│   │   │   └── index.vue            # 欢迎页面，品牌展示
│   │   ├── login/                   # 登录模块
│   │   │   ├── index.vue            # 登录方式选择页
│   │   │   ├── phone-login.vue      # 手机验证码登录
│   │   │   ├── email-login.vue      # 邮箱验证码登录
│   │   │   └── password-login.vue   # 密码登录
│   │   ├── chat/                    # 聊天功能核心
│   │   │   ├── home.vue             # 聊天主页，匹配功能
│   │   │   └── room.vue             # 聊天房间，实时消息
│   │   ├── profile/                 # 用户中心
│   │   │   └── profile.vue          # 用户信息管理
│   │   └── demo/                    # 云开发功能演示
│   │       └── demo.vue             # CloudBase API 演示
│   ├── utils/
│   │   ├── cloudbase.ts             # 云开发 SDK 配置
│   │   └── index.ts                 # 通用工具函数
│   ├── static/                      # 静态资源
│   ├── App.vue                      # 应用入口组件
│   ├── main.ts                      # 应用启动文件
│   ├── pages.json                   # 页面路由配置
│   └── manifest.json                # 应用配置文件
├── package.json                     # 项目依赖配置
├── vite.config.ts                   # Vite 构建配置
├── tsconfig.json                    # TypeScript 配置
└── README.md                        # 项目说明文档
```

## 📋 需求分析与设计

**AI辅助的结构化开发流程：**

![对比图](https://636c-cloudbase-test-v1-8e8tzqa7290d87-1259218801.tcb.qcloud.la/soulChat/%E9%9C%80%E6%B1%82%E5%88%86%E6%9E%90.png)

**📋 开发流程三个阶段：**

### Step 1：需求明确

将初始想法转化为具体的功能需求：
```
基于当前 CloudBase-UniApp 模板开发一个匿名聊天社交应用 SoulChat，功能要求：
1. 提供手机号验证码登录
2. 用户点击匹配按钮时，系统开始寻找也在匹配中的在线用户
3. 匹配成功后，用户能够与对方进行实时文字聊天，双方消息能够即时收发
4. 当任意一方退出房间时聊天结束
```

AI会自动生成详细的用户故事和验收标准：

![需求生成](https://636c-cloudbase-test-v1-8e8tzqa7290d87-1259218801.tcb.qcloud.la/soulChat/%E9%9C%80%E6%B1%82%E6%96%87%E6%A1%A3.png)

### Step 2：系统设计

基于需求文档，AI协助完成：
- 🏗️ 整体技术架构设计
- 🗄️ 数据库结构规划  
- 🔌 接口定义和设计
- ☁️ 云函数模块划分

例如在实时聊天系统中，AI 会生成房间管理函数和聊天信息表设计等。

![房间管理函数](https://636c-cloudbase-test-v1-8e8tzqa7290d87-1259218801.tcb.qcloud.la/soulChat/function.png)

![聊天信息表](https://636c-cloudbase-test-v1-8e8tzqa7290d87-1259218801.tcb.qcloud.la/soulChat/data.png)


> ⚠️ **注意事项：** 我在开发过程中发现 AI 在迭代生成代码过程中，有时会偏离原始的设计文档，这时可指定要求它进行修正，严格遵守系统设计

### Step 3：任务规划

生成具有依赖关系的详细开发任务：

![任务列表](https://636c-cloudbase-test-v1-8e8tzqa7290d87-1259218801.tcb.qcloud.la/soulChat/task.png)

---

## 🎯 核心页面功能

**📱 页面功能实现**

通过AI辅助快速生成页面代码：

```bash
根据需求文档和基础架构设计，生成 SoulChat 应用的前端页面代码。页面应包括以下功能模块：
1. 首页：展示应用介绍、手机号验证码登录功能。
2. 匹配页面：展示当前在线用户、匹配进度、开始匹配按钮。
3. 聊天房间页面：显示聊天消息、输入框、发送按钮、消息状态（发送中、已发送、失败）。
4. UI 样式：简洁清晰的设计风格。

请确保组件的模块化和代码的可维护性，页面设计兼容多端平台，优化响应式布局。
```

**页面实现效果：**

![](https://636c-cloudbase-test-v1-8e8tzqa7290d87-1259218801.tcb.qcloud.la/soulChat/UI1.jpg) 
![](https://636c-cloudbase-test-v1-8e8tzqa7290d87-1259218801.tcb.qcloud.la/soulChat/UI2.jpg)

### 首页 (index/index.vue)
- 品牌展示和产品介绍
- 功能特色说明
- 进入聊天的入口

### 聊天主页 (chat/home.vue)
- 用户信息展示和头像生成
- 智能匹配系统（开始匹配、匹配状态、取消匹配）
- 匹配计时器和状态动画
- 用户在线状态管理

### 聊天房间 (chat/room.vue)
- 实时消息收发
- 消息状态显示（发送中、已发送、已读）
- 消息时间戳格式化
- 连接状态监控
- 退出确认机制


## 🛠️ 核心技术实现

### 🌐 uniapp适配方案

```javascript
import cloudbase from '@cloudbase/js-sdk'
import adapter from '@cloudbase/adapter-uni-app'

// 使用 UniApp 适配器
cloudbase.useAdapters(adapter,{uni: uni});

// 统一的CloudBase初始化
const app = cloudbase.init({
  env: 'your-env-id'
})
```

### 🔥 实时通信架构

```javascript
// 使用CloudBase实时数据库监听查找等待中的其他用户
const waitingUsers = await db.collection('match_queue')
    .where({
    uid: _.neq(uid),
    status: 'waiting',
    createTime: _.gte(new Date(Date.now() - 30000)) // 30秒内的队列记录
    })
    .orderBy('createTime', 'asc')
    .limit(1)
    .get()
```


### 💬 消息监听处理

```javascript
try {
    const db = app.database()
    
    messageWatcher = db.collection('messages')
      .where({
        roomId: roomId
      })
      .orderBy('sendTime', 'asc')
      .watch({
        onChange: (snapshot: any) => {
                //处理逻辑
              }
            })
          }
        },
        onError: (error) => {
          console.error('消息监听失败:', error)
        }
      })
  } catch (error) {
    console.error('启动消息监听失败:', error)
  }

```

## 🗂️ 数据库设计
基于业务需求，设计了4个核心数据集合：

| 集合名称 | 功能用途 | 主要字段 |
|---------|----------|----------|
| `users` | 用户基础信息 | uid, nickname, status等 |
| `match_queue` | 匹配队列管理 | userInfo, status, createTime等 |
| `chat_rooms` | 聊天室信息 | roomId, participants, status等 |
| `messages` | 消息记录存储 | roomId, senderId, content等 |

![数据库创建](https://636c-cloudbase-test-v1-8e8tzqa7290d87-1259218801.tcb.qcloud.la/soulChat/%E6%95%B0%E6%8D%AE%E8%A1%A8%E5%88%9B%E5%BB%BA.png)

> ⚠️ **配置要点：** 需要为数据库集合设置适当的读写权限，确保实时监听功能正常工作



## 🌐 多平台适配状态

| 平台 | 状态 | 功能完整度 | 备注 |
|------|------|------------|------|
| **H5** | ✅ 已完成 | 100% | 支持所有功能，推荐部署平台 |
| **微信小程序** | ✅ 已完成 | 100% | 完整支持，包含微信授权登录 |
| **支付宝小程序** | ✅ 已完成 | 100% | 全功能支持 |
| **抖音小程序** | ✅ 已完成 | 100% | 适配完成，体验良好 |
| **App (iOS/Android)** | ✅ 已完成 | 100% | 原生应用体验 |


## 🔧 自定义开发

### 扩展功能建议

1. **多媒体消息**
   - 图片、语音、视频消息支持
   - 表情包和贴纸功能

2. **用户系统增强**
   - 用户等级和积分系统
   - 兴趣标签和智能匹配

3. **社交功能**
   - 好友系统和聊天记录
   - 群聊和话题讨论

4. **管理功能**
   - 内容审核和违规处理
   - 用户举报和封禁机制

### 技术优化方向

1. **性能优化**
   - 消息分页加载
   - 图片懒加载和压缩
   - 缓存策略优化

2. **用户体验**
   - 离线消息处理
   - 消息推送通知
   - 网络状态监控

3. **安全性增强**
   - 内容过滤和敏感词检测
   - 防骚扰和垃圾信息机制
   - 数据加密传输

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

<div align="center">
  <p><strong>SoulChat - 让心灵自由交流 💬</strong></p>
  <p>由 <a href="https://tcb.cloud.tencent.com/">腾讯云开发</a> 强力驱动</p>
</div>