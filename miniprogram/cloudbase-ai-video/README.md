# TikTok风格短视频小程序 ✨

这是一个基于微信小程序云开发的TikTok风格短视频浏览应用，提供完整的视频浏览、发布和用户管理功能。

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)  

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效，支持AI生成全栈代码、一键部署至腾讯云开发（免服务器）、智能日志修复。

## 💻 效果演示
<div style="display: flex; gap: 15px; justify-content: center; align-items: flex-start; flex-wrap: wrap;">
  <img src="https://qcloudimg.tencent-cloud.cn/raw/b734c10de5ac479990215fa833164670.png" alt="效果演示1" style="width: 30%; min-width: 200px; max-width: 350px; height: auto;">
  <img src="https://qcloudimg.tencent-cloud.cn/raw/b41a060680f2538810eed3a012b958bd.png" alt="效果演示2" style="width: 30%; min-width: 200px; max-width: 350px; height: auto;">
  <img src="https://qcloudimg.tencent-cloud.cn/raw/aaecdd9cf012ef037436a19998893001.png" alt="效果演示3" style="width: 30%; min-width: 200px; max-width: 350px; height: auto;">
</div>

## 预览 DEMO
### 下载或clone代码包

### 配置小程序 id
用[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/devtools.html)，打开上一步下载下来的代码仓库，填入小程序的 appid（使用云开发能力必须填写 appid）。
### 体验
点击小程序开发IDE中的“预览”，用微信扫一扫即可体验

## 📝 AI开发&提示词记录

首先可以按照 [CloudBase AI ToolKit 快速上手指南](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/getting-started) 准备好 AI 开发环境。

以下是开发本项目时使用的完整提示词，展示了如何通过自然语言与AI协作完成全栈应用开发：

<details>
<summary><strong>阶段一：项目需求描述</strong></summary>

``` 
请帮我搭建一个TikTok风格短视频小程序项目，风格现代化毛玻璃效果，深色主题

# 模块和功能
- 首页: 竖屏滑动浏览视频
- 发布页: 发布作品，内容包括上传视频，封面选择和描述编辑
- 我的页: 展示当前用户头像、昵称、状态描述，个人作品列表
- 底部导航: 页面切换

开始搭建，数据先不用加载后端接口，采用前端mock数据实现。
```

</details>

<details>
<summary><strong>阶段二：界面交互要求</strong></summary>

```
请设计以下几个页面：

1.【首页】页面交互特性
- TikTok风格的竖屏视频播放，视频无边框全屏展示，居中等比缩放不能被裁切
- 视频滑入时自动播放/划出时暂停控制
- 点击暂停/播放切换，当暂停时居中展示暂停图标
- 实时播放进度条，贴底放置
2. 【发布】页面交互特性
- 本地视频选择上传至云存储，视频信息编辑，信息包括：名称和描述
- 视频云存储地址、名称和描述记录在云数据库中
3.【我的】页面交互特性
- 基于微信OpenID的用户识别，展示用户头像、昵称、个性签名、个人作品列表

界面要求：
- 设计要现代化、好看
- 手机和电脑都要适配

```

</details>

<details>
<summary><strong>阶段三：增加发布视频自动生成封面功能</strong></summary>

```
发布视频页面，选择视频后上传视频到云存储作为发布视频；并通过云函数获取视频第一帧生成图片保存到云存储作为发布视频的封面图，回填回显到表单视频封面字段，供用户查阅决定用生成的图片做封面还是自己自定义上传封面
```

</details>


## 项目架构

### 📱 小程序页面

#### 🏠 首页 (pages/home)
- **功能**：TikTok风格的竖屏视频流
- **特色**：
  - 全屏视频播放器，自动播放和循环
  - Swiper组件实现上下滑动切换视频
  - 右侧操作栏：点赞、评论、分享、音乐
  - 底部用户信息和视频描述
  - 用户头像和关注按钮
  - 点赞动画效果
- **Mock数据**：包含3个示例视频，模拟真实短视频内容

#### 📤 发布页 (pages/publish) ⭐ **全新升级**

- **🎯 功能**：
  - 支持从相册选择或拍摄新视频（最大50MB）
  - 视频预览和重新选择功能
  - **🎯 真实视频第一帧提取**：使用FFmpeg云端提取视频的真实第一帧作为封面
  - **⚡ 即时上传机制**：选择视频后立即上传到云存储，发布时直接使用云地址
  - **智能降级机制**：第一帧提取失败时，自动使用Canvas生成渐变封面
  - **自定义封面**：支持从相册选择自定义封面图片
  - **封面选择器**：底部毛玻璃弹窗展示多种封面选项

