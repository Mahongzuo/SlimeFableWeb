---
agent: codex
files: index.html, README.md, THIRD_PARTY_NOTICES.txt, src/home/chinese-houses.ts, vendor/sunharbor/harbor.ja.js, public/harbor.js, vendor/sunharbor/legacy.zh.js, scripts/localize-harbor.mjs, src/main.ts, src/home/garden-stage.ts, src/home/garden-regions.ts, src/home/waterway.ts, src/home/jiangnan.ts, src/home/layout.ts, src/home/portals.ts, src/home/build-catalog.ts, src/home/builder.ts, src/home/frontier.ts, src/game/game.ts, src/game/graphics.ts, src/ui/game-ui.ts, src/ui/guide-catalog.ts, src/world/map.ts, src/world/terrain-mesh.ts, src/world/home-world.ts, src/zones/harbor.ts, src/zones/fishing-spot.ts, src/zones/park.ts, src/zones/lake.ts, src/zones/lake-water.ts, src/zones/forest.ts, src/zones/farm.ts, src/world/linqi/scene-designs.js, src/world/linqi/regional-layouts.js, src/world/linqi/road-coverage.js, src/ui/ui.css, src/ui/build-ui.ts, tests/jiangnan-home.test.ts, scripts/qa-jiangnan.py, qa/evidence/jiangnan-*.jpg, qa/evidence/jiangnan-*.json, tasks/reports/jiangnan-home.md, docs/session/active.md, docs/progress.md, tasks/cards/original-home.md
checks: check,test,build
---
# 家园独立重建
用户修正覆盖先前的旧港样板方向。只改家园，保留每日关卡、人物、生活活动与收藏。以 DreamWorld 自有场景布局、道路计算、自有模型来源复核为基础，搭建新水街、书院、活动园、农场、钓场和林地；统一原生、建造和扩建素材，移出旧港运行包。核对来源、天气、六门、旧存档、移动和撤销、家园各区实景、技术检查。

试玩指南同步更新水巷钓点、碎片位置和景组操作，以便玩家沿新版家园的实际路线探索。
旧港原始包、汉化包和专用替换脚本均已在备份标签中留存。完成独立入口核验后，将它们从新版源码树移出，第三方引擎许可继续保留。
