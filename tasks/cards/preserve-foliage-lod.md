---
agent: codex
files: tasks/cards/preserve-foliage-lod.md, tasks/reports/preserve-foliage-lod.md, docs/progress.md, docs/session/active.md, src/home/{biome-preserves,model-pack}.ts, src/home/foliage/{grass-ism,preserve-habitat,preserve-lod}.ts, scripts/{bake-preserve-impostors,qa-preserve-foliage,qa-home-companions}.py, public/models/companions/preserve-impostors.*, public/models/companions/CREDITS.md, tests/preserve-foliage.test.ts, qa/evidence/preserve-foliage-*
---
# 五区地被与远景连续性

按水深、地形、道路与安置空地生成各生态区的草层与花带，复用旧区实例草、天气和画质机制。树冠和野生动物在详细模型加载前提供同源远景轮廓，分级过渡，避免整片跳出。保留野外互动与旧存档安置点。

后台无头浏览器以同机位比较改前改后，检查五区、抵近折返、延迟资源、栈道与空地、性能与画质档位。留存实景、测量和三项工程检查结果。
