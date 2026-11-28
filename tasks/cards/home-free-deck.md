---
agent: codex
files: tasks/cards/home-free-deck.md, src/home/ocean-adventure.ts, src/home/voyage-ship.ts, src/home/voyage-controls.ts, src/life/voyage.ts, src/slime/character.ts, tests/slime-voyage.test.ts, scripts/qa-voyage-shore.py, scripts/qa-slime-voyage.py, qa/evidence/free-deck-*, docs/session/active.md
checks: check,test,build
---
# 自由甲板和操舵

覆盖码头启航、召船、梯旁登船、潜水回船与读档。登船落在甲板；键盘和触屏均可在船体局部坐标行走，到船尾舵轮按 F 掌舵，再按 F 原地松舵。甲板随波浪和惯性移动。调整起步、减速、倒航与停车，保留船钓、海战、下水及返港。

更新航海 F1、原有航海回归和检查点。用独立无头会话检查横竖屏帮助、远离船舵的 F、行走边界、松舵随船、再次掌舵与航速，记录实景和数值。
