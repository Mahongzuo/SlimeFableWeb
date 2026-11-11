---
agent: codex
model: gpt-6-astra
effort: high
files: src/templates/flyby.ts, src/level/flyby.ts, src/themes/space.ts, content/levels/1112-1980.ts, content/levels/types.ts, content/levels/registry.ts, content/types.ts, src/level/main.ts, content/days/1112.ts, tests/flyby.test.ts
checks: check,test
---
# 引力弹弓模板 flyby + 1112 · 1980 旅行者 1 号

先读 `.agents/skills/slimefable-level/SKILL.md` 以及它的 references，再读设计页 `docs/days/1112.md`（这张卡要实现的章节是 1112-1980）。动手前先看这些现成的例子：
- `src/level/runner.ts`：一个完整的关卡运行时（Stage、史莱姆、LevelUI、Save、applyLevelQuality、`window.__level.step`、高光的写法）。
- `src/templates/runner.ts`：纯数据模板 + 可达性校验。
- `src/themes/sf1936.ts`：画面细节密度的标准。

接入方式：在 `content/levels/types.ts` 加新的 Spec 类型并加入 `AnyLevel`；在 `src/level/main.ts` 里按 template 分发到新的运行时；在 `content/levels/registry.ts` 注册关卡；把 `content/days/1112.ts` 里对应章节的 status 改成 'web'。如果模板是新的，还要在 `content/types.ts` 的 Template 里加上。
复玩记录写进 `save.data.life.records['<关卡id>-<挑战名>']`，纪念品用 `save.add('souvenirs', id)`，通关用 `save.add('completed', id)`。

验收：`npm run check`、`npm test`、`node .agents/skills/slimefable-level/scripts/lint-content.mjs` 全部通过；交付总结按 SKILL.md 第 5 步写，包括自评表打分和建议机位。

要点：
- 这关不用 SlimeCharacter 的地面移动。史莱姆作为探测器在 2.5D 平面上做惯性运动，受天体引力（引力常数和距离衰减按手感调，写成常量）；史莱姆的外观仍然用 SlimeCharacter 渲染，可以让它悬浮在探测器上，或者直接复用它的网格。
- 轨迹预测线（未来 6 秒）是核心爽感，必须平滑、实时更新。
- 推进次数有限（12 次）；光环带会减速并扣护盾，卡西尼缝是安全区；6 个拍照目标，每个有快门窗口，按 F 拍照，照片用扫描线、低色深的效果显示在 UI 角落。
- 高光：借泰坦弯轨时慢动作、镜头推近，然后轨道被甩出黄道面，画面向上抬。
- 测试：用一组固定的推进序列，能在模拟里拍到全部 6 张照片并到达终点（证明可解）。

不许做：改其他文件（确实需要时，停下来在总结里说明原因）；加贴图、字体、音频文件或新依赖；出现日文；画领导人肖像。
