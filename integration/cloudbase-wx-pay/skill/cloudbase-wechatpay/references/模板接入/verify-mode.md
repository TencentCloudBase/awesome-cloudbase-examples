# 证书验签 vs 公钥验签详解

> 基于 `config/config.js` §verifyMode + `services/strategies/sdkStrategy.js` 整理。
> 本文档仅适用于 **SDK 模式（`signMode=sdk`）**。Gateway 模式的回调验签由集成中心完成，不涉及本篇内容。

---

## 背景：微信支付 V3 有两种验签机制

微信支付 API V3 在回调通知中，签名头携带了微信的证书序列号（`Wechatpay-Serial`）。你的服务需要用对应的**公钥或平台证书公钥**来验证这个签名。微信提供了两条路径：

| | 证书验签 (`certificate`) | 公钥验签 (`publickey`) |
|---|------------------------|----------------------|
| **验签材料来源** | SDK 运行时从微信服务器**下载**平台证书，提取公钥 | 你手动在环境变量里配置**固定的**微信支付公钥 |
| **自动刷新** | ✅ 平台证书过期后 SDK 自动重新下载 | ❌ 公钥过期需手动更新 |
| **配置复杂度** | 低（少配两个变量） | 中（多配 `wxPayPublicKey` + `wxPayPublicKeyId`） |
| **首次启动耗时** | 稍慢（需网络请求下载证书） | 快（本地即有） |
| **依赖网络** | 是（下载证书需要访问微信 API） | 否 |
| **稳定性风险** | wechatpay-node-v3 SDK 有已知缓存 bug | 无 SDK 层问题 |
| **推荐场景** | 新项目、不想管公钥过期 | 已有旧配置、内网 / 离线环境 |

> 💡 **两种方式验出的结果完全等价**——都是用 RSA-SHA256 验证同一个签名串，区别只在于公钥从哪来。

---

## 自动推断逻辑（无需手动设置 verifyMode）

`config.js` L16 根据你是否配置了 `wxPayPublicKey` 自动选择：

```js
// config/config.js L13-L16
verifyMode: (process.env.wxPayPublicKey || '') ? 'publickey' : 'certificate',
```

| 条件 | 结果 |
|------|------|
| 配了 `wxPayPublicKey`（非空）→ | `publickey`（公钥模式） |
| 没配或为空 → | `certificate`（证书模式） |

**你不需要手动设置 `verifyMode` 环境变量**，配好凭证后代码会自动选对路径。

---

## 工作原理

### 公钥模式 (`publickey`) — 默认（配了公钥时）

```
微信回调到达
    ↓
① 从环境变量读取 wxPayPublicKey（固定值）
    ↓
② crypto.createVerify('RSA-SHA256')
    ↓  拼接验签串：timestamp\nnonce\nbody\n
③ verify(wxPayPublicKey, signature, 'base64')   ← sdkStrategy.js L372-377
    ↓
④ 返回 true/false
```

**对应代码**：`sdkStrategy.js` L28-38（构造）、L211-213（Wechatpay-Serial header）、L371-377（验签）

**优点**：
- 简单直接，不依赖外部网络
- 日志易读：`[SdkStrategy] 公钥验签结果: true`
- 无 SDK 版本兼容性问题

**缺点**：
- 微信支付公钥**每年可能轮换**，过期后需手动去商户平台复制新的并更新环境变量
- 多配了两个变量（`wxPayPublicKey` + `wxPayPublicKeyId`）

### 证书模式 (`certificate`) — 未配公钥时自动启用

```
微信回调到达
    ↓
① 调用 this.wxPay.getCertificates() 获取 SDK 缓存的平台证书列表
    ↓  如果缓存为空：
    ↓  ② 调用 this.wxPay.get_certificates() 向微信 API 下载平台证书
    ↓     用 merchantSerialNo + privateKey + apiV3Key 做鉴权下载
    ↓  ③ 从返回值中提取 publicKey（绕过 SDK 内部缓存 bug）
    ↓        兼容多种返回格式：
    ↓        - { '0': { serial_no, publicKey } }
    ↓        - { data: { data: [{ serial_no, encrypt_certificate }] } }
    ↓
④ 按 callbackParams.serial 匹配对应的平台证书
    ↓  不匹配则使用第一张（微信通常只有一张）
    ↓
⑤ crypto.createVerify('RSA-SHA256')
    ↓  拼接验签串：timestamp\nnonce\nbody\n
⑥ verify(matchedCert.publicKey, signature, 'base64')   ← sdkStrategy.js L363-368
    ↓
⑦ 返回 true/false
```

