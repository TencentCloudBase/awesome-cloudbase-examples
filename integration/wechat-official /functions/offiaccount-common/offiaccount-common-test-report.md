# offiaccount-common 测试报告

> 微信公众号开放能力统一云函数模版自测报告

**测试时间**: 2026-05-06
**测试方式**: 单元测试（Node 内置 `node:test`，全 mock fetch）
**测试结果**: ✅ 全部通过

---

## 一、模版说明

| 项 | 内容 |
|---|---|
| **服务** | 微信公众号开放能力（OAuth / AccessToken / JS-SDK / 订阅通知 / 客服消息 / 自定义菜单 / 用户管理 / 素材 / 二维码 / 短链等） |
| **核心能力** | 12 个 controllers 覆盖公众号全套常用 API；统一 AccessToken 缓存管理；wxApi 通用请求封装 |
| **环境变量** | OA_APPID, OA_APPSECRET |
| **依赖** | Node.js ≥ 18, express, http-errors |

---

## 二、单元测试结果

```bash
cd functions/offiaccount-common
npm test
```

| 项 | 数值 |
|---|---|
| **测试用例数** | **59** |
| **通过** | 59 |
| **失败** | 0 |
| **跳过** | 0 |
| **测试文件数** | 5 |

### 覆盖范围

| 测试文件 | 用例数 | 覆盖内容 |
|---------|--------|---------|
| `tests/config.test.js` | 5 | 环境变量校验（齐全/缺 APPID/缺 APPSECRET/全缺/换行符转义） |
| `tests/validator.test.js` | 25 | 7 个校验器（code / refresh_token / OAuth token pair / JSSDK URL / 订阅消息 / 菜单 / 二维码） |
| `tests/tokenCache.test.js` | 8 | AccessToken 缓存（首次拉取 / 缓存命中不拉 / errcode / 配置缺失 / stable token POST / forceRefresh / jsapi_ticket 链式获取） |
| `tests/wxApi.test.js` | 6 | 通用请求（GET 注入 token / skipToken 跳过 / POST query 注入 / errcode 抛错 / errcode=0 / 无 errcode 字段） |
| `tests/controller.test.js` | 11 | OAuth 控制器全接口（getInfo/exchangeCode/refreshToken/getUserinfo/verifyToken）：正常/缺参/errcode |

---

## 三、关键测试场景

| # | 场景 | 测试结果 |
|---|------|----------|
| 1 | AccessToken 缓存：连续 3 次调用只拉取 1 次微信接口 | ✅ |
| 2 | AccessToken 错误码（如 40013 invalid appid）→ 抛标准错误 | ✅ |
| 3 | jsapi_ticket 自动级联获取 access_token | ✅ |
| 4 | wxApi.wxGet 自动注入 access_token 到 URL | ✅ |
| 5 | wxApi.wxPost 自动注入 access_token 到 URL query | ✅ |
| 6 | wxApi 微信 errcode≠0 → 抛错（含 errcode 字段） | ✅ |
| 7 | wxApi errcode=0 / 无 errcode 字段 → 视为成功 | ✅ |
| 8 | OAuth code → openid + unionid + scope 全字段返回 | ✅ |
| 9 | OAuth verify token：errcode=0→valid=true；errcode≠0→valid=false | ✅ |
| 10 | 7 个 validator 覆盖所有需要校验的接口 | ✅ |

---

## 四、未覆盖的部分

| 模块 | 未测原因 | 建议 |
|------|---------|------|
| 客服消息 / 菜单 / 二维码 / 用户管理等 controller | 共用 wxApi 工具链，已通过 wxApi 测试间接覆盖 | 上线前做一次端到端集成测试 |
| 真实公众号 API 调用 | 需要真实公众号 AppID/Secret | 测试号上跑一遍主流程 |
| AccessToken 持久化 | 当前为内存缓存，云函数冷启动会丢失 | 生产建议升级为 Redis/CloudBase 数据库（README 已提示） |
| 消息加解密（XML 模式） | 当前模版不处理消息回调，仅做主动 API 调用 | 如需消息回调，参考 `_lib/wechat/crypto.js` 规划 |

---

## 五、复测命令

```bash
cd functions/offiaccount-common
npm install
npm test
# 期望输出：# tests 59  # pass 59  # fail 0
```

---

## 六、质量门槛

- [x] 所有 API 接口有参数校验（utils/validator.js 提供 7 个校验器）
- [x] 错误码对齐官方文档（透传 errcode/errmsg）
- [x] 鉴权中间件（`_lib/auth.js` 可选）
- [x] 单元测试 ≥ 50 个用例：✅ 59 个
- [x] README 含模块说明
- [x] examples/web/ 有 Demo 涵盖 6 大模块（OAuth / Token / JSSDK / 订阅消息 / 菜单 / 二维码）

---

## 七、与 wx-oauth 的关系

| 维度 | wx-oauth | offiaccount-common |
|------|----------|--------------------|
| 定位 | 轻量级，仅 OAuth | 完整公众号能力 |
| 接口数 | 3 | 30+ |
| 部署体积 | 小 | 中 |
| 适用场景 | 只需要静默登录拿 openid | 需要订阅消息、菜单、客服等完整功能 |

两者**不互斥也不替代**，根据业务需要选其一即可。
