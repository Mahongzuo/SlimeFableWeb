# 1 月 1 日六号门 · 冰场 · 门将先动了

## 事实卡

2008 年 1 月 1 日匹兹堡通过决胜射门 2 比 1 获胜。https://records.nhl.com/events/outdoor-games

## 玩法与演绎

从暗通道进入冰场；摊开与急转热身、风步/格挡、门将转肩移刃扑救、射失门前重试、动态刃痕、进网后灯亮及看台起身。两翼胜和零失误。 场景、机关与玩家操作为游戏演绎。详见用户批准的六门设计。

## 可改文件

src/{level,templates,themes}/january-rpg.*, src/{level,templates,themes}/jan01-rpg.*, tests/{jan01-rpg,january-rpg}.test.ts, scripts/qa-jan01-rpg.py, scripts/qa-january-rpg.py, tasks/cards/jan01-rpg.md, qa/evidence/jan01-rpg-*

旧月度验收脚本只适配 0101 的摊开滑行和收身热身，保持其他日期的操作。

统筹可同步六关接入数据、目录与验收：content/{atlas,ability,atlas-records,ability-records,january-pilots,daily-modes}.ts、content/levels/registry.ts、src/level/main.ts、scripts/{level-catalog.ts,qa-jan01*.py}、tests/jan01*.test.ts、docs/{days/0101.md,level-catalog.json,progress.md,session/active.md}、tasks/reports/jan01-worlds.md、qa/evidence/jan01-*。

## 验收

正常操作通关、局部重试、挑战记录与旧档、无头横竖屏和多角度实景；40 个种子、内容检查、catalog:check、check、test、build。角色接入原版流体，视觉与手感交玩家确认。
