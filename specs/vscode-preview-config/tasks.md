# 实施计划

## 任务清单

- [x] 1. 扫描现有 web 项目目录
  - 识别所有 web 项目（React、Vue、原生 JS 等）
  - 检查每个项目是否已有 `.vscode/preview.yml` 配置
  - 记录需要添加或更新配置的项目列表
  - _需求: 需求 1, 需求 2

- [x] 2. 创建通用配置模板
  - 创建标准的 `.vscode/preview.yml` 模板文件
  - 支持不同框架的启动命令配置
  - 设置合理的默认端口和配置项
  - _需求: 需求 1, 需求 2

- [x] 3. 为 Vue 项目添加配置
  - 扫描 `web/cloudbase-vue-template/` 目录
  - 添加 Vue 项目专用的预览配置
  - 配置 Vite 开发服务器端口和启动命令
  - _需求: 需求 1

- [x] 4. 为 React 项目添加配置
  - 扫描 `web/cloudbase-react-template/` 目录
  - 添加 React 项目专用的预览配置
  - 配置开发服务器端口和启动命令
  - _需求: 需求 1

- [x] 5. 为其他 web 项目添加配置
  - 扫描 `web/` 目录下的其他项目
  - 为每个项目添加合适的预览配置
  - 根据项目类型调整启动命令和端口
  - _需求: 需求 1

- [x] 6. 验证配置文件格式
  - 检查所有 YAML 文件格式正确性
  - 验证配置项的有效性
  - 确保端口配置不冲突
  - _需求: 需求 1

- [x] 7. 更新项目文档
  - 为每个项目更新 README.md
  - 添加 VS Code 预览功能使用说明
  - 说明配置项的含义和修改方法
  - _需求: 需求 2

- [x] 8. 测试预览功能
  - 选择几个代表性项目进行测试
  - 验证 VS Code 预览功能正常工作
  - 确认自动打开和端口配置正确
  - _需求: 需求 1

## 项目目录结构

```
web/
├── cloudbase-vue-template/
│   └── .vscode/
│       └── preview.yml
├── cloudbase-react-template/
│   └── .vscode/
│       └── preview.yml
├── art-exhibition/
│   └── .vscode/
│       └── preview.yml
├── ecommerce-management-backend/
│   └── .vscode/
│       └── preview.yml
├── gomoku-game/
│   └── .vscode/
│       └── preview.yml
├── overcooked-game/
│   └── .vscode/
│       └── preview.yml
└── simple-crm/
    └── .vscode/
        └── preview.yml
```

## 配置模板示例

### Vue 项目配置
```yaml
autoOpen: true
apps:
  - port: 5173
    run: npm run dev
    root: ./
    name: vue-app
    description: Vue 应用
    autoOpen: true
    autoPreview: true
```

### React 项目配置
```yaml
autoOpen: true
apps:
  - port: 3000
    run: npm start
    root: ./
    name: react-app
    description: React 应用
    autoOpen: true
    autoPreview: true
```
