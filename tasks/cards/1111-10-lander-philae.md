---
agent: codex
model: gpt-6-astra
effort: high
files: src/slime/character.ts, src/templates/lander.ts, src/level/lander.ts, src/themes/space.ts, content/levels/1112-2014.ts, content/levels/types.ts, content/levels/registry.ts, content/types.ts, src/level/main.ts, content/days/1112.ts, tests/lander.test.ts
checks: check,test
---
# 低重力着陆模板 lander + 共享 space 套件 + 1112 · 2014 菲莱

先读 `.agents/skills/slimefable-level/SKILL.md` 以及它的 references，再读设计页 `docs/days/1112.md`（这张卡要实现的章节是 1112-2014）。动手前先看这些现成的例子：
- `src/level/runner.ts`：一个完整的关卡运行时（Stage、史莱姆、LevelUI、Save、applyLevelQuality、`window.__level.step`、高光的写法）。
- `src/templates/runner.ts`：纯数据模板 + 可达性校验。
- `src/themes/sf1936.ts`：画面细节密度的标准。

接入方式：在 `content/levels/types.ts` 加新的 Spec 类型并加入 `AnyLevel`；在 `src/level/main.ts` 里按 template 分发到新的运行时；在 `content/levels/registry.ts` 注册关卡；把 `content/days/1112.ts` 里对应章节的 status 改成 'web'。如果模板是新的，还要在 `content/types.ts` 的 Template 里加上。
复玩记录写进 `save.data.life.records['<关卡id>-<挑战名>']`，纪念品用 `save.add('souvenirs', id)`，通关用 `save.add('completed', id)`。

验收：`npm run check`、`npm test`、`node .agents/skills/slimefable-level/scripts/lint-content.mjs` 全部通过；交付总结按 SKILL.md 第 5 步写，包括自评表打分和建议机位。

要点：
- `lander` 模板：彗星地形用程序化高度场，纯数据，要有坑、冰崖、平原，双瓣外形只在远景里表现。生成着陆圈 Agilkia、3 个阳光平台、终点 Abydos，以及光照区随时间移动的规则。测试要证明所有平台都能用“低重力跳跃 + 贴墙”到达，跑 40 个种子。
- 低重力：把 SlimeCharacter 的重力做成可配置（在 `src/slime/character.ts` 里只加一个可选的 `gravityScale` 选项，默认 1，其余逻辑不动）。落地速度过快会反弹；摊开身体（spread>0.5）能吸收冲击；火属性按空格可以短促喷气。
- 电池条、阳光和阴影、3 份科学数据、Abydos 传数据的高光（罗塞塔号从头顶飞过、光柱）。
- `space` 套件：星空穹顶（程序化的点星和银河带）、远处的太阳、航天器零件生成函数（太阳能翼、天线碟、桁架）。1980、1969、1970 这几关都要复用它，所以要写成通用函数并导出。

不许做：改其他文件（确实需要时，停下来在总结里说明原因）；加贴图、字体、音频文件或新依赖；出现日文；画领导人肖像。
