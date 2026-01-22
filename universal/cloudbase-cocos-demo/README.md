# CloudBase Cocos Creator Demo

基于 Cocos Creator 3.x 和腾讯云开发的游戏应用示例项目，演示了用户认证、云函数调用、数据模型操作等常用功能的集成。

## 功能特性

- 多种登录方式：账号密码、手机验证码、邮箱验证码、匿名登录
- 云函数调用测试
- 数据模型（Models）CRUD 操作
- 纯代码动态构建 UI（无需预制体）

## 环境要求

- Cocos Creator 3.8+
- Node.js >= 22

## 快速开始

### 1. 使用 Cocos Creator 打开项目

使用 Cocos Creator 3.8+ 打开本项目目录。

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 CloudBase

编辑 `assets/scripts/config/CloudbaseConfig.ts`，填入你的云开发环境配置：

```typescript
export const cloudbaseConfig = {
  env: 'your-env-id',           // 环境 ID
  region: 'ap-shanghai',         // 地域
  accessKey: 'your-access-key',  // Access Key（可选）
};
```

或者在应用运行时通过配置面板动态输入。

### 4. 构建运行

在 Cocos Creator 中选择目标平台进行构建和运行。

## 项目结构

```
assets/
├── scenes/                  # 场景文件
│   └── main.scene           # 主场景
└── scripts/                 # 脚本文件
    ├── config/              # 配置文件
    │   └── CloudbaseConfig.ts
    ├── services/            # 服务层
    │   ├── CloudbaseService.ts    # CloudBase 核心服务（单例）
    │   └── AuthService.ts         # 认证服务
    └── MainUI.ts            # 主界面（动态构建 UI）
```

## 主要依赖

| 依赖 | 版本 | 说明 |
|------|------|------|
| @cloudbase/js-sdk | ^2.25.1 | 腾讯云开发 SDK |
| [@cloudbase/adapter-cocos_native](https://www.npmjs.com/package/@cloudbase/adapter-cocos_native) | ^1.0.0 | Cocos 原生平台适配器 |

## 使用示例

### 初始化 CloudBase

```typescript
import cloudbase from '@cloudbase/js-sdk';
import adapter from '@cloudbase/adapter-cocos_native';

// 使用适配器（原生平台必需）
cloudbase.useAdapters(adapter);

const app = cloudbase.init({
  env: 'your-env-id',
  region: 'ap-shanghai',
  accessKey: 'your-access-key',
});
```

### 用户登录

```typescript
const auth = app.auth;

// 账号密码登录
const { user, error } = await auth.signInWithPassword({
  username: 'your-username',
  password: 'your-password',
});

// 手机验证码登录
const { verifyOtp } = await auth.signInWithOtp({ phone: '+8613800138000' });
const result = await verifyOtp({ token: '123456' });

// 邮箱验证码登录
const { verifyOtp } = await auth.signInWithOtp({ email: 'user@example.com' });
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

### 数据模型（Models）

```typescript
const models = app.models;

// 查询列表
const { data } = await models.YourModel.list({
  pageSize: 10,
});

// 查询单条
const { data } = await models.YourModel.get({
  filter: { _id: 'record-id' },
});

// 创建数据
const { data } = await models.YourModel.create({
  data: { title: '测试数据', content: '内容' },
});

// 更新数据
const { data } = await models.YourModel.update({
  filter: { _id: 'record-id' },
  data: { title: '更新后的标题' },
});

// 删除数据
const { data } = await models.YourModel.delete({
  filter: { _id: 'record-id' },
});
```

## 界面说明

应用包含以下面板：

1. **配置面板**：输入环境 ID 和 Access Key
2. **登录面板**：支持密码/手机/邮箱/匿名四种登录方式
3. **用户面板**：显示当前用户信息，可进入功能调试或退出登录
4. **功能调试面板**：
   - 云函数调用：输入函数名和参数进行调用测试
   - Models 操作：输入模型名、方法（list/get/create/update/delete）和参数进行数据操作

## 平台适配说明

### Web 平台

直接使用 `@cloudbase/js-sdk` 即可。

### 微信小游戏

需要在微信开发者工具中配置合法域名，并确保云开发环境已开通小游戏权限。

### 原生平台 (iOS/Android)

需要引入 `@cloudbase/adapter-cocos_native` 适配器：

```typescript
import adapter from '@cloudbase/adapter-cocos_native';
cloudbase.useAdapters(adapter);
```


### 示例展示

#### Cocos Creator 构建

<img src="https://qcloudimg.tencent-cloud.cn/raw/3c41e095bdffdbc112524fa295982445.png" width="100%" />

#### 调试预览

<p>
<img src="https://qcloudimg.tencent-cloud.cn/raw/fcf26e032a03469ba578fa64938ab196.png" width="24%" />
<img src="https://qcloudimg.tencent-cloud.cn/raw/0d0abd23f6e9bdc6d0a7f4ecc985544d.png" width="24%" />
<img src="https://qcloudimg.tencent-cloud.cn/raw/7455ab8cb5f30459602c9b581d6d2425.png" width="24%" />
<img src="https://qcloudimg.tencent-cloud.cn/raw/5c7d2988fb0f39883b0cfc0fc2fa3c90.png" width="24%" />
</p>

## 注意事项

1. **环境配置**：使用前需在 CloudBase 控制台创建环境并获取配置信息
2. **登录方式**：需在控制台启用对应的登录方式（账号密码、手机、邮箱等）
3. **跨域配置**：Web 平台需在控制台配置安全域名
4. **数据模型**：使用 Models 前需在控制台创建对应的数据模型

## 相关资源

- [CloudBase 官方文档](https://docs.cloudbase.net/)
- [Cocos Creator 官方文档](https://docs.cocos.com/creator/manual/zh/)
- [@cloudbase/js-sdk NPM](https://www.npmjs.com/package/@cloudbase/js-sdk)

## License

MIT
