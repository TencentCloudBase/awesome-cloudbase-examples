# 小程序云开发模板项目

本项目是一个基于小程序 + 云开发的空白项目，提供了基本的云开发能力演示，帮助开发者快速上手小程序云开发。

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)  

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效，支持AI生成全栈代码、一键部署至腾讯云开发（免服务器）、智能日志修复。

## 项目特点

- 📄 小程序完善的前端开发能力
- 🚀 集成云开发云函数等后端能力
- 🤖 集成 AI IDE 规则，提供智能化开发体验
- ☁️ 集成云开发 MCP，提供一站式云服务开发部署体验
- 🎁 深度集成腾讯云开发 CloudBase，提供一站式后端云服务

## 项目架构

### 云函数
- `getOpenId`：用于获取用户的 `openid`、`appid` 和 `unionid`。

### 小程序页面
- `index`：首页，展示项目信息、用户OpenID和CloudBase功能特点。

### 自定义组件
- `cloudbase-badge`：CloudBase品牌标识组件，可复用的badge显示组件。

## 开始使用

### 前提条件
- 安装小程序开发工具。
- 拥有腾讯云开发账号。

### 安装依赖
云函数依赖已在 `cloudfunctions/getOpenId/package.json` 中定义，可在云开发控制台中安装依赖。

### 配置云开发环境
在小程序开发工具中，打开 `miniprogram/app.js` 文件里修改环境 ID，找到如下代码部分：
```javascript
wx.cloud.init({
  env: 'your-env-id', // 替换为你的云开发环境 ID  
  traceUser: true,
});
```
将 `your-env-id` 替换为你实际的云开发环境 ID。

### 本地开发
1. 打开小程序开发工具，导入本项目。
2. 上传并部署 `getOpenId` 云函数。
3. 点击开发工具中的预览按钮，查看效果。

## 目录结构
```
├── cloudfunctions/
│   └── getOpenId/
│       ├── index.js
│       └── package.json
├── miniprogram/
│   ├── app.js
│   ├── app.json
│   ├── app.wxss
│   ├── components/
│   │   └── cloudbase-badge/      # CloudBase徽章组件
│   │       ├── index.js
│   │       ├── index.json
│   │       ├── index.wxml
│   │       └── index.wxss
│   ├── images/
│   │   └── powered-by-cloudbase-badge.svg  # CloudBase徽章图标
│   ├── pages/
│   │   └── index/
│   │       ├── index.js
│   │       ├── index.json
│   │       ├── index.wxml
│   │       └── index.wxss
│   └── sitemap.json
├── project.config.json
└── project.private.config.json
```

## 云开发使用示例

通过 `wx.cloud` 访问云开发服务：

```javascript
// 数据库操作
const db = wx.cloud.database();
const result = await db.collection('users').get(); // 查询数据
await db.collection('users').add({ data: { name: 'test' } }); // 添加数据

// 调用云函数
const funcResult = await wx.cloud.callFunction({ name: 'getOpenId' });

// 文件上传
const uploadResult = await wx.cloud.uploadFile({ cloudPath: 'test.jpg', filePath: tempFilePath });
// 调用数据模型
const models = wx.cloud.models;
```

## 扩展开发
您可以根据项目需求，添加新的云函数和页面，实现更多的云开发功能。