---
agent: codex
model: gpt-6-astra
effort: high
files: src/level/hover.ts, src/level/explore.ts, src/themes/normandy.ts, src/themes/index.ts, content/levels/1113-1907.ts, content/levels/types.ts, content/levels/registry.ts, content/days/1113.ts, content/registry.ts, tests/hover.test.ts
checks: check,test
---
# 1113 · 1907 科尔尼直升机：探索 + 悬停收尾小游戏

先读 `.agents/skills/slimefable-level/SKILL.md` 以及它的 references，再读设计页 `docs/days/1113.md`（这张卡要实现的章节是 1113-1907）。动手前先看这些现成的例子：
- `src/level/runner.ts`：一个完整的关卡运行时（Stage、史莱姆、LevelUI、Save、applyLevelQuality、`window.__level.step`、高光的写法）。
- `src/templates/runner.ts`：纯数据模板 + 可达性校验。
- `src/themes/sf1936.ts`：画面细节密度的标准。

接入方式：在 `content/levels/types.ts` 加新的 Spec 类型并加入 `AnyLevel`；在 `src/level/main.ts` 里按 template 分发到新的运行时；在 `content/levels/registry.ts` 注册关卡；把 `content/days/1113.ts` 里对应章节的 status 改成 'web'。如果模板是新的，还要在 `content/types.ts` 的 Template 里加上。
复玩记录写进 `save.data.life.records['<关卡id>-<挑战名>']`，纪念品用 `save.add('souvenirs', id)`，通关用 `save.add('completed', id)`。

验收：`npm run check`、`npm test`、`node .agents/skills/slimefable-level/scripts/lint-content.mjs` 全部通过；交付总结按 SKILL.md 第 5 步写，包括自评表打分和建议机位。

要点：
- 新建 `content/days/1113.ts`（只有这一个章节，status 'web'），并在 `content/registry.ts` 注册。事实只用设计页的事实卡。
- LevelSpec 加可选字段 `finale?: {type: 'hover'; seconds: number; targetCm: [number, number]}`；explore 运行时在主线完成后进入 finale，而不是直接结束。
- `src/level/hover.ts`：可复用的悬停小游戏，包括转速、升力、阵风、配重、高度表 UI、倒计时环、成功和失败的反馈。纯逻辑部分要有测试。
- `normandy-1907` 主题：照 `src/themes/lingnan.ts` 的做法扩展 plainKit，做出双旋翼机的造型（两个大辐条轮 + 发动机 + 皮带）、石砌谷仓、苹果园、木框架农舍、海报。

不许做：改其他文件（确实需要时，停下来在总结里说明原因）；加贴图、字体、音频文件或新依赖；出现日文；画领导人肖像。
