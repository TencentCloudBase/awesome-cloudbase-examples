# CloudBase 函数模板同步 / CloudBase Function Templates Sync

本目录用于把仓库里**云函数类**（`scfFunc`、`scfWeb`）模板的元数据，与某个 CloudBase 环境的「数据模型」做双向同步：每个模板配套一个 JSON，配合脚本将模板信息（含 zip 源码包）发布到云端模板列表。

This directory keeps the metadata of **CloudBase function-type templates** (普通云函数 + HTTP 函数) and syncs them against a CloudBase data model. Each template has a JSON file; scripts package the source folder, upload to CloudBase Storage, then upsert the record in the data model.

---

## 1. 范围 / Scope

| 类型 | `funcTypes` 值 | 是否纳入本脚本 | 说明 |
|---|---|:---:|---|
| 普通云函数 | `scfFunc` | ✅ | 事件型 SCF / 标准 runtime |
| HTTP 函数 | `scfWeb` | ✅ | `CustomRuntime` + `scf_bootstrap` |
| 云托管容器 | `tcbrContainer` | ❌ | 后续如需，单开脚本 |
| 云托管函数 | `tcbrFunc` | ❌ | 同上 |
| 静态托管 | `tcbStatichost` | ❌ | 同上 |

判定规则：**`funcTypes` 数组里只要包含 `scfFunc` 或 `scfWeb`** 就纳入。

---

## 2. 线上存储 / Online storage

| 项 | 值 |
|---|---|
| API | **CloudBase 数据模型 OpenAPI**（`/v1/model/prod/<modelName>/...`） |
| 协议 | HTTPS + JSON |
| 认证 | `Authorization: Bearer <CLOUDBASE_APIKEY>` 直连，**无需换 access_token** |
| 环境 ID | `TEMPLATE_ENV_ID`（默认 `lowcode-5g5llxbq5bc9299e`） |
| 数据模型 ID | `TEMPLATE_MODEL_ID`（默认 `tcb_template_list`） |
| 文件存储 bucket | 当前 CloudBase 环境默认 bucket |
| 文件存储路径前缀 | `cloudbase-examples/<identifier>-<timestamp>.zip` |

**为什么不用文档型 NoSQL 通用 API？** 同一个集合，数据模型 API 视图：

- `zipFilePath` 是公网 URL（NoSQL 视图是 base64 整包 → 单条记录可上百 KB）；
- 时间字段是普通 ms 时间戳（NoSQL 视图是 EJSON `{$numberLong: "..."}`）；
- 字段命名业务化（`guide` / `isHide` / `category`），不含 `_openid` 这类 IM 系统字段。

---

## 3. 主键约定 / Primary keys

线上实测（见 §7.5「线上数据结构洞察」）：**`identifier` 单字段不唯一**。同一模板可同时存在 `lang=zh` 与 `lang=en` 两条记录，`title` / `description` / `sampleCode` 等文案随语言不同。例如 `get-openid` 同时有：

```
identifier=get-openid  lang=zh  title="OPENID 模板"
identifier=get-openid  lang=en  title="OPENID Get"
```

因此**业务主键必须是 `(identifier, lang)` 二元组**。

| 字段 | 用途 |
|---|---|
| `identifier` | 业务标识；本仓库强制等于 `cloudfunctions/<dir>/` 目录名 |
| `lang` | 语言变体；线上历史值：`zh`(60) / `en`(25) / `zh-en`(1)。**本仓库约定**：模板目录同时含 `README_cn.md` + `README_en.md` 时 `lang="zh-en"`（双语合并单文件，文案 zh 为主，英文文案备份到 `_source.i18n.en`，详见 §7.7） |
| `_id` | 服务端内部主键，pull 时记下不入仓；upsert 通过 `(identifier, lang)` 定位 |

**本地文件命名规则**（**文件落在各自模板目录下**）：

| 情形 | 文件路径 |
|---|---|
| 仅一种语言或 `lang=zh` | `cloudfunctions/<identifier>/cloudbase-template.json` |
| `lang=en` | `cloudfunctions/<identifier>/cloudbase-template.en.json` |
| 其它 lang（如 `zh-en`） | `cloudfunctions/<identifier>/cloudbase-template.<lang>.json` |

即「每个模板目录下放 `cloudbase-template[.<lang>].json`」，与模板源码紧密绑定，便于 PR diff、模板独立维护。**配置文件跟随模板**，不再维护额外的全局清单。

**孤儿处理**：若线上 identifier 在本仓库找不到对应目录，`push` 默认 **skip 并打 WARN**（不删除）；可通过 `--orphans-meta-only` 让脚本只同步该模板的元数据（不打包、不上传 zip）。

---

## 4. 文件上传策略 / Source ZIP upload

**线上事实**（见 §7.5）：`zipFilePath` 与 `zipFileStore` 在 55 条 in-scope 记录中**两两互斥**——17 条仅有 `zipFilePath`、38 条仅有 `zipFileStore`、0 条二者并存。说明 CMS 实际上把它们当作**两套上传渠道**而非互补。

我们采用以下策略：

```
  本仓库源码目录                      CloudBase 文件存储                  数据模型记录
  ─────────────                    ─────────────────────              ──────────────────────────
  cloudfunctions/<id>/   ─►        cloud://<env>.<bucket>/             {
     packer → <id>.zip                cloudbase-examples/                  "zipFilePath":  "https://...",
                                        <id>-<timestamp>.zip                ...
                                                                          }
```

| 字段 | 写入策略 | 说明 |
|---|---|---|
| `zipFilePath` | **本脚本主用** | 上传后取**公网 HTTPS URL** 写入 |
| `zipFileStore` | **本脚本不写入** | 这是 CMS 直传渠道留下的 `cloud://` 路径；脚本走 OpenAPI 上传后只拿得到公网 URL |
| `zipFile` | **本脚本绝不写入** | base64 大字段，官方明确不建议；占空间且不可读 |

**版本命名**：`cloudbase-examples/<identifier>-<timestamp>.zip`（timestamp 为 ms epoch，记录到 `_source.uploadedAt`）。同名不会覆盖旧版本，便于回滚。

> 后续如需，可加 `--upload-store-too` 让脚本也调一次 CMS 直传渠道写 `zipFileStore`；当前默认只写 `zipFilePath`。

