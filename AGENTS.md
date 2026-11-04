# SlimeFable Web — Agent 规则（Grok / Codex / Claude 通用）

先读本文件再动手。用中文和用户沟通，代码标识符用英文。

## 分工
- **Opus（调度 + 审查）**：引擎、模板首版、选事件写任务卡、审 diff。
- **Grok 4.7（Cursor `agent -p`）**：逻辑——关卡数据、模板参数、任务与机关、测试。
- **Codex（GPT-6 Astra low，`codex exec`）**：场景——程序化街区 / 道具 / 地形生成器、OBJ / glTF 导出。
- **用户**：试玩，确认画面与手感（视觉验收只归用户）。

## 硬规则
1. 只改任务卡「可改文件」里列出的文件；需要改别处就停下，写明原因。
2. 不改 `src/slime/`（角色、求解器、碰撞）和 `src/game/game.ts`，除非任务卡明确授权。
3. 历史事实只用任务卡给的内容和来源，不自行新增或改写。严肃事件只用不战斗的模板。
4. 交付前必须通过：`npm run check`、`npm test`、`npm run build`。
5. 不提交 `node_modules/`、`dist/`、`qa/shots/`、任何密钥。

## 目录
- `content/days/MMDD.ts` 每日章节数据（Agent 主工作区）
- `src/home/` 晴雨港 Home 关：时光门、史书台、碎片、水面效果、碰撞烘焙
- `src/ui/` 游戏 UI；`src/game/` 状态机、日历、存档、每日匹配
- `src/slime/` 史莱姆角色模块（PBF 软体、渲染、高度场碰撞）
