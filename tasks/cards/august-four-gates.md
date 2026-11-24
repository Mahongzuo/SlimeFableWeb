---
agent: codex
files: content/august-pilots.ts, content/daily-modes.ts, docs/days/august-four-gates.md, docs/level-catalog.json, docs/progress.md, docs/session/active.md, qa/evidence/august-0801-defense-far.jpg, qa/evidence/august-0801-defense-low.jpg, qa/evidence/august-0801-defense-portrait.jpg, qa/evidence/august-0801-defense.jpg, qa/evidence/august-0801-match-finale.jpg, qa/evidence/august-0801-match.jpg, qa/evidence/august-0810-skirmish-finale.jpg, qa/evidence/august-0810-skirmish.jpg, qa/evidence/august-0815-harbor.jpg, qa/evidence/august-0815-match-finale.jpg, qa/evidence/august-0816-defense.jpg, qa/evidence/august-0818-match.jpg, qa/evidence/august-0823-skirmish.jpg, qa/evidence/august-0827-rpg-duel.jpg, qa/evidence/august-0827-rpg.jpg, qa/evidence/august-0831-rpg.jpg, qa/evidence/august-harbor.json, qa/evidence/august-playthroughs.json, qa/evidence/august-production.json, scripts/level-catalog.ts, src/templates/august-defense.ts, src/templates/august-match.ts, src/templates/august-rpg.ts, src/templates/august-skirmish.ts, src/templates/january-defense.ts, src/templates/january-match.ts, src/templates/january-rpg.ts, src/templates/january-skirmish.ts, tasks/cards/august-four-gates.md, tasks/reports/august-four-gates.md, tests/august-four-gates.test.ts, tests/mode-gates.test.ts
checks: check,test,build,catalog:check
---
# 八月四扇门制作卡

8 月 1–31 日每天开放塔防、三消、分身交火和战斗 RPG。四扇门每天各讲一事，按三件中国史事和一件海外史事编排。8 月 15 日四号门沿用巴拿马运河通航三消，保留现有玩法、纪念品、正式及练习成绩和往期挑战。全月新增 123 关，连同该关共 124 关。

以[八月逐日事实卡](../../docs/days/august-four-gates.md)定稿的日期、史实及出处制作。路线、训练偶和纪念品属于游戏演绎。检查选题与当天已有章节的重复情况；严肃事件只采用非战斗形式。

## 可改文件

- 本卡、docs/days/august-four-gates.md、content/august-pilots.ts、content/daily-modes.ts。
- src/templates/august-{defense,match,skirmish,rpg}.ts、src/templates/january-{defense,match,skirmish,rpg}.ts。
- tests/august-four-gates.test.ts、tests/mode-gates.test.ts、scripts/level-catalog.ts、docs/level-catalog.json。
- docs/progress.md、docs/session/active.md、tasks/reports/august-four-gates.md、qa/evidence/august-*。

## 验收

检查 31 天配比、门序、四个故事与各自来源、独立存档、旧入口、关卡配置及种子可解性。使用独立无头浏览器，禁用指针锁，核对流体角色、实际入关与操作，留存截图。运行类型检查、完整测试、构建、目录生成及校验、内容检查。