---

## 5. 配置文件 / Configuration

复用 `cloudfunctions/scripts/.env`（被 `scripts/.gitignore` + 仓库根 `.gitignore` 双重忽略，**不会入仓**）。新增 3 个键：

```bash
# 模板同步专用 / Template-sync specific
TEMPLATE_ENV_ID=lowcode-5g5llxbq5bc9299e    # 模板数据所在环境（与函数测试 ENV_ID 解耦）
TEMPLATE_MODEL_ID=tcb_template_list         # 数据模型标识
CLOUDBASE_APIKEY=eyJ...                     # 环境级长期 API Key（管理员权限，仅服务端）
```

`scripts/.env.example` 已带上述键的注释样板，安全可入仓。

---

## 6. 本地目录结构 / Local layout

```
cloudfunctions/
├── <identifier>/                            ← 每个模板的源码目录
│   ├── cloudbase-template.json              ← 模板元数据（lang=zh）
│   ├── cloudbase-template.en.json           ← 英文版本（lang=en，title/description/sampleCode 已译为英文）
│   ├── README_cn.md / README_en.md          ← 模板说明文档
│   ├── index.js / main.go / ...             ← 源码
│   ├── package.json / go.mod / ...
│   ├── cloudbaserc.json                     ← CloudBase 部署配置
│   ├── build.sh                             ← 仅编译型语言（Java/Go）需要
│   └── scf_bootstrap                        ← scfWeb 启动脚本
└── templates-sync/
    ├── README.md                       ← 本文件（数据模型规范 + 字段约定 + 工作流）
    ├── .cache/                         ← pull 原始快照（已被 .gitignore 忽略）
    ├── .gitignore                      ← 忽略 .cache/
    └── scripts/
        ├── pull.mjs                    ← 拉线上模板快照写入 .cache/（只读）
        ├── pull-save.mjs               ← 拉全量 → 按 (identifier, lang) 写到各模板目录下 cloudbase-template[.<lang>].json
        ├── enrich-templates.mjs        ← 统一 targetPlatform / gitUrl / gitUrlList（双份 zh + en 同步）
        ├── link-online-records.mjs     ← 关联线上裸名记录（scf-helloworld / scf-golang-helloworld / scfWeb → 本地规范目录）
        ├── normalize-titles.mjs        ← 应用 TITLE_MAP，统一 title 命名（去「模板/Template」、框架加后缀、helloworld 加语言前缀）
        ├── init-new-en-files.mjs       ← 为缺 en 副本的新模板生成 en 文件（含 EN_OVERRIDES 字典）
        ├── build-all.mjs               ← 批量驱动编译型模板的 build.sh
        ├── push.mjs                    ← 本地 JSON → 打包 → 上传 → upsert（待实现）
        └── lib/
            ├── cloudbase.mjs           ← 数据模型 OpenAPI 客户端
            ├── normalize.mjs           ← 字段规范化 + identifier→目录映射
            ├── tags.mjs                ← §7.6 tag 派生 + 校验
            ├── storage.mjs             ← 文件存储 OpenAPI 客户端（待实现）
            └── packer.mjs              ← 源码目录 → zip + sha256（待实现）
```

---

## 7. 数据模型字段说明（权威）/ Data model fields (authoritative)

> 来源 / Source：`.iwiki/CloudBaseProductTeam/云开发中心产品组/产品常用工具/云函数、云托管、Agent 模板管理.md`
>
> CMS 管理入口（线上）：<https://lowcode-5g5llxbq5bc9299e-1300677802.tcloudbaseapp.com/cloud-admin/#/management/content-mgr/tcb_template_list>

### 7.1 字段表 / Field reference

| 字段 | 名称 | 取值说明 | 必填 | 备注 |
|---|---|---|:---:|---|
| `identifier` | 标识 | 模板唯一标识，全表唯一 | ✅ | **本仓库强制等于 `cloudfunctions/<dir>/` 目录名** |
| `funcTypes` | 函数类型 | 枚举数组，元素取值：`scfFunc`（云函数）/ `scfWeb`（Web 型云函数 / HTTP 函数）/ `tcbrFunc`（函数型云托管）/ `tcbrContainer`（容器型云托管） | — | 未填写或值不在枚举内 → 归类为云函数模板。**本脚本只处理 `scfFunc` 和 `scfWeb`** |
| `title` | 模板标题 | 模板的展示标题 | ✅ | |
| `titleIcon` | 题图 | 图片地址 | | 用于模板卡片图标 |
| `language` | 编程语言 | 如 `Nodejs` / `Python` / `Go` / `Java` / `Php` | ✅ | |
| `runtimeVersion` | 运行时版本 | 给云函数 / 函数型云托管使用；**scf 模板必须严格用 SCF 入参可识别的值**，如 `Nodejs18.15`、`Nodejs20.19`、`Python3.10`、`Go1`、`Java8`、`Php7.4` 等 | ✅ | scfFunc/scfWeb 都需要 |
| `isCompile` | 是否为编译型 | 布尔值，给云函数使用 | ✅ | Go/Java 通常为 `true`，Node.js/Python/PHP 为 `false` |
| `zipFile` | 代码包 base64 | zip 包的 base64 内容 | — | **不建议使用**，本脚本不写入该字段 |
| `zipFilePath` | zip 地址 | zip 包的存储地址，通常是 COS / 公网 HTTPS URL | — | **本脚本主用**：push 时先传文件存储，把返回的公网 URL 写入此字段 |
| `zipFileStore` | zip 文件存储 | 直接通过 CMS 上传保存的文件 | — | 本脚本同步写入 `cloud://...` 形式的存储路径 |
| `description` | 描述 | 简短描述，用于模板列表页 | | |
| `tags` | 标签组 | 字符串数组，用于前端按 tag 快速检索模板 | ✅* | 数据模型层面无强约束，但**本仓库强制使用 §7.6 受控词表**；scfWeb 必含 `http`，scfFunc 默认省略类型（缺省即云函数）；必含 1 个语言 + 1~3 个业务 tag |
| `sampleCode` | 说明示例 | 详细描述，支持 Markdown，用于模板详情页 | | |
| `imagePath` | 镜像地址 | 给云托管使用 | — | scfFunc/scfWeb 可省略 |
| `containerPort` | 服务端口 | 给云托管使用 | — | scfFunc/scfWeb 可省略；HTTP 函数本身固定监听 9000 |
| `envParams` | 环境变量设置 | JSON 数组，见 §7.3 | | |
| `linkurl` | 跳转链接 | 配置后选择此模板会按链接跳转；支持相对路径（`dev#` 之后部分）或绝对 URL | | 例：`/ai?tab=agent&create-agent=function` |
| `targetPlatform` | 目标平台 | `default`（国内站）/ `intl`（国际站）/ 私有化等取值 | ✅ | 数组，可同时多个；**本仓库约定**：`lang=zh-en` 或 `lang=en` → `["default","intl"]`，`lang=zh` → `["default"]`（详见 §7.7） |
| `gitUrlList` | 仓库链接 | 可访问该模板的 git 仓库列表，每条形如 `{ gitPlatform: { gitType, gitUrl } }`，`gitType` 取值 `github` / `gitee` / `cnb` | ✅ | 多平台镜像；**本仓库约定**：统一 3 路镜像指向 `cloudfunctions/<dir>`（详见 §7.7） |
| `guide` | 使用指引 | 模板的使用引导文字（支持 markdown 链接） | | |

