# 技术方案设计

## 架构概述

为所有 web 项目统一添加 `.vscode/preview.yml` 配置文件，支持 VS Code 的预览功能。

## 技术栈

- **配置文件格式**: YAML
- **目标编辑器**: VS Code
- **适用项目类型**: 所有 web 项目（React、Vue、原生 JS 等）
- **构建工具**: 支持 Vite、Webpack 等主流构建工具

## 技术选型

### 配置模板设计

```yaml
# .vscode/preview.yml
autoOpen: true # 打开工作空间时是否自动开启所有应用的预览
apps:
  - port: 5173 # 应用的端口
    run: npm install @vitejs/plugin-vue && npm run dev # 安装的构建命令和应用的启动命令
    root: ./ # 应用的启动目录
    name: my-first-app # 应用名称
    description: 我的第一个 App。 # 应用描述
    autoOpen: true # 打开工作空间时是否自动开启预览（优先级高于根级 autoOpen）
    autoPreview: true # 是否自动打开预览, 若无则默认为true
```

### 框架适配策略

根据不同前端框架，调整启动命令：

1. **Vue 项目**: `npm run dev` 或 `npm install @vitejs/plugin-vue && npm run dev`
2. **React 项目**: `npm start` 或 `npm run dev`
3. **原生 JS 项目**: `npm run dev` 或 `npx serve .`
4. **其他框架**: 根据 package.json 中的 scripts 配置

## 数据库/接口设计

无需数据库设计，仅涉及文件系统操作。

## 测试策略

1. **配置验证测试**: 验证 YAML 格式正确性
2. **功能测试**: 测试 VS Code 预览功能是否正常工作
3. **兼容性测试**: 测试不同框架项目的兼容性
4. **性能测试**: 验证配置加载不影响项目启动速度

## 安全性

- 配置文件仅包含本地开发相关设置
- 不涉及敏感信息或外部 API 调用
- 遵循最小权限原则

## 实施计划

### 阶段 1: 配置模板创建
- 创建标准的 `.vscode/preview.yml` 模板
- 支持不同框架的启动命令配置

### 阶段 2: 项目扫描和更新
- 扫描所有 web 项目目录
- 为每个项目添加或更新配置文件

### 阶段 3: 验证和测试
- 验证配置文件格式正确性
- 测试 VS Code 预览功能

### 阶段 4: 文档更新
- 更新项目 README 文档
- 添加配置使用说明




