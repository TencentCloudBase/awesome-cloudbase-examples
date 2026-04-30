# 部署为 HTTP 云函数

> 本文档是 [`../模板接入/quick-start.md`](../模板接入/quick-start.md) Step 4 的**详细补充**。
>
> **阅读顺序**：先走完 quick-start.md 的 Step 4.0~4.5（含 cloudbaserc.json 配置、HTTP 访问服务、环境变量同步），再回到本文查看 Gateway 模式特殊配置、进阶排查、脚本工具。

---

## 适用场景

- **首次接入**、快速原型验证
- **低频调用**场景（按调用量计费，更经济）
- SDK 模式（自行验签解密）或 Gateway 模式（集成中心代签）

---

## 前提条件

| 条件 | 说明 |
|------|------|
| Node.js 16+ 环境 | pay-common 运行时要求 |
| CloudBase CLI | `npm install -g @cloudbase/cli` |
| CloudBase 环境 | 已开通，记录 envId |
| .env 配置完成 | 参照 [env-config.md](../模板接入/env-config.md) |

---

## 快速部署流程（引用）

> ⭐ **完整的部署步骤（含每步的命令和截图指引）请阅读 `quick-start.md` Step 4.0 ~ 4.5**：
>
> | 步骤 | 内容 | 在 quick-start.md 中 |
> |------|------|---------------------|
> | 4.0 | 双通道架构理解 | 一张图搞懂小程序为什么要两个域名 |
> | 4.1 | **cloudbaserc.json 完整配置** | 含 `type:"HTTP"` 关键字段、全部 envVariables 示例、字段说明表 |
> | 4.2 | **HTTP 访问服务 + 路由配置** | 控制台 5 步操作 / `tcb routes add` CLI 命令 / enableAuth:false |
> | 4.3 | **回调 URL 组装** | 公式 + 真实范例 + curl 验证命令 |
> | 4.4 | **环境变量同步到线上** | 控制台 5 步路径 + .env 到界面映射表 + 验证方法 |
> | 4.5 | 回调处理注意事项 | 5 秒超时规则、签名探测、7 项检查清单 |

以下内容为 **quick-start 未覆盖的补充**：

---

## 进阶：部署命令详解

### 登录与验证

```bash
# 登录 CloudBase
tcb login
# 浏览器自动打开完成扫码授权

# 验证登录状态（已登录会显示当前用户信息）
tcb login
```

### 部署命令

```bash
# 部署到云端（基于 cloudbaserc.json 配置）
tcb fn deploy pay-common

# 查看已部署的云函数列表（确认 type=HTTP）
tcb fn list
```

预期输出：
```
✓ 部署成功: pay-common (version: 20260429173000)
```

> ⚠️ 如果 `tcb fn list` 显示 type 不是 HTTP → 检查 cloudbaserc.json 是否包含 `"type": "HTTP"`（见 quick-start Step 4.1）

### 验证部署成功

```bash
# 方式一：通过云 API 网关测试（需 Bearer Token）
curl -L 'https://<ENV_ID>.api.tcloudbasegateway.com/v1/functions/pay-common?webfn=true' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -d '{"_action":"wxpay_order","description":"test","amount":{"total":1,"currency":"CNY"},"payer":{"openid":"oUpF8xxx"}}'

# 方式二：通过 HTTP 访问服务测试（无需 Token，需先完成 quick-start Step 4.2）
curl -X POST https://your-http-domain/wx-pay/wxpay_order \
  -H "Content-Type: application/json" \
  -d '{"description":"test","amount":{"total":1,"currency":"CNY"},"payer":{"openid":"oUpF8xxx"}}'
```

成功返回 `{ "code": 0, "msg": "success", ... }` 即表示部署成功。

---

## Gateway 模式特殊配置

若使用 Gateway 模式（`signMode=gateway`），还需要：

### 5.1 开通并配置集成中心

1. CloudBase 控制台 → **集成中心**
2. 开通**微信支付集成**（如未开通）
3. 记录集成中心域名，格式为：
   ```
   https://integration-<envId>.tcloudbase.com
   ```