> 文档未列、但**线上事实存在**的字段（如 `_id` / `_openid` / `_mainDep` / `owner` / `createBy` / `updateBy` / `createdAt` / `updatedAt` / `order` / `isHide` / `lang` / `category` / `entryPoint` / `gitUrl` / `scfDemoID`）属于 CMS 系统字段或历史字段，**push 时不传**，由服务端维护；pull 时按需保留。

### 7.2 不同 `funcTypes` 下的字段必填策略 / Required by type

| 字段 | `scfFunc`（云函数） | `scfWeb`（HTTP 函数） |
|---|:---:|:---:|
| `identifier` | ✅ | ✅ |
| `funcTypes` | ✅ | ✅ |
| `lang` | ✅（`zh` / `en`，与 identifier 组成业务主键） | ✅（同左） |
| `title` | ✅ | ✅ |
| `language` | ✅ | ✅ |
| `runtimeVersion` | ✅（如 `Nodejs18.15`） | ✅（如 `Nodejs18.15`） |
| `isCompile` | ✅ | ✅ |
| `zipFilePath` | ✅（上传文件存储后填入公网 URL） | ✅（同左） |
| `description` / `tags` / `sampleCode` | 建议填 | 建议填 |
| `targetPlatform` / `gitUrlList` / `guide` | 建议填 | 建议填 |
| `imagePath` | 通常省略 | **可填**（部分模板既挂 `scfWeb` 又有镜像供云托管复用，例 `openclaw`） |
| `containerPort` | 通常省略 | 可填（HTTP 函数本身固定监听 9000；这里主要给 `tcbrContainer` 复用记录使用） |
| `envParams` | 按需 | 按需 |
| `linkurl` | 按需 | 按需 |

> 注：很多 `scfWeb` 模板的 `funcTypes` 实际是 `["scfWeb", "tcbrContainer"]` 组合（线上 23/55 条），表示一个模板同时支持 HTTP 函数和容器型云托管两种部署形态——`imagePath` 给容器形态用，`zipFilePath` 给函数形态用。本脚本写入时**保留**该组合，不强制拆分。

### 7.3 `envParams` 结构 / Env vars schema

`envParams` 是 JSON 数组，每条形如：

```json
[
  {
    "key":         "ENV_KEY",
    "placeholder": "请输入对应环境变量",
    "value":       null
  },
  {
    "key":         "ENV_KEY_2",
    "placeholder": "",
    "value":       "ENV_VALUE_2"
  }
]
```

控制台对此结构的处理：

1. 用户选模板后，前端按 `placeholder` 引导用户输入；
2. 若用户未填，使用 `value` 默认值；
3. 最终结合"模板内容 + 用户输入"组装成创建函数 / 服务时的环境变量 `key` / `value`。

线上数据里部分记录还有 `visible: true`、`fileld: "字段名"` 等扩展字段（前端展示控制），本脚本透传不解释。

### 7.4 关键约束 / Constraints

- **业务主键是 `(identifier, lang)` 二元组**：同一 `identifier` 可同时存在 `lang=zh` / `lang=en` 两条独立记录（线上 11/44 个 identifier 是此情形）。upsert 时务必同时按这两字段定位。
- `identifier` 在本仓库**额外约束**：等于 `cloudfunctions/<dir>/` 目录名。
- `funcTypes` 未填或不在枚举内 → 服务端归到"云函数"分类，**不建议依赖此默认行为**，请显式声明。
- scf 类模板（`scfFunc` / `scfWeb`）的 `runtimeVersion` **必须**用 SCF 入参可识别的值。常见取值：`Nodejs18.15`、`Nodejs20.19`、`Python3.10`、`Go1`、`Java8`、`Java11`、`Php7.4`、`Php8.0`。**线上目前有不规范取值**（如 `js20`、`Nodejs`、`Python3.9`），脚本以 `--lint` 模式提示但不强制改。
- **zip 三字段实际互斥**：`zipFilePath` 与 `zipFileStore` 线上 0 条并存。本脚本只写 `zipFilePath`（公网 URL）；`zipFileStore` 跳过；`zipFile`（base64）绝不写入。
- 文档未提及"提交-审核-上下架"流程或 `status` 字段。**当前事实**：CMS 直接编辑即发布；`isHide` 用于隐藏不可见。

### 7.5 线上数据结构洞察 / Observations from live data

下面是基于线上 86 条记录（含 in-scope 55 条 = scfFunc/scfWeb 命中）的实测统计，**作为脚本设计依据**。原始数据快照：`.cache/sample-all.json`（已被 `.gitignore` 忽略，不入仓）。

#### A. `funcTypes` 实际分布（全表 86 条）

```
  29  [scfFunc]                       ← 普通云函数
  23  [scfWeb, tcbrContainer]         ← HTTP 函数 + 容器云托管（同模板）
  20  [tcbrContainer]                 ← 仅容器云托管（本脚本不处理）
   8  [tcbStatichost]                 ← 静态托管（本脚本不处理）
   3  [scfWeb]                        ← 仅 HTTP 函数
   3  [tcbrFunc]                      ← 函数型云托管（本脚本不处理）
```

