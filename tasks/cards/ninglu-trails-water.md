---
agent: codex
files: tasks/cards/ninglu-trails-water.md, tasks/reports/ninglu-trails-water.md, docs/{progress,session/active}.md, src/world/{expansion,terrain-mesh,island-coast}.ts, src/home/{biome-preserves,preserve-trails,preserve-water,water-waves,homestead,ninglu-layout,build-catalog,builder,garden-stage,ranch-runtime}.ts, src/home/ninglu-collision.json, src/home/foliage/{grass-ism,preserve-habitat}.ts, src/home/render/{postprocess,pipeline,water-surface}.ts, src/zones/{lake,forest,lake-water}.ts, src/game/game.ts, src/life/state.ts, src/ui/{companion-panel,guide-catalog}.ts, src/ui/companion-panel.css, public/models/companions/{ninglu-courtyard.glb,CREDITS.md}, scripts/{import-ninglu-courtyard,qa-ninglu-trails,qa-home-companions}.py, tests/{ninglu-trails-water,preserve-foliage,home-companions}.test.ts, qa/evidence/ninglu-trails-*
---
# 北岸曲径、水体与凝露小院

对照用户本机 meadow，用同一路线驱动泥土、草花留白、护栏和栈道。连接地的外侧岸坡也须覆盖。按脚掌和身体实际入水接入水鸟波纹，内陆水支持水线过渡、仰视、折射和水下焦散。采用用户原作 GLB 和配套碰撞，调整统一比例，贯通真实楼梯、两个厢房、屋内灯光及既有照料与家具功能。game.ts 仅用于家园碰撞、镜头、互动和真实水域查询。后台检查已购土地衔接、通行、水面上下和新旧家具存档，留存多机位证据，执行三项工程检查。
