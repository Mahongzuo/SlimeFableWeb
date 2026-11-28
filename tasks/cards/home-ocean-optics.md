---
agent: codex
files: tasks/cards/home-ocean-optics.md, src/home/voyage-controls.ts, src/home/ocean-adventure.ts, src/slime/character.ts, src/home/portals.ts, src/home/portal-vfx.ts, src/home/render/fft-ocean.ts, src/home/render/ocean-light.ts, src/home/render/postprocess.ts, src/home/render/clouds.ts, src/home/render/atmosphere.ts, src/home/render/pipeline.ts, src/home/garden-stage.ts, src/home/render/terrain-splat.ts, src/world/island-coast.ts, src/home/voyage-islands.ts, public/ocean/fair-sky.jpg, public/ocean/overcast-sky.jpg, public/ocean/caustics.png, public/ocean/sand-color.jpg, public/ocean/sand-normal.jpg, scripts/qa-ocean-optics.py, qa/evidence/ocean-optics-*, docs/session/active.md
checks: check,test,build
---
# 凝露港水下继续游玩、门内遮挡、海洋光照与天气

修复游泳、潜水和航海界面切换时的暂停循环，保留手动暂停、触屏按钮和 F1。门内漩涡负责自身深度。海面与浸水镜头独立调色，水上水下共享世界坐标焦散，浸水沙床使用 WaterShade 沙材质。晴天可见积云，云、风、浪随家园天气和时间渐变。

在禁用真实指针锁的独立无头浏览器复测暂停和继续、两角度门内深度、同机位天气和海床。保存生产画面并执行三项项目检查。
