---
agent: codex
model: gpt-6-astra
effort: high
files: src/templates/landmark.ts, src/level/landmark.ts, src/level/pixel-board.ts, src/themes/arecibo-1974.ts, content/levels/1116-1974.ts, content/levels/types.ts, content/levels/registry.ts, content/types.ts, src/level/main.ts, content/days/1116.ts, content/registry.ts, tests/landmark.test.ts
checks: check,test
---
# 地标攀爬模板 landmark + 像素谜题 + 1116 · 1974 阿雷西博信息

先读 `.agents/skills/slimefable-level/SKILL.md` 以及它的 references，再读设计页 `docs/days/1116.md`（这张卡要实现的章节是 1116-1974）。动手前先看这些现成的例子：
- `src/level/runner.ts`：一个完整的关卡运行时（Stage、史莱姆、LevelUI、Save、applyLevelQuality、`window.__level.step`、高光的写法）。
- `src/templates/runner.ts`：纯数据模板 + 可达性校验。
- `src/themes/sf1936.ts`：画面细节密度的标准。

接入方式：在 `content/levels/types.ts` 加新的 Spec 类型并加入 `AnyLevel`；在 `src/level/main.ts` 里按 template 分发到新的运行时；在 `content/levels/registry.ts` 注册关卡；把 `content/days/1116.ts` 里对应章节的 status 改成 'web'。如果模板是新的，还要在 `content/types.ts` 的 Template 里加上。
复玩记录写进 `save.data.life.records['<关卡id>-<挑战名>']`，纪念品用 `save.add('souvenirs', id)`，通关用 `save.add('completed', id)`。

验收：`npm run check`、`npm test`、`node .agents/skills/slimefable-level/scripts/lint-content.mjs` 全部通过；交付总结按 SKILL.md 第 5 步写，包括自评表打分和建议机位。

要点：
- 新建 `content/days/1116.ts` 并注册。
- landmark 模板：三塔、缆索、悬挂平台、天线碗、喀斯特山谷。攀爬路线是数据，并有可达性测试。缆索滑行：站在缆索上摊开身体，就顺着坡滑下。
- pixel-board：23×73 的信息分成 5 块，按真实阿雷西博信息的 1679 位编码（数据写在文件里，并注明来源）；雷属性走过就点亮；有半透明的答案轮廓；涂错可以撤销。
- 高光：发射光柱、光点化成的信息飞向星空、回望地球。

不许做：改其他文件（确实需要时，停下来在总结里说明原因）；加贴图、字体、音频文件或新依赖；出现日文；画领导人肖像。