#### B. In-scope（55 条）字段覆盖率

> 完整 36 字段，下表挑重点字段；`present` = 该字段存在的记录数；`nonempty` = 非空非空集的数。

| 字段 | present / 86 | nonempty | 备注 |
|---|---:|---:|---|
| `identifier` / `funcTypes` / `title` / `language` / `runtimeVersion` / `isCompile` / `lang` / `order` / `tags` / `targetPlatform` / `createdAt` / `updatedAt` / `createBy` / `updateBy` / `owner` / `_id` / `_openid` | 86 | 86 | 全表必有 |
| `description` | 84 | 84 | 几乎必填 |
| `sampleCode` | 69 | 67 | 多数填 |
| `entryPoint` | 72 | 66 | scfFunc 多填，scfWeb 少填 |
| `displayPage` | 66 | 8 | **文档遗漏字段**；取值如 `["platform-run"]` |
| `gitUrlList` | 51 | 17 | 数组，元素 `{ gitPlatform: { gitType, gitUrl } }` |
| `imagePath` | 45 | 45 | 含容器形态时填 |
| `containerPort` | 42 | 42 | 同上 |
| `titleIcon` | 43 | 43 | 题图 URL |
| `gitUrl` | 41 | 41 | **文档遗漏字段**；通常 = `gitUrlList[0].gitPlatform.gitUrl` |
| `category` | 36 | 33 | **文档遗漏字段**；取值 `''` (36) / `aiAgent` (15) / `framework` (4) |
| `isHide` | 37 | 37 | 隐藏开关 |
| `_mainDep` | 31 | 31 | CMS 内部依赖标识 |
| `zipFileStore` | 63 | 60 | `cloud://` 路径（CMS 直传） |
| `zipFile` | 30 | 19 | base64，**不建议** |
| `zipFilePath` | 23 | 22 | 公网 HTTPS URL（**本脚本主用**） |
| `scfDemoID` | 15 | 15 | **文档遗漏字段**；形如 `demo-xxxxx` |
| `linkurl` | 14 | 9 | 跳转链接，文档已列 |
| `guide` | 12 | 11 | 使用指引，文档已列 |

#### C. zip 字段互斥性

```
  zipFile 非空     = 19         (base64)
  zipFilePath 非空 = 17         (公网 HTTPS URL)
  zipFileStore 非空= 38         (cloud:// 路径，CMS 直传)
  fp + fs 都有     = 0          ← 关键：从不并存
```

→ 设计上把 `zipFilePath` / `zipFileStore` 看作两条**互斥渠道**：通过 OpenAPI 上传只能拿到公网 URL（写入 `zipFilePath`），因此本脚本统一走这条路。

#### D. `language` / `runtimeVersion` 取值不规范

```
language:        Javascript(11) / javascript(23) / nodejs(3) / Nodejs(2) / Nodejs18.15(2) / Python(9) / Go / Golang / Java / Php / Python3.9
runtimeVersion:  Nodejs18.15(25) / Nodejs20.19(11) / Python3.10(9) / js20(3) / Nodejs(2) / Go1(2) / Java11 / Php8.0 / Python3.9
```

`js20` / `Nodejs` / `Python3.9` 都是不符合 SCF 入参规范的值。脚本以 `--lint` 模式提示，不强制改写。

#### E. `(identifier, lang)` 重复对（11 个 identifier × 2 语言 = 22 条 in-scope，剩余 33 条单语言）

```
  book-analytics-aggregate    [zh, en]
  book-management-model       [zh, en]
  custom-auth                 [zh, en]
  get-openid                  [zh, en]
  openapi-get-phonenumber     [zh, en]
  post-management-collection  [zh, en]
  transaction                 [zh, en]
  user-management-sql         [zh, en]
  wxpay-common                [zh, en]
  wxpay-product               [zh, en]
  （另 1 个）
```

→ 本地文件命名：`<identifier>.json` 给 zh，`<identifier>.en.json` 给 en。

#### F. `envParams` 子字段实际分布（55 条 in-scope，34 条非空）

```
  placeholder  34   (文档已列)
  key          34   (文档已列)
  visible      23   (文档未列；前端展示控制)
  fileld       19   (文档未列；疑似 "field" 拼写错误)
  value         6   (文档已列)
```

→ JSON schema **保留** `visible` / `fileld` 作为可选透传字段，**不要清洗**。

### 7.6 Tag 体系（业务检索维度）/ Tag taxonomy

`tags` 是面向最终用户的**模板检索维度**，前端按 tag 做筛选/关键词匹配。线上 55 条 in-scope 共出现 95 个不同 tag，存在大量噪声（大小写混乱、中英文同义重复、维度不分、长尾自由文本）。本仓库强制收敛为 **5 维受控词表**，**无前缀、纯字符串**，按以下规则填写。

#### 7.6.1 设计原则

1. **无前缀**：tag 是裸字符串数组，如 `["http", "nodejs", "hono", "agent", "agent-platform"]`，前端按取值落到不同筛选维度。
2. **受控词表 + 小写中划线**：所有 tag 用 `kebab-case`（小写 + 中划线），避免 `Nodejs/nodejs/Node.js` 三种写法并存；新增 tag 必须先扩词表（§7.6.3 ~ §7.6.7），不允许自由文本。
3. **5 维必填覆盖**：每条模板 tags 数组至少要覆盖 §7.6.2 中标 ✅ 的维度。
4. **维度无歧义**：5 维词表两两不重叠（例如 `nodejs` 只在「语言」维度出现；「业务」维度用 `wechat-pay` 而不是 `wxpay-sdk`，避免和 `cap:` 撞）。
5. **`lang=zh` 与 `lang=en` 的模板 tag 完全一致**：tag 是英文 kebab-case，与文案语言解耦，便于多语言版本共享筛选体系。

#### 7.6.2 5 维 tag 模型

| # | 维度 | 必填 | 词表 | 数量约束 |
|:-:|---|:-:|---|---|
| 1 | 函数类型 | 视情况 | §7.6.3 | **0~1 个**：`http`（scfWeb 必填）/ `func`（scfFunc 可省略，默认即 func） |
| 2 | 编程语言 | ✅ | §7.6.4 | **恰好 1 个**，必须与 `language` 规范化值一致 |
| 3 | 框架 | 视情况 | §7.6.5 | **0~1 个**；无框架（裸 Node、helloworld 等）则省略，**不要写 `none`** |
| 4 | 业务领域 | ✅ | §7.6.6 | **至少 1 个**，最多 3 个；同时具备多业务时全部列出 |
| 5 | 能力点 | 可选 | §7.6.7 | **0~N 个**；用于细化检索（CRUD、auth、payment 等） |

