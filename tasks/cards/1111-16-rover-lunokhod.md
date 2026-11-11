---
agent: codex
model: gpt-6-astra
effort: high
files: src/slime/character.ts, src/level/lander.ts, src/templates/lander.ts, src/themes/moon-1970.ts, src/themes/space.ts, content/levels/1117-1970.ts, content/levels/types.ts, content/levels/registry.ts, content/days/1117.ts, content/registry.ts, tests/lander.test.ts
checks: check,test
---
# lander 的 rover 模式 + 1117 · 1970 月球车 1 号

先读 `.agents/skills/slimefable-level/SKILL.md` 以及它的 references，再读设计页 `docs/days/1117.md`（这张卡要实现的章节是 1117-1970）。动手前先看这些现成的例子：
- `src/level/runner.ts`：一个完整的关卡运行时（Stage、史莱姆、LevelUI、Save、applyLevelQuality、`window.__level.step`、高光的写法）。
- `src/templates/runner.ts`：纯数据模板 + 可达性校验。
- `src/themes/sf1936.ts`：画面细节密度的标准。

接入方式：在 `content/levels/types.ts` 加新的 Spec 类型并加入 `AnyLevel`；在 `src/level/main.ts` 里按 template 分发到新的运行时；在 `content/levels/registry.ts` 注册关卡；把 `content/days/1117.ts` 里对应章节的 status 改成 'web'。如果模板是新的，还要在 `content/types.ts` 的 Template 里加上。
复玩记录写进 `save.data.life.records['<关卡id>-<挑战名>']`，纪念品用 `save.add('souvenirs', id)`，通关用 `save.add('completed', id)`。

验收：`npm run check`、`npm test`、`node .agents/skills/slimefable-level/scripts/lint-content.mjs` 全部通过；交付总结按 SKILL.md 第 5 步写，包括自评表打分和建议机位。

前置：1111-10 完成后才能做。
要点：
- 新建 `content/days/1117.ts` 并注册。
- rover 模式：输入延迟 1.5 秒的队列，画两个影子（当前位置和指令执行后的位置）；8 轮车的悬挂贴合地形；电量、太阳能盖；下车和上车。
- 月面地形复用 lander 的高度场生成，参数换成月面：雨海平原、陨石坑、远处的环形山壁。
- 高光：地平线上地球升起，拍照后画面变成 1970 年黑白电视扫描线效果，然后月夜降临。

不许做：改其他文件（确实需要时，停下来在总结里说明原因）；加贴图、字体、音频文件或新依赖；出现日文；画领导人肖像。
