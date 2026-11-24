# 六月四扇门制作卡

覆盖 0601–0630。每天三件中国史事和一件海外史事，对应三号塔防、四号三消、五号分身交火、六号战斗 RPG。按史事发生日或明示的发行日编排，每日四个独立来源。事实与来源以本卡附件 [六月逐关定稿](../../docs/days/june-four-gates.md) 为准。收集物、训练偶、机关和路线为虚构。避开当天两篇既有章节，严肃事件只选非战斗玩法。

## 可改文件

- 本卡、docs/days/june-four-gates.md、content/june-pilots.ts、content/daily-modes.ts、vite.config.ts。
- src/templates/june-{defense,match,skirmish,rpg}.ts、src/templates/january-{defense,match,skirmish,rpg}.ts。
- tests/june-four-gates.test.ts、tests/january-{match,skirmish,rpg}.test.ts、tests/mode-gates.test.ts。
- scripts/level-catalog.ts、docs/level-catalog.json、docs/progress.md、docs/session/active.md、tasks/reports/june-four-gates.md、qa/evidence/june-*。

## 验收

逐日检查地区配额、四门顺序、故事与收藏键、原章节和有效地图。复用四套原生角色运行时及其四十种子仿真。独立无头浏览器禁用指针锁，抽查生产版各模式、流体与操作、保存截图。运行 catalog、catalog:check、check、test、build 和内容检查，报告分别注明自动覆盖与玩家待验项目。
