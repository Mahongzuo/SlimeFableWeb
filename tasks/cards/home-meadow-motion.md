---
agent: codex
files: tasks/cards/home-meadow-motion.md, src/home/foliage/meadow-motion.ts, src/home/foliage/grass-ism.ts, src/home/garden-stage.ts, src/zones/park.ts, src/zones/farm.ts, tests/home-meadow-motion.test.ts, scripts/qa-meadow-motion.py, qa/evidence/meadow-motion-before.jpg, qa/evidence/meadow-motion-after.jpg, qa/evidence/meadow-motion-before.json, qa/evidence/meadow-motion-after.json, qa/evidence/meadow-motion-wind.webm, tasks/reports/home-meadow-motion.md, docs/progress.md, docs/session/active.md
checks: check,test,build,catalog:check
---
# 草地静止接触、公园饮水台和强风摆动

按截图定位四座同款公园饮水台。让底座、盆沿和水嘴支持侧碰、落脚与相机探测。核实长椅和地面高度，草花接触依据脚底与草根实际地表；静止保持一次压痕、移动留下回弹轨迹。钳制草花受风的角速度和相对株高的位移，切换天气时连续过渡。

专项回归使用独立无头浏览器，禁用指针锁，覆盖原地等候、长椅、移步、跳跃、天气切换及四座饮水台。保留前后截图与测量记录，运行项目规定的类型、全测、构建和目录检查。
