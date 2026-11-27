---
agent: codex
files: tasks/cards/slime-voyage.md, src/life/state.ts, src/life/voyage.ts, src/home/ocean-adventure.ts, src/home/voyage-ship.ts, src/home/voyage-sea.ts, src/home/voyage-islands.ts, src/home/voyage-controls.ts, src/home/render/fft-ocean.ts, src/home/render/voyage-wake.ts, src/game/game.ts, src/zones/harbor.ts, src/ui/ui.css, tests/slime-voyage.test.ts, scripts/qa-slime-voyage.py, qa/evidence/slime-voyage-*, tasks/reports/slime-voyage.md, docs/progress.md, docs/session/active.md
checks: check,test,build
---
# 史莱姆号远海冒险
在家园接入码头补给、动物船员、持久化风旗、船浪、海鸟飞鱼、可登陆的三类种子岛与逐波舷炮战。家园游戏入口获准接入航次恢复、局部地形及输入。现有流体角色、生活存档和钓鱼结算沿用。
按玩家定稿验收 300–2000 米向外遇敌、12 发两波、返港货箱一次入账、撤退保住鱼获、F1 与触屏。后台独立无头检查驾驶、游戏进度与多角度水面、旗帜和岛岸。画面手感由玩家确认。

玩家追加要求已纳入白名单。对照参考项目的船体生浪、世界坐标泡沫历史、含气水色与镜面粗糙度，直接修改海洋顶点和片元材质，添加动态泡沫场与同机位开关对照验收。
