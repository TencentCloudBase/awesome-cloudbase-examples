# 安全红线 + 上线清单

> 基于 `pay-common/README.md` §铁律 + `开发注意事项与模板使用指南.md` §六 整理。
> **上线前必须逐条检查。**

---

## 一、铁律（违反即导致严重问题）

| # | 规则 | 违反后果 | 检查方法 |
|---|------|---------|---------|
| 1 | **金额单位 = 分** | `amount.total` 传入元为单位或浮点数导致金额错误 | 搜索代码中的 `amount.total`，确认所有赋值为整数 |
| 2 | **订单号全局唯一** | `out_trade_no` 重复导致报错；`out_refund_no` 重试换新号 = 多退钱 | 确认生成策略含时间戳+随机数 |
| 3 | **下单与调起使用同一私钥** | 混用证书/私钥导致调起支付签名失败 | 确认 `.env` 中只有一套 privateKey |

---

## 二、回调安全规则

| # | 规则 | 说明 |
|---|------|------|
| 4 | **回调先应答后处理** | 收到回调立即返回 `{ code: "SUCCESS" }`，再异步处理业务。超时 5 秒微信会重试（~15 次）。**模板已实现此机制** |
| 5 | **回调必须幂等** | 微信会重发回调（~15 次），不判重会导致重复发货/扣款。**orderService 必须先查状态再更新** |
| 6 | **openid 不可信** | 前端传入的 openid 可被篡改。生产环境用服务端 JWT 获取。**CloudBase Auth 自动解决此问题** |
| 7 | **回调路由不开鉴权** | SDK 模式下，支付/转账回调路由不能开身份认证。微信回调无 JWT Token |

---

## 三、网络安全规则

| # | 规则 | 说明 |
|---|------|------|
| 8 | **私钥禁止硬编码** | 必须通过环境变量注入。禁止写在代码、配置文件、Git 中 |
| 9 | **回调 URL 必须 HTTPS** | 微信不支持 HTTP 回调。本地调试用 ngrok |
| 10 | **回调 URL 不能带 ? 参数** | 如 `?token=xxx`，微信会拒绝 |
| 11 | **放行微信 IP 白名单** | 上海/深圳/广州腾讯云 IP 段必须在防火墙/安全组放行 |
| 12 | **CORS 合理配置** | `corsAllowOrigin` 生产环境填写实际前端域名，避免 `*` |

---

## 四、业务安全规则

| # | 规则 | 说明 |
|---|------|------|
| 13 | **金额必须来自后端** | 前端不可传金额，应由服务端根据商品 ID 从数据库查询确定 |
| 14 | **回调金额校验** | `orderService.handlerUnifiedTrigger` 中比对回调金额与订单金额，防止篡改 |
| 15 | **转账 mchId 动态获取** | 不得硬编码，必须从后端转账接口返回值中获取 |
| 16 | **APP 签名字段正确** | APP 支付 package=`Sign=WXPay`、sign（非 paySign）、必传 appId + partnerId |
| 17 | **H5 场景信息完整** | H5 支付必传 `scene_info.payer_client_ip` + `h5_info.type` |
| 18 | **退款单号复用** | 同一笔退款重试时必须用同一个 `out_refund_no`，换号 = 多退钱 |

---

## 五、上线前检查清单

### 5.1 环境配置 ☑️

- [ ] `.env` 所有必填变量已填入生产值
- [ ] `signMode` 与部署方式匹配（云函数+集成中心=gateway；云托管=sdk）
- [ ] 回调 URL 正确（SDK→自己的域名，Gateway→集成中心域名）
- [ ] `privateKey` 格式验证通过（运行 `check_pem_format.py`）
- [ ] `wxPayPublicKey` 是**微信支付公钥**（不是商户 API 公钥）
- [ ] `corsAllowOrigin` 填写实际前端域名
- [ ] `.env` 已加入 `.gitignore`
- [ ] 环境变量已在控制台配置（云托管）/ cloudbaserc.json 已配置（云函数）

### 5.2 商户平台配置 ☑️

- [ ] AppID 已关联绑定商户号
- [ ] JSAPI/H5/Native/APP 对应的 AppID 类型正确
- [ ] **H5 支付授权目录**已配置（格式 `https://domain.com/path/`，末尾带 `/`）
- [ ] **回调地址**已配置到商户平台（支付/退款/转账三个地址）
- [ ] Gateway 模式下回调地址指向**集成中心域名**
- [ ] **商家转账 IP 白名单**已添加（如使用转账功能）
- [ ] **APIv3 密钥**确认无误（32 字节）

### 5.3 部署验证 ☑️

- [ ] 部署命令执行成功（`tcb fn deploy` / `tcb cloudrun deploy`）
- [ ] 云函数已开启 **HTTP 访问服务**
- [ ] 环境变量生效（可通过健康接口或日志确认）
- [ ] `validate_env.sh` 脚本全部 PASS
- [ ] 测试下单接口返回 `code: 0`

### 5.4 回调验证 ☑️

- [ ] `test_callback_url.sh` 显示回调 URL 可达（HTTPS、200 OK）
- [ ] SDK 模式：回调路由**已关闭鉴权**
- [ ] SDK 模式：防火墙/**安全组已放行微信 IP**
- [ ] Gateway 模式：集成中心正常运行
- [ ] Gateway 模式：商户平台回调地址为集成中心 URL

### 5.5 前端验证 ☑️

- [ ] 小程序：`request 合法域名`已配置
- [ ] 小程序：`signInWithOpenId()` 登录正常
- [ ] 小程序：openid 可正常获取
- [ ] H5：授权目录匹配
- [ ] APP：Universal Links 已配置（iOS）
- [ ] 全端：**金额单位为分**

### 5.6 业务逻辑验证 ☑️

- [ ] `orderService.js` 已实现（非空占位）
- [ ] `handlerUnifiedTrigger` 有幂等检查
- [ ] `handlerUnifiedTrigger` 有金额校验
- [ ] 转账功能（如使用）：mchId 从后端动态获取
- [ ] 退款功能（如使用）：`out_refund_no` 重试用同一单号

### 5.7 监控告警（建议）☑️

- [ ] 支付回调异常日志可查
- [ ] 签名失败有告警
- [ ] 大额交易有监控
- [ ] 退款操作有审计日志

---

## 六、常见安全问题案例

### 案例 1：金额被篡改

```
攻击者修改前端请求:
amount: { total: 1 } → amount: { total: 1 }   // 将 100 分改为 1 分

防御: orderService.handlerUnifiedTrigger 中比对回调金额与原始订单金额
```

### 案例 2：回调重放导致双重发货

```
微信因网络原因发送两次回调:
第 1 次 → handlerUnifiedTrigger → 更新为 PAID → 发货 ✓
第 2 次 → handlerUnifiedTrigger → 又更新为 PAID → 又发货 ✗

防御: 条件更新 WHERE status IN ('NOTPAY','USERPAYING'), 已 PAID 则跳过
```

### 案例 3：openid 伪造

```
攻击者在请求中伪造:
payer: { openid: "victim_openid" }  // 冒充他人

防御: 使用 CloudBase Auth JWT，后端从 Token 解析真实 openid
```

---

*详细排查见 [troubleshooting.md](../问题排查/troubleshooting.md) | 错误模式见 [error-patterns.md](../问题排查/error-patterns.md)*
