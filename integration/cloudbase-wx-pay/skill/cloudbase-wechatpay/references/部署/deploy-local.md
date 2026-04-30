# 本地开发调试

> 基于 `pay-common/README.md` §本地开发整理。

---

## 适用场景

- **调试**支付流程、排查问题
- **开发新功能**后再部署到云端
- **首次接入**时验证 .env 配置正确性

---

## 前提条件

| 条件 | 版本要求 |
|------|---------|
| Node.js | 16+ |
| npm | 7+ |

---

## 快速开始

### Step 1：安装依赖

```bash
cd pay-common
npm install
```

### Step 2：配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入你的商户参数（详见 env-config.md）
```

> **本地开发推荐使用 SDK 模式**（`signMode=sdk`），因为无法使用集成中心。

### Step 3：启动服务

```bash
npm start
# 或
node app.js
```

服务默认监听 `http://localhost:3000`。

启动日志示例：
```
[pay-common] 服务启动于 http://localhost:3000
[Config Debug] signMode: sdk
[Config Debug] privateKey 包含真换行: false  ← 正确！应为 false
[Config Debug] 回调 URL: http://localhost:3000/cloudrun/v1/pay/unifiedOrderTrigger
[Router] 注册 18 个路由
```

### Step 4：测试下单

```bash
# JSAPI 下单测试
curl -X POST http://localhost:3000/cloudrun/v1/pay/wxpay_order \
  -H "Content-Type: application/json" \
  -d '{
    "description": "测试商品",
    "out_trade_no": "TEST'$(date +%Y%m%d%H%M%S)'",
    "amount": { "total": 1, "currency": "CNY" },
    "payer": { "openid": "oUpF8uMuAJO_M2pxb1Q9zNjWeS6o" }
  }'
```

成功响应：
```json
{ "code": 0, "msg": "success", "data": { "prepay_id": "wx20..." } }
```

---

## 内网穿透（回调调试必需）

> 本地开发时，微信服务器无法直接访问 `localhost`。需要使用内网穿透工具暴露本地服务。

### 推荐：ngrok

```bash
# 安装 ngrok（macOS）
brew install ngrok

# 认证
ngrok config add-authtoken YOUR_TOKEN

# 穿透本地 3000 端口
ngrok http 3000
```

ngrok 会输出一个公网 URL，如：
```
Forwarding    https://xxxx.ngrok-free.app -> http://localhost:3000
```

### 临时修改回调 URL

**方式 A：临时改 .env（简单但易忘）**

```bash
# 将回调 URL 从 localhost 改为 ngrok 地址
sed -i '' 's|localhost:3000|xxxx.ngrok-free.app|g' .env
# 重启服务
```

**方式 B：启动时覆盖（推荐）**

```bash
notifyURLPayURL="https://xxxx.ngrok-free.app/cloudrun/v1/pay/unifiedOrderTrigger" \
notifyURLRefundsURL="https://xxxx.ngrok-free.app/cloudrun/v1/pay/refundTrigger" \
transferNotifyUrl="https://xxxx.ngrok-free.app/cloudrun/v1/pay/transferTrigger" \
npm start
```

### 其他穿透工具

| 工具 | 特点 |
|------|------|
| [ngrok](https://ngrok.com) | 最常用，免费版域名随机变化 |
| [cloudflare tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) | 免费固定域名 |
| [frp](https://github.com/fatedier/frp) | 需自建服务端，完全可控 |

---

## 本地调试技巧

### 1. 查看详细日志

```bash
# 设置 DEBUG 环境变量获取更多日志
DEBUG=* npm start
```

### 2. 单独测试某个路由

```bash
# 查单
curl -X POST http://localhost:3000/cloudrun/v1/pay/wxpay_query_order_by_out_trade_no \
  -H "Content-Type: application/json" \
  -d '{"out_trade_no": "TEST20260424001"}'

# 关闭订单
curl -X POST http://localhost:3000/cloudrun/v1/pay/wxpay_close_order \
  -H "Content-Type: application/json" \
  -d '{"out_trade_no": "TEST20260424001"}'

# 退款
curl -X POST http://localhost:3000/cloudrun/v1/pay/wxpay_refund \
  -H "Content-Type: application/json" \
  -d '{
    "out_trade_no": "TEST20260424001",
    "out_refund_no": "REFUND'$(date +%Y%m%d%H%M%S)'",
    "total": 1,
    "refund": 1,
    "reason": "测试退款"
  }'

# 商家转账
curl -X POST http://localhost:3000/cloudrun/v1/pay/wxpay_transfer \
  -H "Content-Type: application/json" \
  -d '{
    "out_bill_no": "BILL'$(date +%Y%m%d%H%M%S)'",
    "transfer_amount": 1,
    "openid": "oUpF8uMuAJO_M2pxb1Q9zNjWeS6o"
  }'
```

### 3. 用诊断脚本排查配置

```bash
# 校验 .env 完整性
bash scripts/validate_env.sh .env

# 检查 PEM 格式
python3 scripts/check_pem_format.py "$(< .env grep privateKey | cut -d= -f2)"
```

### 4. 模拟回调（高级）

可以用 curl 模拟微信回调来测试回调处理逻辑：

```bash
# 模拟支付回调（仅测试路由是否可达，不含真实签名）
curl -X POST http://localhost:3000/cloudrun/v1/pay/unifiedOrderTrigger \
  -H "Content-Type: application/json" \
  -d '{"resource": {"ciphertext": "fake"}}'
```

> 注意：真实回调包含 AES-GCM 加密的密文，模拟数据会被验签拒绝。此方法仅用于确认**路由是否可达**以及**回调接口是否正常工作**。

---

## 从本地到云端的迁移清单

| # | 检查项 | 本地 | 云端 |
|---|:------:|:----:|:----:|
| 1 | `.env` 中的 `signMode` | sdk | sdk 或 gateway |
| 2 | 回调 URL | ngrok 地址（临时） | 正式 HTTPS 域名 |
| 3 | `corsAllowOrigin` | `*`（宽松） | 前端实际域名 |
| 4 | 日志级别 | DEBUG | info 或 warn |
| 5 | 环境变量来源 | `.env` 文件 | 控制台 / cloudbaserc.json |

---

## 常见问题

| # | 问题 | 原因 | 解决方案 |
|---|------|------|---------|
| 1 | `npm start` 报端口占用 | 3000 端口已被使用 | `lsof -ti:3000 \| xargs kill -9` 或换端口 |
| 2 | 启动报 `privateKey 格式错误` | PEM 换行符不对 | 运行 `check_pem_format.py` 检查 |
| 3 | 下单报签名失败 | .env 中凭证有误 | 逐一核对 merchantId / serialNumber / apiKey 等 |
| 4 | ngrok 穿透后回调仍收不到 | 商户平台回调地址未改为 ngrok URL | 登录商户平台更新回调配置 |
| 5 | 代码修改后不生效 | 忘记重启服务 | Ctrl+C 后重新 `npm start` |

---

*部署到云端见 [deploy-cloud-function.md](deploy-cloud-function.md) 或 [deploy-cloud-run.md](deploy-cloud-run.md)*
