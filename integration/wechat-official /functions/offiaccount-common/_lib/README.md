# CloudBase 公共代码库 (_lib/)
> 从 pay-common / offiaccount-common 已有实现中抽取的通用代码，供所有云函数模版复用。

## 目录结构

```
_lib/
├── auth.js              # JWT 解析 + 鉴权中间件（5种部署兼容）
├── response.js          # success/fail 统一响应格式
├── callback.js          # 回调通知公共处理（网关+SDK双模式）
├── error.js             # 统一错误码 + AppError 异常类
├── logger.js            # 日志工具（分级输出 + 模块标识）
└── scaffold/            # Express 脚手架模板
    ├── app.js           #   Express 应用骨架（含 CORS/BodyParser/错误处理）
    ├── bin/www          #   本地启动脚本（端口可配）
    ├── scf_bootstrap    #   SCF 云函数启动脚本
    └── Dockerfile       #   云托管 Docker 构建模板
```

## 使用方式

每个云函数通过**内嵌副本**的方式使用：

```bash
# 方式一：手动复制（函数少时够用）
cp -r functions/_lib/* functions/sms-common/_lib/

# 方式二：在函数目录内创建 _lib/ 并建立符号链接（开发时方便同步）
cd functions/sms-common
ln -s ../../_lib _lib
```

> **生产部署时请使用硬拷贝（方式一）**，确保云函数打包时包含所有依赖。

## API 文档

### auth.js — 鉴权

```javascript
const { parseCloudBaseAuth, getOpenId, authMiddleware, h5SecurityMiddleware } = require('./_lib/auth');

// 解析 JWT payload
const userInfo = parseCloudBaseAuth(req); // → { sub: 'uid', provider_sub: 'openid', ... }

// 获取 openid（JWT > body.payer.openid）
const openid = getOpenId(req);

// Express 中间件：5 种部署方式自动识别
app.use('/api', authMiddleware({ functionName: 'sms' }));
app.use('/h5', h5SecurityMiddleware());
```

### response.js — 响应

```javascript
const { success, fail } = require('./_lib/response');

success(res, data);              // → { code: 0, msg: 'ok', data }
success(res, data, '自定义消息'); // → { code: 0, msg: '自定义消息', data }
fail(res, '参数错误');            // → 400 { code: -1, msg: '参数错误', data: null }
fail(res, '服务器异常', 500);     // → 500 { code: -1, msg: '服务器异常', data: null }
```

### callback.js — 回调

```javascript
const { handleCallback } = require('./_lib/callback');

exports.trigger = (req, res) => {
    return handleCallback(req, res, service.handlePayCallback, 'payTrigger', {
        decryptedHeaderKey: 'x-tcb-wechatpay-decrypted',  // 网关解密 header 名称
        successCode: 'SUCCESS',
        failCode: 'FAIL',
    });
};
```

### error.js — 错误码

```javascript
const { ErrorCode, AppError } = require('./_lib/error');

throw new AppError('订单不存在', ErrorCode.NOT_FOUND, 404);
throw new AppError('签名验证失败', ErrorCode.PAY_SIGN_ERROR, 403);
```

### logger.js — 日志

```javascript
const logger = require('./_lib/logger');

logger.info('Controller', '下单成功', { orderId: 'xxx' });
logger.error('Service', 'SDK调用失败', err.message);
// 通过 LOG_LEVEL=debug 环境变量控制输出级别
```

## 部署命令

```bash
# 部署到 CloudBase
tcb fn deploy <functionName>

# HTTP 函数部署
tcb fn deploy <functionName> --httpFn

# 强制覆盖（含配置和触发器）
tcb fn deploy <functionName> --force --yes
```
