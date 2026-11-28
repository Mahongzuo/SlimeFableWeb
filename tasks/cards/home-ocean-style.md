---
agent: codex
files: tasks/cards/home-ocean-style.md, src/game/game.ts, src/slime/character.ts, src/home/ocean-adventure.ts, src/home/voyage-controls.ts, src/home/render/fft-ocean.ts, src/home/render/postprocess.ts, scripts/qa-ocean-optics.py, qa/evidence/harbor-sea-*, docs/session/active.md
checks: check,test,build
---
# 入水后连续转向、海洋与港口配色

海上操作提示沿用陆地的鼠标视角。航海帮助、快捷菜单和暂停仍能操作，关闭后恢复原控制方式。沿用触屏操作。海面参考家园湖水、木栈道和草地调整，浅水偏青绿、浪峰和岸沫用柔和亮面归组；保留折射、焦散和深海的明暗层次。

用独立无头会话模拟指针锁，验证海岸到游泳、下潜、F1/F2、继续和触屏帮助。留存包含港口与海面的同机位前后图，复测不同画质和天气。