> 一个 scfFunc Node.js Express 微信支付模板的典型 tags（**省略 `func`**）：
> `["nodejs", "express", "wechat-pay", "wechat-miniprogram", "payment"]`
>
> 一个 scfWeb Node.js Hono Agent 模板：
> `["http", "nodejs", "hono", "agent", "agent-platform"]`

#### 7.6.3 维度 1：函数类型词表

| Tag | 对应 `funcTypes` | 中文展示（前端建议） | 是否必填 |
|---|---|---|---|
| `http` | 含 `scfWeb` | HTTP 函数 | **scfWeb 必填** |
| `func` | 含 `scfFunc` | 云函数 | **可省略**（缺省即视为 `func`） |

> 约定：`func` 是"默认值"，写或不写都可以；前端筛选时若 tags 数组里**没有** `http` 就归到云函数桶。`scfFunc` 占模板大多数（线上 32/55），默认省略可让 tag 数组更短、聚焦在差异化维度（语言/框架/业务）。
>
> `tcbrContainer` / `tcbrFunc` / `tcbStatichost` 不进入本脚本范围，不出现在 tag。

#### 7.6.4 维度 2：编程语言词表

| Tag | 对应 `language` 规范值 | 备注 |
|---|---|---|
| `nodejs` | `Nodejs` | 含 TypeScript 源码（编译后产物仍是 Node.js）也用 `nodejs` |
| `typescript` | — | **附加 tag**：若模板源码是 TS，可在 `nodejs` 之外再加一个 `typescript`（属于维度 2 的扩展） |
| `python` | `Python` | |
| `go` | `Go` | |
| `java` | `Java` | |
| `php` | `Php` | |

#### 7.6.5 维度 3：框架词表（开放扩展）

| 类别 | 词表 |
|---|---|
| Node.js Web 框架 | `express` / `koa` / `hono` / `nestjs` / `fastify` |
| Python Web 框架 | `flask` / `django` / `fastapi` / `tornado` |
| Go Web 框架 | `gin` / `echo` / `fiber` |
| Java Web 框架 | `spring-boot` / `quarkus` |
| Agent 框架 | `langgraph` / `google-adk` / `langchain` / `llamaindex` / `dify` / `n8n` / `openclaw` |
| 微信生态 SDK | `wx-server-sdk` |

> 模板用了某个框架就列其 tag；纯 SDK/裸函数无框架时，**不要写 `none`，直接省略**。

#### 7.6.6 维度 4：业务领域词表

| Tag | 业务含义 | 触发关键词（identifier / title 命中即建议加） |
|---|---|---|
| `helloworld` | 入门空白模板 | identifier 含 `helloworld`、`hello`、`empty`、`blank` |
| `agent` | AI Agent 应用 | identifier/title 含 `agent`、`yuanqi`、`adp`、`ai-` |
| `agent-platform` | Agent 开发平台 | `openclaw` / `n8n` / `dify` / `yuanqi` / `adp` |
| `agent-framework` | Agent 开发框架 | `langgraph` / `google-adk` / `langchain` |
| `wechat-miniprogram` | 微信小程序 | identifier/title 含 `weapp`、`miniprogram`、`mini-program`、`wx-` |
| `wechat-pay` | 微信支付 | identifier 前缀 `wxpay-` |
| `wechat-openapi` | 微信开放接口（云调用） | identifier 含 `openapi-`、`get-phonenumber`、`get-openid`、`custom-auth` |
| `auth` | 用户鉴权 | identifier 含 `auth`、`jwt`、`token`、`login`、`user-management` |
| `database` | 数据库 / CRUD | identifier 含 `book-management`、`post-management`、`user-management`、`crud` |
| `transaction` | 事务 / 金融 | identifier 含 `transaction`、`transfer`、`finance` |
| `data-analytics` | 数据分析 / 聚合 | identifier 含 `analytics`、`aggregate`、`stat` |
| `storage` | 文件存储 | identifier 含 `storage`、`oss`、`cos` |
| `realtime` | 实时通信 | identifier 含 `websocket`、`sse`、`socket` |
| `webhook` | Webhook / 回调 | identifier 含 `webhook`、`callback`、`notify` |
| `web-framework` | 通用 Web 服务（无更具体业务） | 仅当 §7.6.5 框架 tag 已填且没有其它业务标签时兜底使用 |

> 业务 tag 数组允许有 1~3 个；超过 3 个意味着模板职责太杂，应拆模板。

#### 7.6.7 维度 5：能力点词表（可选）

| Tag | 能力含义 |
|---|---|
| `crud` | CRUD 操作 |
| `auth` | 鉴权（亦可同时作为业务 tag，重复无害） |
| `payment` | 支付能力 |
| `database` | 数据库读写 |
| `storage` | 文件存储读写 |
| `websocket` | WebSocket |
| `sse` | Server-Sent Events |
| `cron` | 定时任务 |
| `webhook` | Webhook 接收/分发 |
| `openapi` | 调用 OpenAPI |
| `pagination` | 分页查询 |
| `full-text-search` | 全文搜索 |
| `aggregation` | 聚合查询 |

> 能力点与业务领域可以有交集（如 `wxpay-common` 同时带业务 `wechat-pay` 和能力 `payment`），这是允许的；前端在不同筛选面板里都能命中。

#### 7.6.8 派生算法（pull-save 自动生成）

`pull-save.mjs` 拉到一条记录后按下面顺序派生 `tags`：

1. **函数类型**（0~1 个）
   - `funcTypes` 含 `scfWeb` → 加 `http`
   - `funcTypes` 含 `scfFunc`（且不含 `scfWeb`）→ **省略不加**（默认即云函数）
   - 两者都含时只加 `http`（更显眼的差异化标签）
2. **语言**（必出 1 个，按 `language` 规范化）
   - `Javascript`/`javascript`/`Nodejs`/`nodejs`/`Nodejs18.15` → `nodejs`
   - `Python`/`python`/`Python3.9` → `python`
   - `Go`/`Golang` → `go`
   - `Java` → `java`
   - `Php` → `php`
