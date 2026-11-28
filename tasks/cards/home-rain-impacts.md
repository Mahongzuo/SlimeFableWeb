---
agent: codex
files: tasks/cards/home-rain-impacts.md, src/home/rain-contact.ts, src/home/rain-body.ts, src/home/garden-stage.ts, src/home/foliage/grass-ism.ts, src/game/game.ts, src/slime/render.ts, tests/home-rain-impacts.test.ts, scripts/qa-rain-impacts.py, qa/evidence/rain-impacts-before.jpg, qa/evidence/rain-impacts-after.jpg, qa/evidence/rain-impacts-body.jpg, qa/evidence/rain-impacts-play.webm, qa/evidence/rain-impacts.json, docs/progress.md, docs/session/active.md
checks: check,test,build,catalog:check
---
# 河岸地面与史莱姆表面的雨花

恢复近处石路、草地的可见雨花。沿现有雨线区分陆地、水域与角色，让落到史莱姆身上的雨滴在当前软体表面溅开，同一滴只结算一次。检查雨停、跳起、摊开和遮挡。授权 game.ts 接入已有碰撞世界和角色显示几何，render.ts 仅接入角色表面受雨的材质表现。使用独立无头浏览器和固定河岸机位验收，留实景、动态记录和专项回归。
