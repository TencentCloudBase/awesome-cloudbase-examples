# CloudBase Flutter 模板

基于 Flutter 和腾讯云开发（CloudBase）的跨平台移动应用模板，为开发者提供了快速构建全栈移动应用的能力。


[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)  

> 本项目基于 [**CloudBase AI ToolKit**](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit) 开发，通过AI提示词和 MCP 协议+云开发，让开发更智能、更高效，支持AI生成全栈代码、一键部署至腾讯云开发（免服务器）、智能日志修复。

## 项目特点

- 📱 基于 Flutter 构建，支持 iOS、Android、Web、macOS、Windows、Linux 多平台
- 🎨 使用 Material Design 3，提供现代化的 UI 体验
- 🔐 集成多种登录方式：匿名登录、用户名密码、手机验证码、邮箱验证码
- ☁️ 深度集成腾讯云开发 CloudBase，提供一站式后端云服务
- 🚀 开箱即用的云函数、云托管、API 调用示例

## 项目架构

### 前端架构

- **框架**：Flutter 3.x
- **状态管理**：原生 StatefulWidget
- **UI 设计**：Material Design 3
- **网络请求**：Dio
- **本地存储**：SharedPreferences

### 云开发资源

本项目使用了以下腾讯云开发（CloudBase）资源：

- **身份认证**：支持匿名登录、用户名密码、手机验证码、邮箱验证码等多种登录方式
- **云函数**：用于实现服务端业务逻辑
- **云托管**：用于部署容器化服务
- **API 调用**：支持调用云开发 API 代理

## 开始使用

### 前提条件

- 安装 Flutter SDK (版本 3.0 或更高)
- 腾讯云开发账号 (可在[腾讯云开发官网](https://tcb.cloud.tencent.com/)注册)
- iOS 开发需要 Xcode
- Android 开发需要 Android Studio

### 安装依赖

```bash
flutter pub get
```

### 配置云开发环境

1. 打开 `lib/pages/home_page.dart` 文件
2. 找到 `_initCloudBase` 方法，修改以下配置：
   - 将 `env` 参数修改为您的云开发环境 ID
   - 将 `accessKey` 参数修改为您的云开发访问密钥

```dart
_cloudBase = await CloudBase.init(
  env: 'your-env-id',  // 修改为您的环境 ID
  accessKey: 'your-access-key',  // 修改为您的访问密钥
  captchaConfig: CaptchaConfig(navigatorKey: navigatorKey),
);
```

### 本地开发

```bash
# 运行在 iOS 模拟器
flutter run -d ios

# 运行在 Android 模拟器
flutter run -d android

# 运行在 Chrome 浏览器
flutter run -d chrome

# 运行在 macOS
flutter run -d macos
```

### 构建生产版本

```bash
# 构建 Android APK
flutter build apk --release

# 构建 Android App Bundle
flutter build appbundle --release

# 构建 iOS
flutter build ios --release

# 构建 Web
flutter build web --release
```

## 目录结构

```
├── android/              # Android 平台配置
├── ios/                  # iOS 平台配置
├── lib/
│   ├── models/           # 数据模型
│   ├── pages/            # 页面组件
│   │   └── home_page.dart    # 主页（包含登录和用户中心）
│   ├── services/         # 服务层
│   ├── widgets/          # 可复用组件
│   │   └── app_drawer.dart   # 侧边栏组件
│   ├── app.dart          # 应用入口配置
│   └── main.dart         # 程序入口
├── linux/                # Linux 平台配置
├── macos/                # macOS 平台配置
├── web/                  # Web 平台配置
├── windows/              # Windows 平台配置
├── test/                 # 测试文件
├── pubspec.yaml          # 项目依赖配置
└── analysis_options.yaml # 代码分析配置
```

## 云开发功能说明

### 初始化云开发

本模板在 `lib/pages/home_page.dart` 中进行云开发的初始化：

```dart
_cloudBase = await CloudBase.init(
  env: 'your-env-id',
  accessKey: 'your-access-key',
  captchaConfig: CaptchaConfig(navigatorKey: navigatorKey),
);
```

### 身份认证

支持多种登录方式：

```dart
// 匿名登录
final result = await _cloudBase!.auth.signInAnonymously();

// 用户名密码登录
final result = await _cloudBase!.auth.signInWithPassword(
  SignInWithPasswordReq(
    username: 'username',
    password: 'password',
  ),
);

// 手机验证码登录
final result = await _cloudBase!.auth.signInWithOtp(
  SignInWithOtpReq(phone: '13800138000'),
);
// 验证 OTP
final verifyResult = await result.data!.verifyOtp!(VerifyOtpParams(token: 'otp-code'));

// 邮箱验证码登录
final result = await _cloudBase!.auth.signInWithOtp(
  SignInWithOtpReq(email: 'user@example.com'),
);

// 登出
await _cloudBase!.auth.signOut();
```

### 云函数调用

```dart
final result = await _cloudBase!.callFunction(
  name: 'functionName',
  data: {'key': 'value'},
);

if (result.isSuccess) {
  print(result.result);
}
```

### 云托管调用

```dart
final result = await _cloudBase!.callContainer(
  name: 'serviceName',
  method: HttpMethod.POST,
  path: '/api/endpoint',
  data: {'key': 'value'},
);

if (result.isSuccess) {
  print(result.result);
}
```

### API 调用

```dart
final apiProxy = _cloudBase!.apis['apiName'];

// GET 请求
final result = await apiProxy.get(path: '/');

// POST 请求
final result = await apiProxy.post(
  path: '/',
  body: {'key': 'value'},
);
```

## 重要说明

1. 在使用前请先配置您的云开发环境 ID 和访问密钥。
2. 本模板默认使用匿名登录进行快速测试，生产环境建议使用更安全的登录方式。
3. 在使用云函数、云托管等功能前，请确保在云开发控制台中已创建相应的资源。
4. 验证码登录需要在云开发控制台开启短信或邮件服务。

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

## 许可证

MIT