- **📝 简化表单设计**：
  - 视频标题（必填，最多50字符）
  - 视频描述（可选，最多200字符）
  - 移除标签和位置字段，聚焦核心内容

- **🎪 操作体验优化**：
  - 发布按钮居中布局，400rpx固定宽度
  - 移除取消按钮，减少选择困扰
  - 移除预览和重新生成按钮，简化操作流程
  - 实时上传进度显示，透明度反馈

#### 👤 个人页 (pages/profile)
- **功能**：用户资料和作品展示
- **特色**：
  - 用户头像、昵称、个性签名展示
  - 三大数据统计：粉丝数、关注数、获赞数
  - 三个标签页：作品、喜欢、收藏
  - 视频网格布局，3列展示
  - 视频封面、点赞数、时长显示
  - 空状态提示
  - 编辑资料和设置功能
- **真实数据**：从云数据库加载用户发布的视频、喜欢和收藏的内容

#### 🧭 底部导航 ✨（简洁优化）
- **设计风格**：现代化毛玻璃效果，深色主题
- **视觉特效**：
  - 🌟 毛玻璃背景：`backdrop-filter: blur(20rpx)` 实现透明模糊效果
  - 🎨 简洁设计：去除过度发光效果，保持清晰可读
  - ✨ 适度动画：图标缩放、文字淡入等基础交互动画
- **交互体验**：
  - 🎯 活跃状态：清晰的颜色变化和缩放效果
  - 📳 触觉反馈：点击时振动反馈（`wx.vibrateShort`）
  - 🎪 按压动画：点击缩放动画
- **技术特色**：
  - 📱 响应式设计：适配不同屏幕尺寸
  - 🌙 深色模式：自动适配系统深色模式
  - ♿ 无障碍支持：添加 ARIA 标签和角色
  - 🎭 图标升级：使用精美的 Unicode Emoji 图标
- **页面跳转**：首页(🏡)、发布(✨)、我的(👨‍💼)

### 📁 目录结构

```
├── cloudfunctions/              # 云函数目录
│   ├── getOpenId/              # 获取用户OpenID
│   ├── publishVideo/           # 发布视频
│   ├── generateVideoPoster/    # 智能缩略图生成
│   ├── extractVideoFrame/      # 视频帧提取
│   ├── getVideos/              # 获取视频列表
│   ├── updateVideoLike/        # 视频点赞
│   ├── getUserProfile/         # 获取用户资料
│   └── updateUserProfile/      # 更新用户资料
├── miniprogram/                # 小程序目录
│   ├── app.js                  # 全局逻辑
│   ├── app.json                # 全局配置
│   ├── app.wxss                # 全局样式
│   ├── components/             # 自定义组件
│   │   ├── cloudbase-badge/    # CloudBase徽章组件
│   │   └── custom-tabbar/      # 自定义底部导航（毛玻璃效果）
│   ├── images/                 # 图片资源
│   │   ├── tab-home.png        # 首页图标
│   │   ├── tab-home-active.png # 首页激活图标
│   │   ├── tab-publish.png     # 发布图标
│   │   ├── tab-publish-active.png # 发布激活图标
│   │   ├── tab-profile.png     # 个人图标
│   │   ├── tab-profile-active.png # 个人激活图标
│   │   ├── user-avatar.jpg     # 用户头像
│   │   └── powered-by-cloudbase-badge.svg
│   ├── pages/                  # 页面目录
│   │   ├── index/              # 启动页
│   │   ├── home/              # 首页（视频流）
│   │   ├── publish/           # 发布页（现代化毛玻璃设计）⭐
│   │   │   ├── publish.js     # 发布逻辑
│   │   │   ├── publish.json   # 页面配置
│   │   │   ├── publish.wxml   # 发布界面（简化表单）
│   │   │   └── publish.wxss   # 发布样式（毛玻璃深色主题）
│   │   └── profile/           # 个人页
│   └── sitemap.json           # 搜索配置
├── project.config.json         # 项目配置
├── project.private.config.json # 私有配置
├── cloudbaserc.json           # CloudBase配置
└── README.md                   # 项目文档
```

## 数据库设计

### 📊 数据库集合

#### cursor_videos（视频信息表）
用于存储所有发布的视频信息

