# 错误模式详解（Deep Dive）

> 基于 `troubleshooting.md` 的 20+ 条目展开深度分析。
> 当速查表不够用时，查阅本文档做根因分析。

---

## 一、签名类错误模式

### 模式 A：「签名错误」—— 最常见也最难排查

#### 症状

```
{ code: "SIGN_ERROR", message: "签名错误" }
// 或
{ code: -1, msg: "签名验证失败" }
```

#### 根因树

```
签名错误
├── ① PEM 私钥格式问题（占比 ~40%）
│   ├── privateKey 包含真换行（应为 \n 两字符）
│   ├── 复制时引入多余空格/特殊字符
│   ├── PEM header/footer 缺失或错误
│   └── 排查：运行 check_pem_format.py
│
├── ② 公钥搞混（占比 ~25%）
│   ├── 用了商户 API 公钥（而非微信支付公钥）
│   ├── wxPayPublicKey 填的是 API 证书配对公钥
│   └── 排查：重新从商户平台→API安全→微信支付公钥复制
│
├── ③ 证书序列号错误（占比 ~15%）
│   ├── 复制时漏掉字符
│   ├── 用了旧证书的序列号
│   └── 排查：重新从商户平台→API安全→API证书复制完整40位
│
├── ④ 下单与调起用了不同私钥（占比 ~10%）
│   ├── 下单用环境 A 的私钥，调起用环境 B 的
│   ├── 多套环境切换时混淆
│   └── 排查：确认下单和调起签名使用同一个 privateKey
│
├── ⑤ 环境变量未生效（占比 ~10%）
│   ├── 修改了 .env 但未重启
│   ├── 云函数环境变量覆盖了 cloudbaserc.json
│   └── 排查：重启服务；检查启动日志打印的 signMode
│
└── 其他（极少）
    └── 时间偏差过大（服务器时间不准）
```

#### 排查步骤

```bash
# Step 1: 检查 PEM 格式
python3 scripts/check_pem_format.py '$(grep privateKey .env | cut -d= -f2)'

# Step 2: 检查环境变量完整性
bash scripts/validate_env.sh .env

# Step 3: 查看启动日志中的配置 Debug 信息
# 应看到: [Config Debug] privateKey 包含真换行: false
```

---

### 模式 B：「验签不通过」—— 回调场景特有

#### 症状

回调处理时报验签失败，但下单正常。

#### 根因分析

```
验签不通过（回调场景）
├── wxPayPublicKey 填错了（同模式 A-②）
│
├── 回调数据被中间件修改
│   ├── 反向代理改了 body
│   ├── Gzip 压缩导致解析异常
│   └── 排查：打印回调原始 body 对比
│
├── Gateway/SDK 模式混用
│   ├── signMode=sdk 但回调走了集成中心
│   ├── signMode=gateway 但回调直连了自己
│   └── 排查：确认 signMode 与三个 notifyURL 方向一致
│
└── AES-GCM 解密密钥(apiV3Key)错误
    ├── 长度不是 32 字节
    ├── 多余空格/换行
    └── 排查：重新从商户平台获取 apiV3Key
```

---

## 二、回调类错误模式

### 模式 C：「收不到回调」—— 第二高频问题

#### 根因树

```
收不到回调
├── URL 层面（最常见）
│   ├── URL 不是 HTTPS → 微信拒绝连接
│   ├── URL 带 ? 参数 → 微信拒绝
│   ├── URL 指向 localhost → 微信无法访问
│   └── 排查：curl -v https://your-url 测试
│
├── 网络层面
│   ├── 防火墙拦截微信 IP
│   ├── 安全组未开放 443 端口
│   ├── CDN/WAF 拦截 POST 请求
│   └── 排查：scripts/test_callback_url.sh <url>
│
├── 服务层面
│   ├── 云函数未开 HTTP 访问服务 → 404
│   ├── 回调路由开了鉴权 → 401/403（微信无Token）
│   ├── 路由路径拼写错误 → 404
│   ├── 服务崩溃/OOM → 502
│   └── 排查：对照 SKILL.md 回调路由表检查路径
│
├── signMode 配置错误
│   ├── sdk 模式但 notifyURL 指向集成中心
│   ├── gateway 模式但 notifyURL 指向自己
│   └── 排查：sign-mode.md 决策树
│
└── 商户平台配置
    ├── 回调地址未配置或配置错误
    ├── 配置了但未保存
    └── 排查：登录商户平台逐个核对三个回调地址
```

#### 快速诊断脚本

```bash
# 测试回调 URL 连通性
bash scripts/test_callback_url.sh https://your-domain/cloudrun/v1/pay/unifiedOrderTrigger

# 预期输出:
# ✅ HTTPS 连接正常
# ✅ DNS 解析成功
# ✅ HTTP 状态码: 200
# ⚠️  响应时间: 234ms
```

---

### 模式 D：「回调重复收到」

#### 正常 vs 异常

| 场景 | 是否正常 | 原因 |
|------|:-------:|------|
| 同一订单收到 2-5 次回调 | **正常** | 微信重试机制（15s×2 → 30s → 3min → 10min...） |
| 收到 >15 次 | **异常** | 你没有正确返回 SUCCESS |
| 不同订单交替收到 | **正常** | 各自有各自的重试周期 |
| 收到的数据完全相同 | **正常** | 微信重发相同内容 |
| 收到的数据不同（如金额变了） | **异常** | 极罕见，可能是重放攻击 |

