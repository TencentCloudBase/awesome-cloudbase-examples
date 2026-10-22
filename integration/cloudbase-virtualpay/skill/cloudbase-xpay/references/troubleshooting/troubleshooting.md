# 排查流程

## 按症状定位

### 收不到回调

```
① 微信后台消息推送配置是否提交成功？
   └ 提交时微信会立即 GET 探测，需先创建集成再提交配置
② 事件是否已订阅？
   └ 未订阅 xpay_* 事件不会推送
③ 回调承接资源是否绑定？
   └ 不绑定则推送到达后无处可转
④ 回调路由是否被改？
   └ 恢复平台预置路由
⑤ 云函数日志有无请求进来？
   └ 无 → 网关侧问题；有 → 业务侧问题
```

### 拉起支付失败

```
① signData.env 是 0 吗？
   └ 模板固定现网（env=0），改成 1 会被微信按沙箱校验并拒绝
② 道具发布超过半小时了吗？
   └ 刚发布会报 COIN_OR_PRODUCT_ID_CREATED_IN_RECENTLY
③ productId / goodsPrice 与后台一致吗？
   └ 单位是「分」
④ iOS 端：微信 ≥ 8.0.68？IAP 开通？小程序简称配了？
```

### 下单直接失败（凭证类）

```
① 41004 appsecret missing？
   └ 代码读的名字与平台注入的名字不一致：代码 appSecret，平台 secret
   └ 也可能是 cloudbaserc 占位符与 .env 键名不一致 → 部署时写成空值
   └ 自检：bash skill/cloudbase-xpay/scripts/check_env_keys.sh
② 41002 appid missing？
   └ appId 读到空值。下单/查单优先用请求头 x-wx-appid，回退 appId 环境变量
   └ 修复：确认前端走 wx.cloud.callHTTPFunction（平台才会注入 x-wx-appid），或补 appId 环境变量
③ 40013 invalid appid？
   └ appid 与 secret 不是一对：secret 用了别的应用 / 被重置过 / 值里带空格
④ 启动日志有「配置校验警告」吗？
   └ 只告警不阻断 → 现象是「部署成功、下单才炸」
⑤ 看「环境变量(名=长度)」了吗？
   └ 某一个名字显示 `-` → 平台没注入这个名字，直接对应到代码读的名字
   └ **全部显示 `-`** → 不是名字问题：你调用的不是集成中心托管的那个函数
     （平台托管函数名形如 `<集成名>-<随机串>`，不是裸的 `xpay-common`）
```

### 签名失败

```
① signData 是否按原样字符串签名？
   └ 检查有无 JSON.parse → stringify
② paySig 的 uri 对吗？
   └ C 端固定 requestVirtualPayment；B 端是接口路径
③ sessionKey 对吗？
   └ code 是否过期（一次性）；是否用了别的用户的 sessionKey
④ AppKey 与 signData.env 对应吗？
   └ 模板仅现网：AppKey 用 appKey（旧名 prodAppKey），env 固定 0
```

### 重复发货

```
① 应答格式与推送格式一致吗？
   └ 不一致会导致重推 15 次
② 幂等存储是内存还是数据库？
   └ 云函数冷启动会丢内存状态
③ 发货逻辑本身幂等吗？
```

## 日志关键信息

正常链路应看到：

```
[Config] 现网(env=0) | 应答格式跟随请求 content-type（默认 JSON）
[Controller] 收到回调: { event: 'xpay_goods_deliver_notify', ... }
[XpayService] 事件 xpay_goods_deliver_notify → 道具发货（核心事件）
```

下单链路：

```
[XpayService] 下单参数已生成: { outTradeNo: 'X...', openid: 'o...', mode: 'short_series_goods' }
```

异常信号：

| 日志 | 含义 |
|---|---|
| `重复事件已忽略` | 幂等生效（正常） |
| `未订阅的事件类型，忽略` | 事件不在 6 类清单内 |
| `配置校验警告` | 环境变量缺失或**名字没对上**（平台注入名 vs 代码读取名） |
| `缺少 sessionKey` | code2Session 失败或 code 无效 |
| `41004 appsecret missing` | `secret` / `appSecret` 读到了空值 |
| `41002 appid missing` | `appId` 读到空值，且请求头也没有 `x-wx-appid` |
| `40013 invalid appid` | appid 与 secret 不是一对 |

## 快速自检脚本

```bash
cd integration/cloudbase-virtualpay/functions/xpay-common
npm test          # 70 个单元测试（签名/官方基准向量/回调/XML/配置映射）

# 部署前：占位符 ↔ .env 键名一致性（名字对不上会静默写成空值）
bash ../../skill/cloudbase-xpay/scripts/check_env_keys.sh

# 运行时：检查必填环境变量是否齐备
# ⚠️ 它读的是当前 shell 的环境变量，不读 .env —— 必须先 source
set -a; source .env; set +a
bash ../../skill/cloudbase-xpay/scripts/validate_env.sh
```

本地启动后手工发一个回调验证：

```bash
curl -X POST http://localhost:3000/xpay/callback \
  -H 'Content-Type: application/json' \
  -d '{"Event":"xpay_goods_deliver_notify","OutTradeNo":"ORDER20261014001","OpenId":"o1"}'
# 期望：{"ErrCode":0,"ErrMsg":"success"}
```

XML 推送验证：

```bash
curl -X POST http://localhost:3000/xpay/callback \
  -H 'Content-Type: application/xml' \
  -d '<xml><Event><![CDATA[xpay_refund_notify]]></Event><OutTradeNo><![CDATA[ORDER2]]></OutTradeNo></xml>'
# 期望：<xml><ErrCode>0</ErrCode><ErrMsg><![CDATA[success]]></ErrMsg></xml>
```

## 拿不到更多信息时

1. 打开云函数日志，确认请求是否到达
2. 在 `handleCallback` 入口打印完整 `body`
3. 检查 MP 后台「虚拟支付 → 订单管理」是否已产生订单
4. 用 `/xpay/query_order` 主动查单确认真实状态
