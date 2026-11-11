---
agent: codex
model: gpt-6-astra
effort: high
files: src/templates/ascent.ts, src/level/ascent.ts, src/themes/saturn-v.ts, src/themes/space.ts, content/levels/1114-1969.ts, content/levels/types.ts, content/levels/registry.ts, content/types.ts, src/level/main.ts, content/days/1114.ts, content/registry.ts, tests/ascent.test.ts
checks: check,test
---
# 竖向攀爬模板 ascent + 1114 · 1969 阿波罗 12 号雷击

先读 `.agents/skills/slimefable-level/SKILL.md` 以及它的 references，再读设计页 `docs/days/1114.md`（这张卡要实现的章节是 1114-1969）。动手前先看这些现成的例子：
- `src/level/runner.ts`：一个完整的关卡运行时（Stage、史莱姆、LevelUI、Save、applyLevelQuality、`window.__level.step`、高光的写法）。
- `src/templates/runner.ts`：纯数据模板 + 可达性校验。
- `src/themes/sf1936.ts`：画面细节密度的标准。

接入方式：在 `content/levels/types.ts` 加新的 Spec 类型并加入 `AnyLevel`；在 `src/level/main.ts` 里按 template 分发到新的运行时；在 `content/levels/registry.ts` 注册关卡；把 `content/days/1114.ts` 里对应章节的 status 改成 'web'。如果模板是新的，还要在 `content/types.ts` 的 Template 里加上。
复玩记录写进 `save.data.life.records['<关卡id>-<挑战名>']`，纪念品用 `save.add('souvenirs', id)`，通关用 `save.add('completed', id)`。

验收：`npm run check`、`npm test`、`node .agents/skills/slimefable-level/scripts/lint-content.mjs` 全部通过；交付总结按 SKILL.md 第 5 步写，包括自评表打分和建议机位。

要点：
- 新建 `content/days/1114.ts`（只有这一个章节，status 'web'）并注册。
- ascent 模板：竖井分 4 段，平台、管道、贴墙面、断线缺口都是数据；两次雷击按进度触发；级间分离时脱落的舱段远离；SCE 开关是高光交互。测试要证明每一段都能用“跳跃 + 贴墙”到达顶部。
- 火箭上升感：窗外云层下掠、天色变暗；相机轻微抖动，力度在低画质下减弱；雷击时白闪，之后只剩应急红光。
- 复用 space 套件的星空（冲出云层后出现）。

不许做：改其他文件（确实需要时，停下来在总结里说明原因）；加贴图、字体、音频文件或新依赖；出现日文；画领导人肖像。
