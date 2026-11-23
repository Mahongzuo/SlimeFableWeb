---
agent: codex
files: content/legacy-sources.ts, src/game/game.ts, src/slime/sim.worker.ts, src/slime/character.ts, content/ability.ts, content/ability-records.ts, content/types.ts, content/levels/types.ts, content/registry.ts, content/levels/registry.ts, src/level/main.ts, src/level/ability.ts, src/level/ability.css, src/templates/ability.ts, src/themes/ability.ts, src/ui/game-ui.ts, src/ui/ui.css, src/game/calendar.ts, scripts/qa-ability.py, scripts/qa-ability-drive.js, scripts/level-catalog.ts, scripts/serve.mjs, package.json, tests/ability.test.ts, AGENTS.md, docs/days/second-calendar.md, docs/level-catalog.json, docs/progress.md, docs/session/active.md, tasks/reports/1122-second-calendar-results.json, tasks/reports/1122-second-calendar.md, qa/evidence/second-peace.jpg, qa/evidence/second-phoenix.jpg, qa/evidence/second-calendar.jpg
checks: check,test,build
---
# 第二扇时光门
按用户定稿在 1–9 月每个日期加入同日不同年份的第二个可玩章节。先验证凤凰号的双灯、检修桥、雷检与回收，再推广六类能力玩法。史实采用逐日设计表 docs/days/second-calendar.md 的来源。凤凰号查 NASA 的 Mars Phoenix 任务页，纪念馆查馆方建馆史。艺术造型和机关为虚构；纪念关采用白花和和平钟。
交付包含两个端口的全年版、无点日历、可校验的全量 Agent 目录、逐关验收与回港证据。
检修桥改变碰撞体高度时，角色和工作线程需使用同一份碰撞几何。授权角色与模拟工作线程同步既有平台的包围盒，保留当前分身及模拟状态。
