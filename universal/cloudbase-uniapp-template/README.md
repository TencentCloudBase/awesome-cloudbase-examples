# CloudBase UniApp 初始模板

基于云开发 + UniApp 构建的全栈应用模板，支持多端发布（H5、小程序、App）

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)

## 🚀 特性

- ✅ **多端支持**: 一套代码，多端运行（H5、微信小程序、支付宝小程序、App等）
- ✅ **云开发集成**: 内置云开发 JS SDK，支持云函数、云数据库、云存储
- ✅ **跨平台适配**: 自定义 UniApp 适配器，完美适配云开发能力
- ✅ **类型支持**: 完整的 TypeScript 支持
- ✅ **开发工具**: 集成多种 AI 编程助手配置
- ✅ **最佳实践**: 遵循云开发和 UniApp 开发规范

## 📁 项目结构

```
cloudbase-uniapp-template/
├── src/                          # 源代码目录
│   ├── pages/                    # 页面文件
│   │   ├── index/               # 首页
│   │   └── demo/                # 云开发演示页面
│   ├── utils/                   # 工具函数
│   │   ├── adapter.js           # UniApp 适配器
│   │   ├── cloudbase.ts         # 云开发配置
│   │   └── index.ts             # 通用工具函数
│   ├── static/                  # 静态资源
│   ├── App.vue                  # 应用入口
│   ├── main.ts                  # 主入口文件
│   └── pages.json               # 页面路由配置
├── cloudfunctions/              # 云函数目录
│   └── hello/                   # 示例云函数
│       ├── index.js
│       └── package.json
├── .cursor/                     # Cursor AI 配置
├── .windsurf/                   # WindSurf AI 配置
├── .vscode/                     # VS Code AI 配置
├── package.json                 # 项目依赖
├── cloudbaserc.json            # CloudBase CLI 配置
└── README.md                   # 项目说明
```

## 🛠️ 技术栈

### 前端框架
- **UniApp**: 跨平台应用开发框架
- **Vue 3**: 渐进式前端框架
- **TypeScript**: JavaScript 的超集，提供类型支持

### 云开发能力
- **@cloudbase/js-sdk**: 云开发 JavaScript SDK
- **云函数**: 无服务器函数计算
- **云数据库**: NoSQL 文档数据库
- **云存储**: 对象存储服务
- **匿名登录**: 免注册直接使用

## 🔧 快速开始

### 1. 创建云开发环境

访问 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)，创建一个新的云开发环境。

### 2. 配置环境 ID

修改 `src/utils/cloudbase.ts` 文件中的环境配置：

```typescript
const config = {
  env: 'your-env-id', // 替换为您的云开发环境ID
};
```

### 3. 安装依赖

```bash
npm install
```

### 4. 开启匿名登录

在云开发控制台的【环境】->【登录授权】中开启匿名登录。

### 5. 部署云函数

```bash
# 部署示例云函数
npm run deploy:functions
```

### 6. 创建数据库集合

在云开发控制台创建名为 `test` 的数据库集合，并设置权限为"所有人可读"。

### 7. 启动开发

```bash
# H5 开发
npm run dev:h5

# 微信小程序开发
npm run dev:mp-weixin

# 其他平台请查看 package.json 中的 scripts
```

## 📱 多端适配说明

### H5 端
- 需要配置云开发安全域名：`tcb-api.tencentcloudapi.com`
- 上传域名：`cos.ap-shanghai.myqcloud.com`
- 下载域名：根据您的地域配置

### 小程序端
- 支持微信小程序、支付宝小程序等
- 需要配置 request 和 uploadFile 域名
- 微信小程序可以同时使用 `wx.cloud` 和云开发 JS SDK

### App 端
- 支持原生 App 开发
- 需要配置移动应用安全凭证（见下方说明）

## 🔐 移动应用安全凭证配置

如果需要在 App 端使用，需要配置移动应用安全凭证：

1. 在云开发控制台【环境】->【安全配置】->【移动应用安全来源】中添加应用
2. 输入应用标识（如：`uni-app`）
3. 获取凭证信息
4. 在 `src/utils/cloudbase.ts` 中取消注释并配置：

```typescript
const config = {
  env: 'your-env-id',
  appSign: 'your-app-sign',
  appSecret: {
    appAccessKeyId: 1,
    appAccessKey: 'your-app-secret'
  }
};
```

## 🎯 功能演示

项目包含完整的云开发功能演示：

- **认证功能**: 匿名登录/退出
- **云函数调用**: 调用示例云函数
- **数据库操作**: 增加和查询数据
- **文件存储**: 上传和下载文件

访问演示页面体验完整功能。

## 📦 构建部署

### 构建应用

```bash
# 构建 H5 版本
npm run build:h5

# 构建微信小程序
npm run build:mp-weixin

# 其他平台构建命令见 package.json
```

### 使用 CloudBase CLI 部署

```bash
# 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署到云开发
tcb framework deploy
```

### 手动部署

- **H5版本**: 将 `dist/build/h5` 目录部署到云开发静态托管
- **小程序**: 使用对应平台的开发者工具上传代码包

## 🤖 AI 编程助手

项目已配置多种 AI 编程助手：

- **Cursor**: `.cursor/` 配置目录
- **WindSurf**: `.windsurf/` 配置目录  
- **VS Code**: `.vscode/` 配置目录
- **GitHub Copilot**: `.github/copilot-instructions.md`

这些配置包含云开发专用的提示规则，让 AI 更好地理解您的项目结构。

## 📝 开发注意事项

1. **环境变量**: 确保正确配置云开发环境 ID
2. **安全域名**: 根据部署平台配置相应的安全域名
3. **权限配置**: 注意数据库集合的读写权限设置
4. **跨端兼容**: 部分 API 在不同平台表现可能不同，注意测试

## 🔗 相关链接

- [UniApp 官方文档](https://uniapp.dcloud.io/)
- [云开发官方文档](https://cloud.tencent.com/document/product/876)
- [云开发 JS SDK](https://docs.cloudbase.net/api-reference/web/initialization)
- [UNI-for-CloudBase 参考项目](https://github.com/AceZCY/UNI-for-CloudBase)

## 📄 开源协议

MIT License

---

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效。