3. **框架**（0~1 个，按 identifier + dependencies 探测）
   - identifier 含 `hono` → `hono`；`express` → `express`；`koa` → `koa`；`nestjs` → `nestjs`
   - identifier 含 `flask` → `flask`；`django` → `django`；`fastapi` → `fastapi`
   - identifier 含 `gin` → `gin`
   - identifier 前缀 `langgraph` → `langgraph`；`google-adk` → `google-adk`
   - identifier 命中 `openclaw` / `n8n` / `dify` / `yuanqi` / `adp` → 取该 identifier 同名 tag
4. **业务**（按 §7.6.6 触发关键词逐条扫描 identifier 与 title）
5. **能力点**（按 identifier/sampleCode 关键词命中 §7.6.7 词表，谨慎加，宁缺勿滥）
6. **去重**：tag 数组去重，保持插入顺序（type → lang → framework → domain → cap），便于阅读。
7. **回填**：把派生结果**覆盖**到本地 `<identifier>.json` 的 `tags` 字段；线上原始 tags 备份到 `_source.legacyTags`，**push 时不会传 legacyTags**（仅本地参考用）。

#### 7.6.9 校验规则（`--lint` / push 前置校验）

写盘前与 push 前都跑下面 5 条规则：

| # | 规则 | 级别 |
|:-:|---|---|
| 1 | `tags` 非空，且每个元素都是字符串、`kebab-case` 格式（`^[a-z][a-z0-9-]*$`） | ERROR |
| 2 | 维度 1（函数类型）：`scfWeb` 模板**必须**包含 `http`；`scfFunc` 模板**不应**包含 `http`（可选包含 `func`，也可省略） | ERROR |
| 3 | 维度 2（语言）：恰好 1 个值来自 §7.6.4 且与 `language` 规范化值一致（`typescript` 是可选附加） | ERROR |
| 4 | 维度 4（业务）：至少 1 个，最多 3 个；不允许出现词表外字符串 | WARN |
| 5 | 维度 3 / 维度 5（框架 / 能力点）：取值（若有）必须在 §7.6.5 / §7.6.7 词表内 | WARN |

> 违反 1/2/3 → ERROR 阻塞 push；违反 4/5 → WARN（允许通过，但建议补全）。

#### 7.6.10 改造前/后对照

```jsonc
// 改造前（线上现状）
{ "identifier": "openclaw",       "lang": "zh", "tags": ["Agent 开发平台"] }
{ "identifier": "scf-helloworld", "lang": "zh", "tags": ["Nodejs"] }
{ "identifier": "wxpay-common",   "lang": "zh",
  "tags": ["CloudBase","云开发","微信小程序","微信支付","JavaScript","支付接口","订单管理"] }
{ "identifier": "langgraph-py",   "lang": "zh", "tags": ["Agent 开发框架"] }

// 改造后（本仓库标准）—— scfFunc 省略 `func`，scfWeb 必带 `http`
{ "identifier": "openclaw",       "lang": "zh",                 // funcTypes=[scfWeb,tcbrContainer]
  "tags": ["http","nodejs","openclaw","agent","agent-platform"] }
{ "identifier": "scf-helloworld", "lang": "zh",                 // funcTypes=[scfFunc] → 省略 func
  "tags": ["nodejs","helloworld"] }
{ "identifier": "wxpay-common",   "lang": "zh",                 // funcTypes=[scfFunc] → 省略 func
  "tags": ["nodejs","wechat-pay","wechat-miniprogram","payment"] }
{ "identifier": "langgraph-py",   "lang": "zh",                 // funcTypes=[scfWeb,tcbrContainer]
  "tags": ["http","python","langgraph","agent-framework"] }
```

#### 7.6.11 本期范围 / Scope of this iteration

- ✅ **本期落地**：本仓库本地 JSON 在 `pull-save.mjs` 生成时**必须**带 §7.6 规范的 tags（线上原 tags 写入 `_source.legacyTags` 备份）。
- ⏸ **暂不落地**：不修改线上数据。`push.mjs` 默认 `--keep-online-tags`，即 push 时**不写** `tags` 字段，保留线上原状。
- ⏭ **未来开关**：将来需要回写时用 `node scripts/push.mjs --apply-tags --only <id>` 单条灰度，验证无副作用后再切全量。

---

## 8. 单个模板 JSON 结构 / Per-template JSON schema

字段集**对齐 §7 权威字段表**，并按 §7.5 线上事实保留了一些"文档未列、但实际在用"的字段（`displayPage` / `category` / `gitUrl` / `scfDemoID`）—— 这些字段不强制填写，但若线上有值则 pull 时保留，push 时透传，保证不会被脚本"洗白"。

CMS 系统字段（`_id` / `_openid` / `_mainDep` / `owner` / `createBy` / `updateBy` / `createdAt` / `updatedAt` / `updatedAt` / `order` / `isHide` / `entryPoint`）由服务端维护，pull 时**丢弃**，push 时**不传**。

