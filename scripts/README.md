# CloudBase Examples 打包脚本

这个目录包含了自动生成 ZIP 包的脚本，用于将项目中的各个示例打包成独立的 ZIP 文件。

## 文件结构

```
scripts/
├── README.md           # 本说明文档
├── package.json        # 依赖配置
├── config.json         # 打包配置文件
├── build-zips.js       # 主打包脚本
└── test-config.js      # 配置测试脚本
```

## 快速开始

### 1. 安装依赖

```bash
cd scripts
npm install
```

### 2. 测试配置

在打包之前，建议先测试配置文件是否正确：

```bash
npm test
```

这将检查：
- 配置文件是否有效
- 源路径是否存在
- 每个包的基本信息

### 3. 开始打包

```bash
npm run build
```

这将根据 `config.json` 配置，将指定的目录打包成 ZIP 文件，并保存到根目录的 `dist` 文件夹中。

## 配置文件说明

### config.json 结构（简化版）

```json
{
  "paths": [
    "web/cloudbase-react-template",
    "miniprogram/tcb-demo-namecard",
    "cloudrunfunctions",
    "server"
  ],
  "exclude": [
    "node_modules/**",
    ".git/**",
    "dist/**",
    "*.log"
  ]
}
```

### 配置说明

- **paths**: 需要打包的目录路径列表（相对于项目根目录）
- **exclude**: 排除的文件模式（支持 glob 语法）

## ZIP 文件命名规则

ZIP 文件名将根据原始路径自动生成，规则如下：

- 将路径中的 `/` 替换为 `-`
- 添加 `.zip` 后缀

**示例：**
- `web/cloudbase-react-template` → `web-cloudbase-react-template.zip`
- `miniprogram/tcb-demo-namecard` → `miniprogram-tcb-demo-namecard.zip`
- `cloudrunfunctions` → `cloudrunfunctions.zip`

## 输出目录

所有生成的 ZIP 文件将保存到项目根目录的 `dist` 文件夹中：

```
项目根目录/
├── dist/
│   ├── web-cloudbase-react-template.zip
│   ├── miniprogram-tcb-demo-namecard.zip
│   ├── cloudrunfunctions.zip
│   └── ...
├── scripts/
└── ...
```

`dist` 目录已经在 `.gitignore` 中被忽略，不会被提交到 Git 仓库。

## 使用技巧

### 1. 添加新的包

只需要在 `config.json` 的 `paths` 数组中添加新的路径：

```json
{
  "paths": [
    "web/cloudbase-react-template",
    "miniprogram/tcb-demo-namecard",
    "your-new-project/path"
  ]
}
```

### 2. 临时排除某些包

在路径前添加注释或直接删除该行：

```json
{
  "paths": [
    "web/cloudbase-react-template",
    // "miniprogram/tcb-demo-namecard",  // 临时不打包
    "cloudrunfunctions"
  ]
}
```

### 3. 自定义排除规则

在 `exclude` 数组中添加你需要排除的文件模式：

```json
{
  "exclude": [
    "node_modules/**",
    ".git/**",
    "*.log",
    ".env*",
    "coverage/**",
    "自定义排除模式"
  ]
}
```

### 4. 使用根目录快捷脚本

在项目根目录可以直接运行：

```bash
node build-packages.js
```

这会自动安装依赖并开始构建。

## 故障排除

### 常见问题

1. **依赖安装失败**
   ```bash
   # 清除 npm 缓存后重新安装
   npm cache clean --force
   npm install
   ```

2. **路径不存在**
   - 检查 `config.json` 中的路径是否正确
   - 运行 `npm test` 查看详细信息

3. **权限问题**
   ```bash
   # macOS/Linux 下给脚本执行权限
   chmod +x build-zips.js test-config.js
   ```

4. **ZIP 文件损坏**
   - 检查源目录是否有特殊字符
   - 确保有足够的磁盘空间

## 配置示例

### 最小配置

```json
{
  "paths": [
    "web/cloudbase-react-template"
  ]
}
```

### 完整配置

```json
{
  "paths": [
    "web/cloudbase-react-template",
    "miniprogram/tcb-demo-namecard",
    "miniprogram/tcb-demo-blog",
    "miniprogram/tcb-shop",
    "cloudrunfunctions",
    "server",
    "minigame",
    "ios",
    "android",
    "H5",
    "lowcode",
    "cloudbaserun"
  ],
  "exclude": [
    "node_modules/**",
    ".git/**",
    "dist/**",
    "build/**",
    "*.log",
    ".DS_Store",
    "coverage/**",
    ".env*"
  ]
}
```

## 扩展功能

这个脚本系统支持以下扩展：

1. **通配符支持**: `"miniprogram/tcb-*"` 
2. **增量打包**: 只打包修改过的目录
3. **压缩级别配置**: 调整 ZIP 压缩级别
4. **上传到云存储**: 集成 CloudBase 存储 API

如需要这些功能，可以联系开发团队或提交 Issue。 