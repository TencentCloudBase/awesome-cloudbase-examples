# CloudBase Flutter Demo

基于 Flutter 和腾讯云开发（CloudBase）的跨平台移动应用模板，为开发者提供了快速构建全栈移动应用的能力。

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)  

> 本项目基于 [**cloudbase_flutter**](https://pub.dev/packages/cloudbase_flutter) 开发。

## 项目特点

- 📱 基于 Flutter 构建，支持 iOS、Android、Web、macOS、Windows、Linux 多平台
- 🎨 使用 Material Design 3，提供现代化的 UI 体验
- 🔐 集成多种登录方式：匿名登录、用户名密码、手机验证码、邮箱验证码
- ☁️ 深度集成腾讯云开发 CloudBase，提供一站式后端云服务
- 🚀 开箱即用的云函数、云托管、API 调用、MySQL 数据库、数据模型示例

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
- **MySQL 数据库**：支持 query / count / insert / update / delete 等操作
- **数据模型**：基于 MySQL 封装的高级数据管理，支持 list / get / create / update / delete / upsert / mysqlCommand 等 13 种 CRUD 操作，以及 7 种数据源查询操作

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

应用启动后会显示环境配置页面，您需要输入：

- **环境 ID**：您的云开发环境 ID（在[云开发控制台](https://tcb.cloud.tencent.com/)获取）
- **Access Key**（可选）：用于未登录模式下的安全调用

也可以在代码中预设默认值，打开 `lib/pages/home_page.dart`，修改以下控制器的初始值：

```dart
final _envIdController = TextEditingController(text: '你的环境ID');
final _accessKeyController = TextEditingController(text: '你的AccessKey');
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

# 重新安装 Pod（iOS 首次运行或更新依赖后）
cd ios && pod install --repo-update && cd .. && flutter run
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
├── android/                  # Android 平台配置
├── ios/                      # iOS 平台配置
├── lib/
│   ├── models/               # 数据模型定义
│   ├── pages/
│   │   ├── home_page.dart    # 主页面（环境配置 → 登录 → 功能测试面板）
│   │   └── sections/         # 功能测试卡片组件（从 home_page 拆分）
│   │       ├── api_section.dart            # API 代理测试卡片
│   │       ├── cloud_function_section.dart # 云函数测试卡片
│   │       ├── cloud_run_section.dart      # 云托管测试卡片
│   │       ├── login_section.dart          # 登录表单组件
│   │       ├── models_section.dart         # 数据模型测试卡片
│   │       └── mysql_section.dart          # MySQL 数据库测试卡片
│   ├── widgets/
│   │   └── app_drawer.dart   # 侧边栏导航组件
│   ├── app.dart              # 应用入口配置（MaterialApp）
│   └── main.dart             # 程序入口
├── linux/                    # Linux 平台配置
├── macos/                    # macOS 平台配置
├── web/                      # Web 平台配置
├── windows/                  # Windows 平台配置
├── test/                     # 测试文件
├── pubspec.yaml              # 项目依赖配置
└── analysis_options.yaml     # 代码分析配置
```

## 效果展示

<p>
<img src="https://qcloudimg.tencent-cloud.cn/raw/f7bbc1fb7fc9250ddf81dd1d9765c9f1.jpg" width="32%" />
<img src="https://qcloudimg.tencent-cloud.cn/raw/7fb7566335cfcf1559b81a79d7193752.jpg" width="32%" />
<img src="https://qcloudimg.tencent-cloud.cn/raw/fdc7aee3731dc1d321d12e18adade045.jpg" width="32%" />
<img src="https://qcloudimg.tencent-cloud.cn/raw/9523dfaa5278c9d1fc38aa9a6d785ce1.jpg" width="32%" />
<img src="https://qcloudimg.tencent-cloud.cn/raw/6c67d6b50e274cfbf49c1b795f457988.jpg" width="32%" />
</p>

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

支持四种登录方式：

```dart
// 1. 匿名登录 —— 无需用户输入，自动创建临时账户
final result = await _cloudBase!.auth.signInAnonymously();

// 2. 用户名密码登录 —— 支持用户名/邮箱/手机号 + 密码
final result = await _cloudBase!.auth.signInWithPassword(
  SignInWithPasswordReq(
    username: 'username',
    password: 'password',
  ),
);

// 3. 手机验证码登录 —— 两步流程
// 第一步：发送验证码
final result = await _cloudBase!.auth.signInWithOtp(
  SignInWithOtpReq(phone: '13800138000'),
);
// 第二步：输入验证码完成登录
final verifyResult = await result.data!.verifyOtp!(
  VerifyOtpParams(token: 'otp-code'),
);

// 4. 邮箱验证码登录 —— 流程同手机验证码
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

### MySQL 数据库

```dart
// 查询数据
final result = await _cloudBase!.mysql.query(
  table: 'users',
  select: '*',
  limit: 10,
  offset: 0,
);

// 插入数据
final result = await _cloudBase!.mysql.insert(
  table: 'users',
  data: {'name': '张三', 'age': 25},
);

// 更新数据
final result = await _cloudBase!.mysql.update(
  table: 'users',
  filters: {'id': 'eq.1'},
  data: {'age': 26},
);

// 删除数据
final result = await _cloudBase!.mysql.delete(
  table: 'users',
  filters: {'id': 'eq.1'},
);

// 统计数量
final result = await _cloudBase!.mysql.count(
  table: 'users',
);
```

### 数据模型

数据模型在 MySQL 基础上封装了更丰富的查询语义和权限控制，支持 13 种 CRUD 操作和 7 种数据源查询操作。

#### CRUD 操作

```dart
// 查询多条记录
final result = await _cloudBase!.models.list(
  name: 'user',
  filter: {'age': {'$gt': 18}},
  select: {'name': true, 'age': true},
  pageSize: 10,
  pageNumber: 1,
  orderBy: [{'createdAt': 'desc'}],
);

// 按 ID 查询单条
final result = await _cloudBase!.models.getById(
  name: 'user',
  recordId: 'record-id',
);

// 创建记录
final result = await _cloudBase!.models.create(
  name: 'user',
  data: {'name': '李四', 'age': 30},
);

// 批量创建
final result = await _cloudBase!.models.createMany(
  name: 'user',
  data: [
    {'name': '王五', 'age': 28},
    {'name': '赵六', 'age': 32},
  ],
);

// 更新记录
final result = await _cloudBase!.models.update(
  name: 'user',
  filter: {'name': {'$eq': '李四'}},
  data: {'age': 31},
);

// 存在则更新，不存在则创建
final result = await _cloudBase!.models.upsert(
  name: 'user',
  data: {'name': '钱七', 'age': 27},
);

// 执行 SQL 模板命令
final result = await _cloudBase!.models.mysqlCommand(
  name: 'user',
  sqlTemplate: 'SELECT * FROM user WHERE age > ?',
  sqlParameter: [18],
);
```

#### 数据源查询操作

用于查询和管理数据模型元信息，共 7 种方法：

```dart
// 1. 聚合数据源列表 —— 分页查询所有聚合数据源
final result = await _cloudBase!.models.getAggregateDataSourceList(
  pageSize: 10,
  pageIndex: 1,
);

// 2. 聚合数据源详情 —— 按 ID 或名称查询单个聚合数据源
final result = await _cloudBase!.models.getDataSourceAggregateDetail(
  datasourceId: 'datasource-id',  // 与 dataSourceName 二选一
  dataSourceName: 'user',
);

// 3. 按表名查数据源 —— 根据数据库表名反查关联的数据源信息
final result = await _cloudBase!.models.getDataSourceByTableName(
  tableNames: ['users', 'orders'],
);

// 4. 基础数据源列表 —— 分页查询基础数据源
final result = await _cloudBase!.models.getBasicDataSourceList(
  nameList: ['user', 'order'],  // 可选，不传则查全部
  pageSize: 10,
  pageNum: 1,
);

// 5. 基础数据源详情 —— 按 ID 或名称查询单个基础数据源
final result = await _cloudBase!.models.getBasicDataSource(
  datasourceId: 'datasource-id',
  dataSourceName: 'user',
);

// 6. Schema 列表 —— 查询数据源的 Schema 及关联关系
final result = await _cloudBase!.models.getSchemaList(
  dataSourceNameList: ['user', 'order'],  // 可选，不传则查全部
);

// 7. 按数据源查表名 —— 根据数据源名称查询对应的数据库表名
final result = await _cloudBase!.models.getTableName(
  dataSourceName: 'user',
);
```

## 重要说明

1. 在使用前请先在应用的环境配置页面输入您的云开发环境 ID 和访问密钥。
2. 本模板默认使用匿名登录进行快速测试，生产环境建议使用更安全的登录方式。
3. 在使用云函数、云托管等功能前，请确保在云开发控制台中已创建相应的资源。
4. 验证码登录需要在云开发控制台开启短信或邮件服务。
5. MySQL 和数据模型功能需要在云开发控制台中开通数据库服务并创建对应的表/模型。

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

## 许可证

MIT