#### 微信重试时间线

```
首次回调 ──→ 15s ──→ 15s ──→ 30s ──→ 3min ──→ 10min ──→ ... ──→ 间隔最长 6h
                                                    总计约 15 次
```

> **应对策略**：幂等处理。第一次处理后直接返回 SUCCESS，后续重复直接跳过。

---

## 三、部署类错误模式

### 模式 E：「502 Bad Gateway」

#### 根因树

```
502 错误
├── 冷启动超时（最常见）
│   ├── 云函数首次调用，依赖加载慢
│   ├── 内存不足导致 OOM Kill
│   └── 解决：增加内存（256MB→512MB）；等几秒重试
│
├── 环境变量缺失
│   ├── 控制台未配置 / cloudbaserc 未写入
│   ├── 变量名拼写错误
│   └── 解决：运行 validate_env.sh
│
├── 端口不匹配
│   ├── Dockerfile EXPOSE 与 app.listen 不一致
│   ├── SCF 启动文件端口配置错误
│   └── 解决：确认统一为 3000
│
└── 进程崩溃
    ├── 依赖版本冲突
    ├── 内存泄漏 OOM
    └── 解决：查看函数/容器日志
```

### 模式 F：「tcb fn deploy 失败」

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `未登录` / `token expired` | CLI 登录过期 | `tcb login` 重新扫码 |
| `envId 不存在` | 环境名称错误 | 确认 envId 大小写 |
| `函数名已存在` | 名称冲突 | 先删除旧函数或改名 |
| `codeUri 过大` | 打包文件超过限制 | 添加 `.cloudbaseignore` 排除 node_modules |
| `依赖安装失败` | 网络问题/版本冲突 | 查看 build 日志；尝试 `npm ci` 替代 `npm install` |

---

## 四、前端类错误模式

### 模式 G：小程序「登录失败」

```
登录失败根因
├── ENV_ID 未替换或写错
│   └── 控制台显示 your-env-id → 未修改默认值
│
├── 身份源未开启
│   └── 控制台 → 身份认证 → 开启「微信小程序」
│
└── 网络问题
    └── 小程序开发者工具勾选「不校验合法域名」
```

### 模型 H：H5「当前页面无法发起支付」

```
H5 支付被拒根因
├── 授权目录未配置（#1 原因，占 80%）→ 商户平台添加
├── URL 与授权目录不匹配 → 检查前缀匹配规则
├── 缺少 scene_info → 补充 payer_client_ip + h5_info.type
├── payer_client_ip 不是真实 IP → 后端透传 X-Forwarded-For
└── h5_info.type 缺失或非法 → 必须是 Wap/iOS/Android/PC 之一
```

### 模式 I：APP「支付签名错误」（APP 特有）

> APP 支付签名与 JSAPI **完全不同**，详见 [app.md](../前端集成/app.md)。

| 错误表现 | 可能原因 | 检查点 |
|---------|---------|--------|
| 调起支付界面闪退 | package 字段错误 | 是否为 `Sign=WXPay`？ |
| 提示"签名错误" | sign 字段错误 | 是否叫 `sign`（非 `paySign`）？ |
| 提示"参数错误" | 缺少 appId/partnerId | 这两个字段是否传递？ |
| iOS 无法回调 | Universal Links 未配置 | 检查 Associated Domains |

---

## 五、转账类错误模式

### 模式 J：商家转账特殊错误

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `NO_NOTIFY_URL` | 未配置转账回调 URL | 检查 `transferNotifyUrl` |
| `MCH_NOT_MATCH` | mchId 与实际商户号不符 | 从后端返回值动态获取 |
| `AMOUNT_LIMIT` | 金额超出 0.3~1999.99 | 调整金额或加密 user_name |
| `FREQUENCY_LIMITED` | 请求太频繁 | 同一单号 3 天内重试 |
| `NOT_ENOUGH` | 商户余额不足 | 充值 |
| `NAME_MISMATCH` | 收款人姓名与 openid 不一致 | 确认用户信息 |
| `SEND_FAILED` | 用户拒收或账号异常 | 引导用户检查微信钱包 |

---

## 六、通用诊断流程

遇到任何错误时，按以下顺序收集信息：

```
Step 1: 收集基础信息
├── 完整错误信息（JSON / 截图）
├── signMode 值
├── 部署方式（云函数 / 云托管 / 本地）
├── 支付方式（JSAPI / H5 / Native / APP）
└── 操作步骤描述

Step 2: 运行诊断脚本
├── bash scripts/validate_env.sh .env
├── python3 scripts/check_pem_format.py '<key>'
├── bash scripts/test_callback_url.sh <url>
└── python3 scripts/check_deploy_config.py .

Step 3: 对照本文档错误模式
├── 找到对应模式
├── 按根因树逐一排除
└── 执行解决方案

Step 4: 如果仍未解决
├── 收集服务端日志（脱敏）
├── 收集请求/响应完整报文
└── 提交工单时附上以上全部信息
```

---

*快速速查见 [troubleshooting.md](troubleshooting.md) | 脚本工具见 [SKILL.md](../../SKILL.md) §脚本工具*
