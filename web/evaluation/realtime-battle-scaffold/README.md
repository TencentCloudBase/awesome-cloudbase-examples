# Realtime Battle Scaffold - Neutral Evaluation Template

> ⚠️ 这是一个**评测用模板项目**，不是完整的应用。

## 用途

作为评测系统使用的前端壳子模板，用于评测 AI agent 将固定页面接入任意后端实时能力的实现质量。

## 项目现状

- ✅ 已有完整的大厅页和房间页壳子
- ✅ 页面路由、交互按钮和 `data-testid` 已固定
- ✅ 所有控件都有稳定的 `data-testid`
- ❌ 所有与后端交互的 TODO 逻辑还没有实现

## 需要 Agent 完成的工作

1. 安装并初始化你选择的后端客户端（在 `src/lib/backend.ts`）
2. 实现房间创建、加入、ready、attack 和状态订阅（在 `src/lib/game-api.ts`）
3. 确保两个独立页面能看到同一个房间状态
4. 确保回合切换、非法攻击拦截和结束态稳定都正确
5. 确保所有联机结果都来自真实后端，不使用 mock 或静态假数据

## 文件结构

```
src/
  lib/
    backend.ts          # TODO: 后端客户端初始化
    game-api.ts         # TODO: 房间与对战动作接口
  pages/
    LobbyPage.tsx       # 大厅页壳子（已完成）
    RoomPage.tsx        # 房间页壳子（已完成）
  types.ts              # 类型定义
  App.tsx               # 路由配置
  main.tsx              # 入口
  index.css             # 样式（已完成，不要修改）
```

## 页面路由

| 路由 | 用途 | 权限 |
|------|------|------|
| `/` | 大厅页 | 公开 |
| `/room/:roomCode` | 对战房间页 | 公开 |

## 重要约束

- **必须**使用 npm 安装依赖，不能使用 CDN
- **不要**修改页面结构和 `data-testid`
- **不要**修改 `index.css` 样式文件
- **不要**修改路由配置
- 所有联机状态必须真实读写到后端

## 本地开发

```bash
npm install
npm run dev
```

如果你只想本地预览完整联机闭环，可以使用内置的开发用 mock：

```bash
npm run dev:mock
```

说明：

- `dev:mock` 只用于本地开发和页面预览
- 评测时不应依赖这个 mock，正式实现仍应接入真实后端