```jsonc
{
  // ===== §7 权威字段 / Authoritative fields =====
  "identifier":     "scf-nodejs-helloworld",   // 业务主键之一，等于 cloudfunctions/<dir>/ 目录名
  "lang":           "zh",                       // 业务主键之二：zh / en / zh-en
  "funcTypes":      ["scfFunc"],                // 本脚本仅写 scfFunc / scfWeb（含组合）
  "title":          "Node.js 空白模板",
  "titleIcon":      "",                         // 题图，图片 URL
  "language":       "Nodejs",                   // 注意：线上大小写不一，本脚本保持原样
  "runtimeVersion": "Nodejs18.15",              // scf 模板必须用 SCF 入参可识别的值
  "isCompile":      false,
  "description":    "Node.js 语言空白 helloworld 模板",
  "tags":           ["nodejs","helloworld"],  // 见 §7.6；scfFunc 省略类型，scfWeb 必含 "http"
  "sampleCode":     "...",                      // 支持 markdown
  "envParams":      [                            // 见 §7.3 + §7.5.F
    // { "key": "OPENAI_API_KEY", "placeholder": "请输入 API Key", "value": null,
    //   "visible": true, "fileld": "API Key"    // visible/fileld 是前端展示字段，透传
    // }
  ],
  "linkurl":        "",                         // 选择该模板后的跳转链接（相对或绝对）
  "targetPlatform": ["default"],                // default(国内) / intl(国际) / 私有化等
  "gitUrlList":     [                            // 多平台镜像
    // { "gitPlatform": { "gitType": "github", "gitUrl": "https://github.com/..." } }
  ],
  "guide":          "",                         // 使用指引（支持 markdown）

  // 给容器形态（funcTypes 含 tcbrContainer）复用的字段；纯 scfFunc/scfWeb 通常省略
  // Used by the container variant when funcTypes also contains tcbrContainer
  "imagePath":      "",
  "containerPort":  9000,

  // ===== §7.5 线上事实保留字段（可选透传）/ Pass-through fields seen live =====
  // 这些字段官方文档未列，但线上存在；缺省时不写入。
  // Optional pass-through fields observed in live data; omit unless present.
  "displayPage":    [],                         // 例 ["platform-run"]
  "category":       "",                         // 例 aiAgent / framework
  "gitUrl":         "",                         // 单 URL 缩写
  "scfDemoID":      "",                         // 例 demo-nscqrv3j

  // ===== 本仓库管理字段（不写回数据模型）/ Local-only metadata =====
  // 由 push 脚本回填 zip 相关字段，请勿手工编辑
  // Filled by push.mjs after upload; do NOT edit by hand
  "_source": {
    "dir":          ".",                        // 同目录（JSON 与源码并列）
    "zipFilePath":  "<由 push 脚本回填>",        // 公网 HTTPS URL → 写入数据模型 zipFilePath
    "zipSha":       "<由 push 脚本回填>",        // sha256(zip)，diff 用
    "uploadedAt":   0,                           // ms epoch
    "legacyTags":   ["Nodejs"],                 // pull 时备份的线上原始 tags（仅本地参考，不会被 push）
    "onlineIdentifier": "scf-nodejs-helloworld", // 线上原 identifier（如与本地目录名不同），push upsert filter 用
    "onlineId":     "abc123..."                 // 线上 _id（push 时精确定位用）
  }
}
```

**字段省略策略**：JSON 中省略的字段，push 时也**不会**发到服务端（`upsert.update` 不带该字段），保留服务端已有值。如需显式清空某字段，请写为 `""` / `[]` / `null`。

---

## 9. 同步语义 / Sync semantics

| 操作 | 来源 | 目标 | 说明 |
|---|---|---|---|
| `pull`      | 线上数据模型 | `.cache/sample-all.json` | 只读拉快照 |
| `pull-save` | 线上数据模型 | 本地各模板目录下 JSON | 首次同步 / 对账；按 `funcTypes ∈ {scfFunc, scfWeb}` 过滤 |
| `enrich-templates` | 本地 | 本地 | 统一 `targetPlatform` / `gitUrl` / `gitUrlList`（双份 zh+en 同步） |
| `link-online-records` | 本地 | 本地 | 把线上裸名记录（scf-helloworld 等）的 onlineIdentifier/onlineId 关联到对应本地目录 |
| `normalize-titles` | 本地 | 本地 | 应用 TITLE_MAP，统一 title 命名 |
| `init-new-en-files` | 本地 | 本地 | 为新增模板补 en 副本（含 EN_OVERRIDES 字典） |
| `build-all` | 本地源码 | 本地产物 | 批量驱动 Java/Go 等编译型模板的 `build.sh` |
| `push`      | 本地 JSON  | 线上    | upsert，按 `(identifier, lang)` 二元主键（待实现）|

**upsert 规则**：

1. 用 `POST /v1/model/prod/<model>/upsert`，filter 条件 = `{ where: { identifier: { $eq: I }, lang: { $eq: L } } }` —— **`identifier` + `lang` 二元组**作为业务主键。
2. 不存在 → create（携带 `identifier` / `lang` / 业务字段）；存在 → update（系统字段由服务端维护，本地未声明的字段保留）。
3. 默认 **绝不删除**。`--prune` 才会把"线上有 + 本地无"的同 `funcTypes` 范围记录删掉，要求 yes 二次确认。
4. zip 上传与 upsert 解耦：`push` 时如果 `_source.zipSha` 与本地实际 sha256 不一致或为空，自动重新打包 + 上传 + 回填 `_source.zipFilePath`；否则跳过上传，仅 upsert 元数据。
5. **`tags` 字段双轨**（见 §7.6.11）：
   - 本地 JSON 的 `tags` 字段**必须**符合 §7.6 受控词表（pull-save 自动派生 + lint 强校验）；线上原始 tags 备份在 `_source.legacyTags`。
   - `push` 默认 `--keep-online-tags`：**不写** `tags` 字段，保留线上原状（与本期"暂不动线上"诉求一致）。
   - `push --apply-tags`：开启回写，把本地规范 tags 推到线上；建议先 `--only <id>` 单条灰度验证。

**`--lint` 模式**（建议作为 CI 钩子）：对每条记录做以下检查：

| 规则 | 级别 |
|---|---|
| `runtimeVersion` 是否在 SCF 入参可识别集合内（`Nodejs18.15`/`Nodejs20.19`/`Python3.10`/`Go1`/`Java8`/`Java11`/`Php7.4`/`Php8.0`） | WARN |
| `language` 大小写是否规范（`Nodejs`/`Python`/`Go`/`Java`/`Php`） | WARN |
| `identifier` 是否能在 `cloudfunctions/<identifier>/` 找到对应目录 | WARN |
| `tags` 是否符合 §7.6 受控词表（5 维校验，见 §7.6.9） | ERROR（type/lang 维度）+ WARN（domain/cap 维度） |

**zip 上传时机**：push 时如果发现 `_source.zipSha` 与本地实际 sha256 不一致，或本地从未上传过，自动重新打包 + 上传 + 回填；否则跳过上传，仅 upsert 元数据。

---

## 10. 命令速查 / CLI cheatsheet