| 字段名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| _id | String | 是 | 视频唯一ID（自动生成） |
| videoUrl | String | 是 | 云存储视频文件地址 |
| posterUrl | String | 否 | 视频封面图片地址 |
| title | String | 是 | 视频标题（最大50字符） |
| description | String | 否 | 视频描述（最大200字符） |
| openid | String | 是 | 发布者微信OpenID |
| likes | Number | 是 | 点赞数（默认0） |
| comments | Number | 是 | 评论数（默认0） |
| shares | Number | 是 | 分享数（默认0） |
| views | Number | 是 | 观看数（默认0） |
| createTime | Date | 是 | 创建时间 |
| updateTime | Date | 是 | 更新时间 |
| status | String | 是 | 状态：published/draft/deleted |

#### cursor_users（用户信息表）
用于存储用户基本信息和统计数据

| 字段名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| _id | String | 是 | 用户唯一ID（自动生成） |
| openid | String | 是 | 微信OpenID |
| nickname | String | 是 | 用户昵称 |
| avatar | String | 否 | 头像URL |
| signature | String | 否 | 个性签名 |
| followersCount | Number | 是 | 粉丝数（默认0） |
| followingCount | Number | 是 | 关注数（默认0） |
| likesCount | Number | 是 | 获赞总数（默认0） |
| videosCount | Number | 是 | 发布视频数（默认0） |
| isVerified | Boolean | 是 | 是否认证用户（默认false） |
| createTime | Date | 是 | 注册时间 |
| updateTime | Date | 是 | 更新时间 |
| status | String | 是 | 状态：active/inactive/banned |

### 🚀 云函数服务

#### extractVideoFrame（提取视频第一帧）⭐
**功能**：使用FFmpeg提取视频的真实第一帧作为封面，确保封面与视频内容一致

**技术方案**：
- 使用云函数 + FFmpeg 进行服务端视频处理
- 支持多种视频格式：MP4、AVI、MOV、MKV等
- 自动提取第1秒的帧作为封面
- 输出高质量JPEG格式图片
- 失败时自动降级到Canvas生成

**参数**：
```javascript
{
  videoUrl: "云存储视频地址",
  quality: "high|medium|low" // 输出质量
}
```

**返回值**：
```javascript
{
  success: true,
  posterUrl: "生成的封面云存储地址",
  message: "提取成功"
}
```

#### generateVideoPoster（智能封面生成）
**功能**：当视频帧提取失败时，使用Canvas生成渐变背景封面

#### generateVideoPosterAdvanced（高级封面生成）
**功能**：结合AI技术生成更精美的视频封面，包含标题文字和装饰元素

#### publishVideo（视频发布）
**功能**：处理视频发布逻辑，包括数据入库和用户统计更新

**处理流程**：
1. 验证用户身份和权限
2. 验证视频文件和封面图片
3. 写入视频信息到数据库
4. 更新用户发布统计
5. 返回发布结果

#### getVideos / getVideoList（视频列表）
**功能**：获取视频列表，支持分页和筛选

**特色**：
- 支持按时间、热度、用户筛选
- 自动加载用户昵称和头像
- 分页加载，性能优化
- 返回格式化的完整视频信息

#### updateVideoLike（点赞功能）
**功能**：处理视频点赞/取消点赞，包含防重复点赞逻辑

#### getUserProfile / updateUserProfile（用户管理）
**功能**：用户资料的获取和更新，包含头像上传处理

## 🚀 部署指南

### 环境准备
1. 注册腾讯云账号并开通云开发服务
2. 安装微信开发者工具
3. 安装 @cloudbase/cli 工具

### 快速部署
```bash
# 1. 克隆项目
git clone <项目地址>

# 2. 安装依赖
npm install

# 3. 登录云开发
tcb login

# 4. 部署云函数
tcb functions:deploy

# 5. 部署静态资源
tcb hosting:deploy
```

### 配置说明
1. 修改 `project.config.json` 中的 appid
2. 配置云开发环境ID
3. 设置数据库权限：
   - cursor_videos: 所有人可读，仅创建者可写
   - cursor_users: 仅创建者可读写

## 🎯 开发指南

### 本地开发
1. 使用微信开发者工具打开项目
2. 配置云开发环境
3. 上传并部署云函数
4. 预览和调试

### 代码规范
- 使用ES6+语法
- 组件化开发
- 响应式设计
- 错误处理和用户反馈

### 性能优化
- 图片懒加载
- 视频预加载
- 分页加载
- 缓存策略

## 📞 技术支持

- **技术栈**：微信小程序 + 云开发 + FFmpeg
- **开发工具**：微信开发者工具 + CloudBase AI ToolKit
- **部署平台**：腾讯云开发（Serverless）


**感谢使用 TikTok风格短视频小程序！** 🎉

如有问题或建议，欢迎提Issue或联系开发团队。
