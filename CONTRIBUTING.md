# 贡献指南

感谢您对 Awesome CloudBase Examples 的关注和支持！本文档将指导您如何为这个项目做出贡献。

## 目录结构

项目目录结构如下：

- `android`: 存放 Android 端 Demo / Workshop
- `ios`: 存放 iOS 端 Demo / Workshop
- `minigame`: 存放小游戏端 Demo / Workshop
- `miniprogram`: 存放小程序端 Demo / Workshop
- `server`: 存放服务端 Demo / Workshop
- `web`: 存放 Web 端 Demo / Workshop
- `cloudbaserun`: 存放云托管应用 Demo / Workshop
- `cloudrunfunctions`: 存放函数型托管 Demo
- `lowcode`: 存放微搭低代码应用

## 贡献方式

### 提交新示例

如果您想贡献一个新的示例项目，请按照以下步骤操作：

1. Fork 这个仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-example`)
3. 在相应的目录下添加您的示例项目
4. 确保您的示例项目包含以下内容：
   - 清晰的 README.md 文件，说明项目的用途、功能和使用方法
   - 完整的源代码
   - 必要的配置文件
   - 依赖管理文件（如 package.json, requirements.txt 等）
5. 在项目根目录的 README.md 中添加您的示例项目链接 
6. 提交您的更改 (`git commit -m '添加一个很棒的示例'`)
7. 推送到您的分支 (`git push origin feature/amazing-example`)
8. 创建一个新的 Pull Request

### 改进现有示例

如果您想改进现有的示例项目，可以通过以下方式进行：

1. 开 Issue 讨论您想改进的内容
2. Fork 仓库并创建您的分支
3. 进行必要的修改
4. 提交 Pull Request

## 示例项目规范

### 通用规范

- 示例项目应当简洁明了，专注于展示特定功能或解决方案
- 确保代码可以直接运行，避免复杂的配置或依赖
- 提供清晰的文档，包括安装、配置和使用说明
- 遵循相应平台和语言的最佳实践

### 目录命名

- 小程序和 Web 项目：`tcb-demo-[功能名称]`
- 云函数项目：合理的命名，能够表达功能用途

### README 规范

示例项目的 README.md 应当包含以下内容：

1. 项目名称和简短描述
2. 功能介绍
3. 技术栈说明
4. 目录结构
5. 部署和使用说明
6. 开发指南（可选）
7. 许可证信息

## 代码风格

请确保您的代码符合相应语言和平台的代码规范。建议使用常见的代码格式化工具来保持一致性。

## 联系我们

如果您有任何问题或建议，可以通过以下方式联系我们：

- 提交 Issue

感谢您的贡献！ 