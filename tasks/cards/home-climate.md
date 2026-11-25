---
agent: codex
files: tasks/cards/home-climate.md, src/home/climate.ts, src/home/climate-material.ts, src/home/garden-stage.ts, src/home/garden-regions.ts, src/home/portals.ts, src/home/jiangnan.ts, src/home/model-pack.ts, src/world/terrain-mesh.ts, src/home/frontier.ts, src/zones/kit.ts, src/zones/lake-water.ts, src/game/game.ts, src/game/save.ts, src/ui/game-ui.ts, src/ui/ui.css, tests/home-climate.test.ts, scripts/qa-home-climate.py, scripts/qa-jiangnan.py, qa/evidence/home-climate-*.jpg, docs/session/active.md, docs/progress.md
checks: check,test,build
---
# 家园四季与动态天气
按北京时间日期映射四季，在家园内联动天空、太阳与阴影、云雾、雨雪、水面和场景材质。提供自动天气与可保存的手动天气选择。授权 game.ts 接线，沿用每日关卡入口和游戏存档。覆盖跨日、季界、闰日、切换中改选和读档。在独立无头浏览器通过正常菜单验收并留存实景。
