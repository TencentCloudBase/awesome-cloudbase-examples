# CloudBase React Native Demo

基于 React Native / Expo 和腾讯云开发的移动应用示例项目，演示了用户登录、云函数调用、数据模型操作、云存储上传等常用功能的实现。

## 功能特性

- 多种登录方式：账号密码、手机验证码、邮箱验证码、匿名登录
- 云函数调用
- 数据模型（Models）操作
- 云存储文件上传（支持本地文件选择）
- MySQL 数据库操作
- 图形验证码处理

## 环境要求

- Node.js >= 18
- React Native 0.76+
- Expo SDK 52+
- iOS 13+ / Android 6+

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. iOS 原生依赖

```bash
cd ios && pod install && cd ..
```

### 3. 配置 CloudBase

编辑 `src/config/cloudbase.ts`，填入你的云开发环境配置：

```typescript
const cloudbaseConfig = {
  env: 'your-env-id',           // 环境 ID
  region: 'ap-shanghai',         // 地域
  accessKey: 'your-access-key',  // Access Key
};
```

### 4. 启动开发

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

## 项目结构

```
src/
├── config/             # 配置文件
│   └── cloudbase.ts    # CloudBase 初始化配置
├── hooks/              # React Hooks
│   └── useAuth.ts      # 认证状态管理
├── screens/            # 页面组件
│   ├── LoginScreen.tsx    # 登录页面
│   ├── ProfileScreen.tsx  # 用户信息页面
│   └── TestScreen.tsx     # 功能测试页面
├── services/           # 服务层
│   └── authService.ts  # 认证服务封装
└── types/              # TypeScript 类型定义
    └── auth.ts
```

## 效果展示

<p>
<img src="https://qcloudimg.tencent-cloud.cn/raw/fe0407737582175f2f92920c531dd8a8.png" width="24%" />
<img src="https://qcloudimg.tencent-cloud.cn/raw/b820a53cb02e98f621349ca85a0730eb.png" width="24%" />
<img src="https://qcloudimg.tencent-cloud.cn/raw/287fdca11601a747cc450d7831f048e3.jpg" width="24%" />
<img src="https://qcloudimg.tencent-cloud.cn/raw/b7c8a89eb5d5420d1d95c57240eff3ed.jpg" width="24%" />
</p>

## 主要依赖

| 依赖 | 版本 | 说明 |
|------|------|------|
| @cloudbase/js-sdk | ^2.24.9 | 腾讯云开发 SDK |
| [@cloudbase/adapter-rn](https://www.npmjs.com/package/@cloudbase/adapter-rn) | ^1.0.0 | React Native 适配器 |
| react-native-mmkv | ^3.3.3 | 高性能持久化存储 |

## 使用示例

### 用户登录

```typescript
import app from './src/config/cloudbase';

const auth = app.auth;

// 账号密码登录
const { user, error } = await auth.signInWithPassword({
  username: 'your-username',
  password: 'your-password',
});

// 手机验证码登录
const { verifyOtp } = await auth.signInWithOtp({ phone: '+8613800138000' });
const result = await verifyOtp({ token: '123456' });

// 匿名登录
const { user } = await auth.signInAnonymously();
```

### 云函数调用

```typescript
const res = await app.callFunction({
  name: 'functionName',
  data: { key: 'value' },
});
console.log(res.result);
```

### 数据模型

```typescript
// 查询列表
const { data } = await app.models.YourModel.list({
  select: { $master: true },
  filter: { limit: 10 },
});

// 创建数据
await app.models.YourModel.create({
  data: { title: '测试数据' },
});
```

### 云存储上传

```typescript
import * as FileSystem from 'expo-file-system';

// 读取文件为 base64
const base64 = await FileSystem.readAsStringAsync(fileUri, {
  encoding: FileSystem.EncodingType.Base64,
});

// 上传
const storage = app.storage.from();
const { data, error } = await storage.upload('path/file.jpg', base64, {
  contentType: 'image/jpeg',
  contentEncoding: 'base64',
});
```

## 注意事项

1. **MMKV 版本**：使用 v3.x，v4.x 需要 NitroModules 配置较复杂
2. **文件上传**：RN 环境需使用 base64 编码，并设置 `contentEncoding: 'base64'`
3. **CloudBase 控制台**：使用前需在控制台启用对应的登录方式

## 相关资源

- [CloudBase 官方文档](https://docs.cloudbase.net/)
- [@cloudbase/adapter-rn](https://www.npmjs.com/package/@cloudbase/adapter-rn)
- [React Native 官方文档](https://reactnative.dev/)

## License

MIT
