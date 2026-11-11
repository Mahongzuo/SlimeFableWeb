# 玩法模板

| 模板 | 文件 | 适合 | 规格类型 |
|---|---|---|---|
| explore-quest 探索任务 | `src/templates/explore-quest.ts` + `src/level/explore.ts` | 村落、街区、建筑群；对话、收集、机关 | `LevelSpec`（content/levels/types.ts） |
| runner 跑酷 | `src/templates/runner.ts` + `src/level/runner.ts` | 沿一条路线冲刺：街道、桥、屋脊。路段种类有 hutong / roofs / avenue / bridge / toll / deck / tunnel / arrival | `RunnerSpec` |
| 新模板 | 按设计页新建 `src/templates/<id>.ts` 和 `src/level/<id>.ts`，并在 `src/level/main.ts` 里按 template 分发 | — | 在 `content/levels/types.ts` 里加新的 Spec 类型 |

约定：
- 模板只生成纯数据（布局），不依赖 Three.js，这样测试可以在 Node 里跑；每个模板都要有一个可达性或可解性校验，放在 tests/ 里，并且跑 40 个随机种子。
- 主题套件只负责“数据 → 网格”，碰撞由运行时从网格烘焙（`src/world/bake.ts` 的 `bakeRegion`）。
- 关卡页的运行时：Stage（`src/level/stage.ts`）、史莱姆、LevelUI、Save、`applyLevelQuality`；在 `window.__level.step` 上挂一个逐帧函数，供 QA 驱动画面。
- 新的 `ChapterMeta.template` 值要加到 `content/types.ts` 的 `Template` 和 `templateNames` 里。
