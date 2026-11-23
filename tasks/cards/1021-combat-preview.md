# 10 月 21 日双遭遇试玩任务卡

状态：已收到角色交接确认，首批短遭遇已实现。本批玩家验收后，再接双层甲板、双阵和首领制作卡。

本轮设计可改文件：本卡、`docs/session/active.md`。实作开工时按交付版角色接口补齐实作文件清单。

| 入口 | 史实与演绎 | 首份试玩 | 玩家判断 |
|---|---|---|---|
| 5 号门 · 1021-skirmish《风帆之间》 | 1805 年特拉法加海战；帆布偶兵与凝露弹为演绎。[格林尼治皇家博物馆](https://www.rmg.co.uk/stories/maritime-history/battle-trafalgar-background) | 一块甲板、一根可挡弹的桅杆、一名会探出还击的敌人。开始即开镜，真实分身击中时在接触点爆裂，按 X 可回收。只靠射击可胜。 | 第一发是否打在准星预期的位置，是否想再打一发？ |
| 6 号门 · 1021-rpg《关原雾阵》 | 1600 年关原之战；旗甲兵与玩家交手为演绎。[日本国家旅游局](https://www.japan.travel/en/spot/2341/) | 一面旗、一名旗甲兵。举旗预警、横扫、旗尖陷泥、收招。普通连击可胜；水 E 接火 E 验蒸发，先挂元素再用物理 E 验破韧。 | 第一次看清横扫后，是否愿意躲开再上前反击？ |

**角色交接与联调**

- 记录交付版本。复用原生角色输入、伤害、附着、能量与冷却；确认关卡默认开镜、移动敌人注册与移除、玩家受伤和倒地入口。Q 只施放一次，旧关的选目标绑定仅在旧关生效。
- 射击对照同一发分身在有桅杆与无遮挡时的落点。以发射时元素计伤，一次接触只结算一次，视觉爆裂后仍遵守原生回收规则。
- 验证普通连击、有效与过期附着、1 秒切换冷却和能量不足。死亡敌人离开战斗目标集合。训练木靶继续按其既有逻辑复活。
- 三消留在 4 号门。旧投射和旧试炼连同额外历史章节列在左侧 3 号门，沿用原 ID、存档和直链。新试玩从史书和港口走相同入口与回港映射。
- 两段试玩都要验证敌人还击、走位躲避、死亡重试、胜利只记一次；后台无头测试禁用指针锁，手感由玩家验收。

**玩家认可后的完整关**：甲板扩为近远敌交火和船首守卫；关原扩为轻重双敌与半血追加预警追击的阵旗守将。第二轮结束选回复 30% 最大生命或本局伤害增加 20%。保存每轮入场时的生命、能量、冷却和强化，重试按该快照恢复。首领仅在收招时被真实破韧反应打出额外倒地窗口，每次收招最多一次。
用户已确认角色交付。实作 files: content/daily-modes.ts, src/game/mode-gates.ts, src/game/game.ts, src/home/portals.ts, src/ui/game-ui.ts, src/level/main.ts, src/level/battle-preview.ts, src/level/battle-preview.css, src/themes/battle-preview.ts, src/slime/character.ts, src/slime/combat.ts, src/slime/types.ts, tests/mode-gates.test.ts, scripts/level-catalog.ts, docs/level-catalog.json, docs/progress.md, docs/session/active.md, qa/evidence/1021-*.jpg, tasks/reports/1021-preview.md, scripts/qa-battle-preview.py。按项目分工派发入口、角色接口、美术三个任务；关卡运行时与联调由 Codex 负责。
分身子步命中与测试补充 files: src/slime/solver.ts, src/slime/sim.worker.ts, tests/battle-projectile.test.ts。
旧门位浏览器回归补充 files: scripts/qa-daily-modes.py。

同步文档 files: AGENTS.md（更新门位说明）。
