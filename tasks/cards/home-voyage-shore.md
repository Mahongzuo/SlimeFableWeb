---
agent: codex
files: tasks/cards/home-voyage-shore.md, src/game/game.ts, src/home/ocean-adventure.ts, src/home/voyage-controls.ts, src/home/voyage-ship.ts, src/home/voyage-sea.ts, src/slime/character.ts, src/slime/sim.worker.ts, src/slime/solver.ts, src/slime/types.ts, src/slime/render.ts, scripts/qa-slime-voyage.py, scripts/qa-voyage-shore.py, qa/evidence/voyage-shore-*, docs/session/active.md
checks: check,test,build
---
# 船体接触、甲板随动和登岸

船碰撞与可见船壳共用剖面。验证从水面攀上船舷、从龙骨下潜过、离船和高速转向时身体与镜头的位置。按住 Alt 临时显示鼠标，松开恢复视角，菜单可继续使用鼠标。

岸上隐藏回船操作，游回船边恢复登梯。跳鱼的起落点与整段轨迹须处于有足够深度的海水中。使用禁用真实指针锁的独立无头浏览器检查操作、航海帮助和海岸画面。
