# 1021 战斗升级实施卡
按项目分工派发三个独立工作包：原生底栏与出发按钮、三层船与碰撞、骨骼动画与武器事件。Codex 整合战斗、完美闪避和验收。
可改 files: src/ui/*, src/game/game.ts, src/level/*.ts, src/level/battle-preview.css, src/themes/battle-preview.ts, src/themes/battle-ship.ts, src/themes/battle-rig.ts, src/templates/battle-dodge.ts, src/slime/character.ts, src/slime/combat.ts, src/slime/world.ts, src/slime/render.ts, src/slime/solver.ts, tests/*battle*.test.ts, scripts/qa-battle*.py, qa/evidence/1021-*, docs/progress.md, docs/session/active.md, tasks/reports/1021-upgrade.md, docs/level-catalog.json、content/daily-modes.ts。目录从模式注册数据生成，因此同步这两关的玩法选择和三层船布局。
事实卡及角色采用原1021卡；验收按用户本轮计划，含近景无UI动作视频、手机布局和上下层通路。

## 双战斗史实补充与鼠标输入
本轮只制作这两场的历史介绍。鼠标右键调用角色所在关卡的闪避，Alt 为备用。核实后采用以下事实。
- 特拉法加。英国纳尔逊率舰队在西班牙西南海面与维尔纳夫指挥的法国、西班牙联合舰队相遇。联合舰队从加的斯出海，奉命进入地中海。纳尔逊与科林伍德分别领一列舰船，战斗结束英方获胜，纳尔逊在胜利号上中弹去世。风暴使许多俘获的舰船未能带回。参见[格林尼治皇家博物馆背景](https://www.rmg.co.uk/stories/maritime-history/battle-trafalgar-background)与[战斗时间线](https://www.rmg.co.uk/stories/maritime-history/battle-trafalgar-timeline)。
- 关原。丰臣秀吉身后，日本大名分成对立阵营。东军以德川家康为首，石田三成是西军核心。双方在今岐阜县关原交战，小早川秀秋转攻西军，其他部队也倒向东军。东军胜利，1603 年德川家康开设幕府。史书日期用公历，对应当时日本历法九月十五日。参见[纪念馆概览](https://sekigahara.pref.gifu.lg.jp/en/about/)、[小早川史迹](https://sekigahara.pref.gifu.lg.jp/en/tour/kobayakawa-hideaki/)、[新旧历说明](https://sekigahara.pref.gifu.lg.jp/news/p3253/)与[日本政府对开府年份的记载](https://www.gov-online.go.jp/eng/publicity/book/hlj/html/202210/202210_04_en.html)。

小早川部攻击大谷吉继部的记录见[纪念馆大谷吉继史迹](https://sekigahara.pref.gifu.lg.jp/otani-yoshitsugu/)。