### 5.2 配置商户平台回调地址

在 [微信商户平台](https://pay.weixin.qq.com/)：

| 回调类型 | 配置路径 | 填写地址 |
|---------|---------|---------|
| 支付回调 | 产品中心 → 开发配置 → 支付设置 | `https://integration-xxx.tcloudbase.com/wechatpay/order` |
| 退款回调 | 同上 | `https://integration-xxx.tcloudbase.com/wechatpay/refund` |
| 转账回调 | 产品中心 → 商家转账 → 开发配置 | `https://integration-xxx.tcloudbase.com/wechatpay/transfer` |

### 5.3 回调路由鉴权豁免

> **SDK 模式必须操作此步！** Gateway 模式下回调走集成中心，无需此步。
>
> ⭐ **完整操作步骤见 `quick-start.md` Step 4.2**（控制台 + CLI 两种方式，含 `enableAuth: false` 配置）。
>
> 核心要点：创建 HTTP 访问服务路由时将 **身份认证设为关闭**（`enableAuth: false`），否则微信回调被 401 拦截。

---

## 环境变量检查清单

部署前运行校验脚本：

```bash
bash scripts/validate_env.sh /path/to/.env
```

或使用一致性检查脚本（对比 cloudbaserc.json 与 .env）：

```bash
python3 scripts/check_deploy_config.py /path/to/project
```

---

## 常见问题

| # | 问题 | 原因 | 解决方案 |
|---|------|------|---------|
| 1 | `tcb fn deploy` 报错"未登录" | Token 过期 | 重新执行 `tcb login` |
| 2 | 部署成功但 HTTP 访问 404 | 未开启 HTTP 访问服务 / 路由 Path 错误 | 按 `quick-start.md` Step 4.2 操作；用 `tcb routes list -e envId` 确认路由存在 |
| 3 | 访问返回 401/403 | 回调路由身份认证未关闭 | 按 `quick-start.md` Step 4.2 设置 `enableAuth: false` |
| 4 | 访问返回 502 | 冷启动超时 / 环境变量缺失 | 等待几秒重试；运行 `validate_env.sh` 检查环境变量；确认控制台已同步（Step 4.4） |
| 5 | 签名失败 | 环境变量未生效（.env 改了但没同步到线上） | 按 `quick-start.md` Step 4.4 同步环境变量到控制台 |
| 6 | 回调收不到 | 回调 URL 配错 / APIv3 密钥未设置 / IP 白名单未放行 | 检查 `quick-start.md` Step 4.3 URL 格式 + Step 2 APIv3 密钥 + Step 4.5 检查清单 #6 |

---

## 目录结构参考

```
pay-common/                          # 项目根目录
├── index.js                         # SCF 入口（main_handler）
├── app.js                           # Express 应用
├── package.json                     # 依赖声明
├── cloudbaserc.json                 # ☝️ CloudBase 部署配置（完整示例见 quick-start Step 4.1）
├── .env                             # 环境变量（不入 git）
├── .env.example                     # 环境变量模板
├── config/
│   └── config.js                    # 配置加载与校验
├── routes/
│   └── pay.js                       # 路由定义
├── services/
│   ├── payService.js                # 支付业务逻辑
│   ├── strategies/
│   │   └── sdkStrategy.js           # SDK 签名策略
│   └── orderService.js              # 订单业务钩子（待实现）
├── utils/
│   ├── validator.js                 # 参数校验
│   └── cloudbaseAuth.js             # CloudBase 鉴权
├── scripts/                         # 诊断脚本
├── example/                        # 前端 Demo
└── scf_bootstrap                    # SCF 启动文件（可选）
```

---

*其他部署方式见 [deploy-cloud-run.md](deploy-cloud-run.md) 和 [deploy-local.md](deploy-local.md)*
*环境变量完整说明见 [env-config.md](../模板接入/env-config.md)，同步操作见 `quick-start.md` Step 4.4*
*cloudbaserc.json 完整配置 + HTTP 访问服务 + 回调 URL 组装 → 统一见 `quick-start.md` Step 4.1~4.3*
