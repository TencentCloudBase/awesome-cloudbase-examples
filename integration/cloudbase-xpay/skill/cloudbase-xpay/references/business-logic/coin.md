# 代币支付

代币是虚拟支付的中介货币：用户先充值代币，再用代币购买道具。

## 两种支付模式

| mode | 值 | signData 字段 |
|---|---|---|
| 道具直购 | `short_series_goods` | 需要 `productId` + `goodsPrice` |
| 代币充值 | `short_series_coin` | 只需 `buyQuantity`（即代币数量） |

```js
const signData = buildSignData({ ..., mode: MODE.COIN });
// 结果中不含 productId / goodsPrice
```

## 接口

| 接口 | 用途 |
|---|---|
| `/xpay/query_user_balance` | 查询代币余额 |
| `/xpay/currency_pay` | 扣减代币（代币支付） |
| `/xpay/cancel_currency_pay` | 代币支付退款 |
| `/xpay/present_currency` | 代币赠送 |

## 调用示例

```js
// 查询余额
await strategy.queryUserBalance({ openid, env: 0 }, sessionKey);

// 扣减代币
await strategy.currencyPay({
    openid,
    outTradeNo: generateOutTradeNo(),
    payCoin: 100,
    env: 0,
}, sessionKey);

// 代币赠送
await strategy.presentCurrency({
    openid,
    outTradeNo: generateOutTradeNo(),
    presentCoin: 50,
    env: 0,
}, sessionKey);
```

## 回调处理

代币扣减成功后平台推送 `xpay_coin_pay_notify`：

1. 幂等校验（平台单号 `wx_order_id`，即 `WeChatPayInfo.MchOrderNo`；缺失时回退 `OutTradeNo`）
2. **更新代币余额**
3. 发放对应道具
4. 应答成功

## 余额一致性建议

不要只依赖本地余额，定期用 `/xpay/query_user_balance` 对账：

```
本地余额 vs 平台余额
  不一致 → 以平台为准，修正本地记录并告警
```

## 注意

- 代币支付与现金支付是**两条独立链路**，回调事件不同（`xpay_coin_pay_notify` vs `xpay_goods_deliver_notify`）
- 代币扣减失败时要保证不发货
- 代币赠送同样需要唯一的 `outTradeNo`
- 参数命名用**下划线**（`pay_coin` / `present_coin`），与 C 端 signData 的驼峰不同