```bash
cd cloudfunctions/templates-sync

# —— 只读探活 / Read-only probes ——
node scripts/pull.mjs                         # 拉前 5 条
node scripts/pull.mjs --count                 # 仅打印总数
node scripts/pull.mjs --full --json           # 全量 JSON 输出（不落盘）
node scripts/pull.mjs --full                  # 全量并写入 .cache/sample-all.json

# —— 首次/对账：把线上拉到本地 ——
node scripts/pull-save.mjs --dry-run          # 列将写哪些 JSON
node scripts/pull-save.mjs                    # 真写（不覆盖已存在）
node scripts/pull-save.mjs --overwrite        # 强制覆盖所有 zh 主文件

# —— 本地字段规范化（按需，幂等可重复跑）——
node scripts/enrich-templates.mjs             # 统一 targetPlatform / gitUrl / gitUrlList
node scripts/link-online-records.mjs          # 关联裸名线上记录 (scf-helloworld 等)
node scripts/normalize-titles.mjs             # 应用 TITLE_MAP
node scripts/init-new-en-files.mjs            # 为新模板生成 en 副本（如缺失）

# —— 编译型模板批量打包 ——
node scripts/build-all.mjs --dry-run
node scripts/build-all.mjs                    # 全部跑 build.sh
node scripts/build-all.mjs --langs go,java    # 只跑特定语言
node scripts/build-all.mjs --only scf-go-helloworld

# —— 主路径：本地推到线上（待实现）——
node scripts/push.mjs --only scf-nodejs-helloworld --dry-run
node scripts/push.mjs --only scf-nodejs-helloworld
node scripts/push.mjs                          # 全量 upsert
node scripts/push.mjs --no-upload              # 只 upsert 元数据，不打包不上传
node scripts/push.mjs --keep-online-tags       # 不写 tags 字段（保留线上原值）
```

---

## 11. 安全 / Security

- `CLOUDBASE_APIKEY` 是**管理员级凭证**，仅在服务端使用；脚本启动时日志中只显示 `eyJhb***...***xxxx` 形式的掩码值。
- `.env` 文件被双重 `.gitignore` 忽略；`.env.example` 仅作样板入仓。
- 本目录的 `.gitignore` 额外忽略 `.cache/`、`*.zip`、`.last-report.json`。
- 任何写操作（push / pull-save 覆盖 / --prune）在 `--dry-run` 之外默认要求 `yes` 二次确认。
- 不在脚本任何日志中打印 zip 原文 / API Key 原值 / 用户 id。

---

## 12. 落地顺序 / Implementation order

### 已完成 ✅

| # | 步骤 | 交付 |
|---|---|---|
| ① | 探活：通过数据模型 API 拉取列表，确认连通性与字段映射 | `pull.mjs` |
| ② | 权威字段说明（§7.1～§7.4，源自 iwiki 文档） | 本 README |
| ③ | 线上数据结构分析（§7.5，`(identifier,lang)` 二元主键 / zip 字段互斥 / envParams 扩展子字段 / 文档遗漏字段） | 本 README |
| ④ | Tag 体系规范（§7.6，5 维受控词表 + 派生算法 + 校验规则） | 本 README + `lib/tags.mjs` |
| ⑤ | 数据模型客户端 | `lib/cloudbase.mjs` |
| ⑥ | 字段规范化 + identifier→目录映射 | `lib/normalize.mjs` |
| ⑦ | 拉线上快照 → 按 `(identifier, lang)` 拆成本地 JSON | `pull-save.mjs` |
| ⑧ | 统一 `targetPlatform` / `gitUrl` / `gitUrlList` | `enrich-templates.mjs` |
| ⑨ | 关联线上裸名记录（`scf-helloworld` / `scf-golang-helloworld` / `scfWeb` 等） | `link-online-records.mjs` |
| ⑩ | Title 命名规范化（TITLE_MAP：去「模板/Template」、框架加后缀、helloworld 加语言前缀） | `normalize-titles.mjs` |
| ⑪ | 为新增模板生成 en 副本（EN_OVERRIDES 字典） | `init-new-en-files.mjs` |
| ⑫ | 编译型模板（Java/Go）本地打包 | 各模板 `build.sh` + `build-all.mjs` |
| ⑬ | 主仓 `cloudfunctions/README.md` 加入口 | `../README.md` |
| ⑭ | 文件存储客户端：通过 `tcb storage upload` CLI 上传 zip | `lib/storage.mjs` |
| ⑮ | 打包工具：源码目录 → zip + sha256（编译型先跑 build.sh）| `lib/packer.mjs` |
| ⑯ | 推送编排器：本地 JSON → upsert 线上；默认仅元数据，`--upload` 触发打包+上传 | `push.mjs` |

### 全部完成 🎉

| 步骤 | 说明 |
|---|---|
| ⑰ | 验证：推 `scf-helloworld` / `gin` / `wxpay-common` 到线上，title/tags/gitUrl/targetPlatform 全量更新成功 | ✅ 端到端验证通过 |

> **注意**：`push.mjs` 默认仅同步元数据（不上传 zip），因为线上 zip 存储在 `tcb.cloud.tencent.com` CDN，当前环境无存储写入权限。如需上传 zip，加 `--upload` 并确保 tcb CLI 已登录且有存储写入权限。


---

## 13. 相关链接 / References

- 数据模型字段官方说明（本仓库镜像）：[`.iwiki/CloudBaseProductTeam/云开发中心产品组/产品常用工具/云函数、云托管、Agent 模板管理.md`](../../.iwiki/CloudBaseProductTeam/云开发中心产品组/产品常用工具/云函数、云托管、Agent%20模板管理.md)
- 线上模板 CMS 管理入口：<https://lowcode-5g5llxbq5bc9299e-1300677802.tcloudbaseapp.com/cloud-admin/#/management/content-mgr/tcb_template_list>
- 数据模型 OpenAPI 概览：<https://docs.cloudbase.net/http-api/model/%E6%95%B0%E6%8D%AE%E6%A8%A1%E5%9E%8B-openapi>
- 数据模型 OpenAPI YAML：<https://docs.cloudbase.net/openapi/datasource.v1.openapi.yaml>
- API Key 管理：<https://tcb.cloud.tencent.com/dev#/env/apikey>
- 文档型数据库 HTTP API（备用，不本地使用）：<https://docs.cloudbase.net/http-api/nosql/nosql-restful-api>
- 本仓库函数测试脚本 `.env` 总样板：[`../scripts/.env.example`](../scripts/.env.example)
- 本仓库函数测试方案：[`../scripts/TEST_PLAN.md`](../scripts/TEST_PLAN.md)
