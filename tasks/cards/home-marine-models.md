---
agent: codex
files: tasks/cards/home-marine-models.md, public/ocean/models/*, src/home/marine-models.ts, src/home/island-rock-profiles.json, src/home/reef-garden.ts, src/home/voyage-sea.ts, src/home/ocean-life.ts, src/home/ocean-adventure.ts, src/home/voyage-islands.ts, src/home/model-pack.ts, src/world/island-coast.ts, src/home/render/fft-ocean.ts, scripts/import-marine-models.py, scripts/qa-marine-models.py, qa/evidence/marine-models-*, docs/session/active.md
checks: check,test,build
---
# 海底礁群、鱼群与海岛树木

从指定 threejs-water-pro 的实际 GLB 取材。七种水下石头、海草和两种海藻按海床、水深和海域种子成簇分布，添加分枝珊瑚。迁移带骨骼动画的鱼与原岛棕榈，使用原岛沙滩材质、拆分的棕榈和岸石，按存档种子和航行海域变化岛屿尺寸、树丛及岩石排布。沿用程序化岛岸、海岸跳鱼判定和已有海洋玩法。海鸥使用已有海鸥的飞行动画。验证生产入口、近岸和远岛实景、水底两个角度、切换画质、回港卸载和重复访问。
