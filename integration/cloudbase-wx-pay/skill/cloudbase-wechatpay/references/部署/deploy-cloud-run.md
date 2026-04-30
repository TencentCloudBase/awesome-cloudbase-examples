# 部署为云托管（Cloud Run）

> 基于 `pay-common/README.md` Step 4 方式二 + Dockerfile + cloudrun Demo README 整理。

---

## 适用场景

- **生产环境**高并发服务
- 已有 **Docker 化**项目
- 需要**常驻容器**避免冷启动
- 搭配 **SDK 模式**使用（完全自主控制）

---

## 前提条件

| 条件 | 说明 |
|------|------|
| Docker 环境 | 用于本地构建镜像 |
| CloudBase CLI | `npm install -g @cloudbase/cli` |
| .env 配置完成 | 参照 [env-config.md](../模板接入/env-config.md) |

---

## 部署步骤

### Step 1：准备 Dockerfile

项目根目录应包含 `Dockerfile`：

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

> pay-common 默认端口为 `3000`。如需修改，同步更改 `EXPOSE` 和启动命令。

### Step 2：登录并初始化

```bash
# 登录 CloudBase
tcb login

# 初始化云托管（首次需要）
tcb run init
```

### Step 3：构建并部署

```bash
# 方式一：直接从源码部署（推荐）
tcb cloudrun deploy pay-common --path .

# 方式二：先构建镜像再部署
docker build -t pay-common:latest .
tcb cloudrun deploy pay-common --image pay-common:latest
```

预期输出：
```
✓ 构建中...
✓ 部署中...
✓ 服务已启动: https://<env-id>-<uin>.ap-shanghai.app.tcloudbase.com
```

### Step 4：配置环境变量

> 云托管的环境变量通过控制台配置，不支持 cloudbaserc.json 的 envVariables 字段。

1. 进入 CloudBase 控制台 → **云托管** → **服务管理**
2. 找到 `pay-common` 服务 → 点击进入
3. **版本管理** → **环境变量**
4. 将 `.env` 中的所有变量逐条添加
5. 创建**新版本**使环境变量生效（修改环境变量后必须重新发布版本）

### Step 5：获取访问域名

部署成功后，控制台会显示云托管访问地址：

```
https://<env-id>-<uin>.<region>.app.tcloudbase.com
```

完整的 API 地址为：
```
https://<env-id>-<uin>.ap-shanghai.app.tcloudbase.com/cloudrun/v1/pay/<action>
```

### Step 6：验证部署

```bash
curl -X POST \
  "https://<domain>/cloudrun/v1/pay/wxpay_order" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "测试商品",
    "out_trade_no": "'$(date +%Y%m%d%H%M%S)'",
    "amount": {"total": 1, "currency": "CNY"},
    "payer": {"openid": "oUpF8uMuAJO_M2pxb1Q9zNjWeS6o"}
  }'
```

---

## 云托管 vs 云函数的关键差异

| 维度 | 云函数 | 云托管 |
|------|:------:|:------:|
| **入口文件** | `index.js` + `scf_bootstrap` | `Dockerfile` + `npm start` |
| **环境变量位置** | cloudbaserc.json 或控制台 | 仅控制台（版本级别） |
| **回调域名** | 需手动开启 HTTP 访问服务 | **自动有**公网域名 |
| **日志查看** | 控制台→云函数→日志 | 控制台→云托管→日志 |
| **扩缩容** | 自动（按请求量） | 手动/自动（按配置规则） |
| **计费** | 按 GB·ms（调用量×执行时间） | 按 CPU/内存×时长 |
| **冷启动** | 有（1-3s） | 无（常驻容器） |
| **适合 signMode** | Gateway（更省心） | **SDK（更灵活）** |

---

## SDK 模式的额外配置

云托管搭配 SDK 模式是最灵活的组合：

### 回调 URL 配置

```env
# .env 中三个回调指向云托管自己的域名
notifyURLPayURL=https://<env-id>-<uin>.ap-shanghai.app.tcloudbase.com/cloudrun/v1/pay/unifiedOrderTrigger
notifyURLRefundsURL=https://<env-id>-<uin>.ap-shanghai.app.tcloudbase.com/cloudrun/v1/pay/refundTrigger
transferNotifyUrl=https://<env-id>-<uin>.ap-shanghai.app.tcloudbase.com/cloudrun/v1/pay/transferTrigger
```

### 商户平台回调地址

将上述三个 URL 分别配置到商户平台：
- **产品中心** → **开发配置** → **支付设置** → 支付/退款回调
- **产品中心** → **商家转账** → **开发配置** → 转账回调

### IP 白名单放行

确保云托管的**安全组**放行了微信回调 IP 段（参见 [sign-mode.md](../模板接入/sign-mode.md) §IP 白名单）。

---

## 扩缩容配置建议

| 场景 | 建议 | 控制台位置 |
|------|------|-----------|
| 开发测试 | 最小实例 = 0（按需启动） | 云托管→服务→基本信息 |
| 生产环境 | 最小实例 ≥ 1（保证可用性） | 同上 |
| 大促期间 | 提前增加最大实例数 + 配置 HPA | 云托管→扩缩容 |

---

## 常见问题

| # | 问题 | 原因 | 解决方案 |
|---|------|------|---------|
| 1 | 构建失败 | Dockerfile 语法错误 / 依赖安装超时 | 查看构建日志；检查 package.lock 是否存在 |
| 2 | 启动后健康检查失败 | 端口不匹配 / 启动超时 | 确认 EXPOSE 端口与 app.listen 一致 |
| 3 | 环境变量不生效 | 修改了变量但未创建新版本 | 修改后必须重新发布版本 |
| 4 | 访问 502 | 容器未就绪 / OOM | 查看容器日志；增加内存配置（建议 ≥ 256MB） |
| 5 | 回调 401 | 回调路由误开鉴权 | 确保 trigger 路由在鉴权白名单中 |

---

*其他部署方式见 [deploy-cloud-function.md](deploy-cloud-function.md) 和 [deploy-local.md](deploy-local.md)*
*前端集成见 [miniprogram-cloud-api.md](../前端集成/miniprogram-cloud-api.md)*