**对应代码**：`sdkStrategy.js` L15-26（构造，传占位符绕过校验）、L201-210（Wechatpay-Serial header）、L276-368（完整验签逻辑）

**优点**：
- 少配两个变量（`wxPayPublicKey`、`wxPayPublicKeyId`）
- 平台证书自动管理，理论上有自动刷新能力

**缺点**：
- **wechatpay-node-v3@2.2.x 存在已知 bug**：`get_certificates()` 下载成功但不会更新内部 `certificates` 缓存（代码 L286-287 注释已标注），必须手动从下载结果提取公钥
- 首次调用需要网络请求到微信服务器下载证书
- 排查链路更长：下载失败 → 序列号不匹配 → 格式解析异常 → 每一步都可能是根因
- 启动日志更复杂，需要逐层分析

---

## 配置差异

### 公钥模式必填项

```env
# —— 在基础凭证之外，额外需要 —— #
wxPayPublicKey=-----BEGIN PUBLIC KEY-----\nYOUR_WX_PAY_PUBLIC_KEY_PEM\n-----END PUBLIC KEY-----
wxPayPublicKeyId=YOUR_WX_PAY_PUBLIC_KEY_ID   # 与公钥一一对应的 ID
```

### 证书模式（不需要上面两个）

只需确保以下基础凭证正确即可（SDK 用它们来下载和解析平台证书）：

```env
merchantSerialNumber=YOUR_SERIAL_NUMBER       # 用于标识你的商户身份，下载证书时鉴权用
privateKey=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----  # 下载证书时的签名凭据
apiV3Key=YOUR_API_V3_KEY                      # 解密下载到的加密证书
```

---

## 如何判断当前用的是哪种模式？

### 方法一：查看启动日志

```bash
# 公钥模式输出：
[SdkStrategy] 验证模式: PUBLICKEY（固定公钥）

# 证书模式输出：
[SdkStrategy] 验证模式: CERTIFICATE（SDK 内置证书管理）
```

### 方法二：看环境变量

| 你配了 `wxPayPublicKey`？ | verifyMode |
|:-------------------------:|:----------:|
| 配了（非空字符串） | `publickey` |
| 没配 / 为空 | `certificate` |

### 方法三：回调验签日志

```bash
# 公钥模式：
[SdkStrategy] 公钥验签结果: true

# 证书模式：
[SdkStrategy] 证书模式: getCertificates() 返回类型: object ...
[SdkStrategy] 从下载结果提取到 1 张证书
[SdkStrategy]   [0] serial: ABC123... | hasPublicKey: true
[SdkStrategy] 证书验签结果: true (serial: ABC123...)
```

---

## 切换方式

### 从公钥模式 → 证书模式

**删除** `wxPayPublicKey` 和 `wxPayPublicKeyId` 两个环境变量，重启服务。

```bash
# CLI 部署：从 cloudbaserc.json 的 envVariables 里删掉这两行
# 控制台部署：从环境变量配置里删除这两项
# 云托管：从服务配置环境变量里删除
```

重启后日志应显示 `[SdkStrategy] 验证模式: CERTIFICATE`。

### 从证书模式 → 公钥模式

**添加** `wxPayPublicKey` 和 `wxPayPublicKeyId` 两个环境变量，重启服务。

> ⚠️ 注意：`wxPayPublicKeyId` 和 `wxPayPublicKey` 必须成对配置，缺一不可。`validateConfig()` 会检查此项（`config.js` L94-98）。

---

## 常见问题排查

### 问题 1：证书模式下「下载平台证书失败」

这是**证书模式 #1 高频错误**。

**症状**：
```
[SdkStrategy] 证书列表为空，尝试主动下载平台证书...
[SdkStrategy] 下载平台证书失败（这通常是根因）: NO_AUTH ...
```
或
```
[SdkStrategy] 下载后仍无可用平台证书，无法验签
```

**根因树**：
```
证书下载失败
├── apiV3Key 错误（最常见，~50%）
│   ├── 复制时多了/少了字符
│   ├── 用了 V2 的 MD5 密钥而非 V3 的 AES-256-GCM 密钥
│   └── 排查：重新从商户平台 → API 安全 → APIv3 密钥 复制完整的 32 字节密钥
│
├── merchantSerialNumber 与 privateKey 不匹配（~25%）
│   ├── 用了旧证书的序列号但换了新私钥
│   └── 排查：确认两者来自同一份 API 证书申请
│
├── privateKey 格式错误（~15%）
│   ├── \n 转换失败（真换行 vs 字面量 \n）
│   └── 排查：运行 check_pem_format.py；查看启动日志 privateKey Debug 信息
│
├── 网络不通（~10%）
│   ├── 服务器无法访问 api.mch.weixin.qq.com
│   ├── 防火墙/安全组拦截出站 HTTPS
│   └── 排查：curl -v https://api.mch.weixin.qq.com 测试连通性
│
└── SDK 版本兼容性（~5%+）
    └── wechatpay-node-v3 不同版本的 get_certificates 返回格式不同
    └── 代码已做多格式兼容（sdkStrategy.js L296-320），但极端版本可能有遗漏
```

**解决方案**：如果反复遇到证书下载问题，**建议切换到公钥模式**——少一个网络依赖，排查链路短一半。

---

### 问题 2：公钥模式下「签名验证始终失败」**症状**：下单正常，回调验签一直返回 `false`。

**根因**：用了错误的公钥。详见 `env-config.md` §「公钥陷阱：微信支付公钥 vs 商户公键」。

快速自查：

| 检查点 | 正确 | 错误 |
|--------|------|------|
| 来源 | 商户平台 → API 安全 → **微信支付公钥** | 商户平台 → API 安全 → **API 证书** 页面的公钥 |
| 公钥特征 | 通常以 `-----BEGIN PUBLIC KEY-----` 开头 | 可能是证书里的公钥，格式不同 |
| 对应 ID | `wxPayPublicKeyId` 来自同页面 | N/A |

---

### 问题 3：证书模式下「serial 不匹配」

**症状**：
```
[SdkStrategy] 未找到匹配的平台证书, callback serial: XXX, 可用 serial: YYY
[SdkStrategy] serial不匹配，使用第一张可用证书
[SdkStrategy] 证书验签结果: false
```

**原因**：回调头中的 `Wechatpay-Serial` 与下载到的平台证书序列号不一致。

**可能原因**：
1. 微信刚轮换了平台证书（旧证书还在缓存中）
2. 你的商户号被分配了多张平台证书（极少见）
3. 回调被中间人篡改（极不可能）

**代码兜底处理**（`sdkStrategy.js` L329-337）：serial 不匹配时会降级使用第一张可用证书，所以大多数情况下仍能验签成功。如果还是失败，重启服务触发重新下载通常可解决。

---

### 问题 4：「我该选哪种？」决策速查

```
你想要哪种？
├── 最省事、少配变量
│   └── → 证书模式（不配 wxPayPublicKey 即可自动启用）
│       → 但要接受首次启动需联网下载证书
│
├── 最大可控性、排查方便
│   └── → 公钥模式（配 wxPayPublicKey + wxPayPublicKeyId）
│       → 日志简单、不依赖网络、无 SDK bug 影响
│
├── 内网 / 离线环境
│   └── → 只能选公钥模式（证书模式需要联网下载）
│
├── 已有旧配置在跑、不想动
│   └── → 保持现状不用改（两种模式功能等价）
│
└── 证书模式反复报错
    └── → 切换到公钥模式（一键切换：加两个环境变量）
```

---

## 两种模式的完整对比

| 维度 | 公钥模式 (`publickey`) | 证书模式 (`certificate`) |
|------|----------------------|--------------------------|
| **触发条件** | 配了 `wxPayPublicKey` | 未配 `wxPayPublicKey` |
| **验签材料** | 环境变量中的固定公钥 | SDK 运行时下载的平台证书 |
| **额外环境变量** | `wxPayPublicKey` + `wxPayPublicKeyId` | 无 |
| **首次启动** | 即时可用 | 需联网下载证书（~1-3s） |
| **依赖网络** | 否 | 是（下载证书 + 可能的自动刷新） |
| **公钥过期处理** | 手动更新环境变量 | 理论上 SDK 自动（实际依赖 SDK 实现） |
| **SDK bug 影响** | 无 | 有（wechatpay-node-v3@2.2.x 缓存 bug） |
| **排查难度** | 低（日志清晰） | 中高（多层嵌套调用） |
| **适用场景** | 推荐**默认使用** | 内网无法联网时不适用 |
| **Gateway 模式相关吗** | ❌ 不相关（Gateway 由集成中心验签） | ❌ 不相关 |

---

*签名模式（SDK vs Gateway）说明见 [sign-mode.md](sign-mode.md) | 环境变量完整列表见 [env-config.md](env-config.md) | 错误排查见 [error-patterns.md](../问题排查/error-patterns.md)*
