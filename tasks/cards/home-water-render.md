---
agent: codex
model: gpt-6-astra
effort: medium
files: src/home/render/pipeline.ts, src/home/render/fft-ocean.ts, src/home/render/postprocess.ts, src/home/render/gtao.ts, src/home/render/ibl.ts, src/home/render/clouds.ts, src/home/render/atmosphere.ts, src/home/render/calibrated-params.ts, src/home/render/params.ts, src/home/render/perf-hud.ts, src/home/render/static-batch.ts, src/home/render/water-surface.ts, src/home/garden-stage.ts, src/home/ocean-life.ts, src/zones/lake-water.ts, src/game/graphics.ts, src/world/terrain-mesh.ts, src/world/island-coast.ts, src/home/foliage/grass-ism.ts, src/zones/lake.ts, scripts/qa-home-perf.py, scripts/qa-home-water.py, tests/home-water-render.test.ts, qa/evidence/home-perf-*.json, qa/evidence/home-water-*.jpg, docs/session/active.md
checks: check,test,build
---
# 凝露港水体与渲染重整（性能 + 统一水体 + 调色）

目标：4K 60 Hz、高画质下家园稳定不掉帧；海、镜湖、河道、荷塘、水洼共用一套更清透的水体着色，岸线有浪花和湿沙；整体调色从“后期推饱和”回到干净克制的绘本海岛。

做法：
1. 阶段 0：`src/home/render/perf-hud.ts`（`?perf=1`，GPU 计时、各通道 draw call、帧时间分位数）与 `scripts/qa-home-perf.py`（无头 3840×2160 四机位基线，输出 `qa/evidence/home-perf-*.json`）。
2. 阶段 1：主通道内在第一块水体绘制前用 `blitFramebuffer` 拷贝不透明颜色与深度，去掉 pre-ocean 全场景重画；GTAO 从深度重建法线，去掉法线全场景通道；全部水体共用一张平面反射（斜裁近平面，无着色器变体），其余回落屏幕空间反射与天空；`graphics.ts` 的反射档位接回新通道；PMREM 复用 RT 并限频、`compileAsync` 预热、场景矩阵每帧只更新一次；动态分辨率；FFT 用 MRT 合并绘制；体积云改全景缓存分帧更新。
3. 阶段 2：`src/home/render/water-surface.ts` 提供共享 GLSL（深度色带、泡沫、闪烁、屏幕空间反射），`lake-water.ts` 保留 `valleyWater`/`lakeWater` 签名与 `releaseWater`、`contacts`、`ctx.reflectActor` 约定。
4. 阶段 3、4：调色参数、天空、接触阴影；湿沙随浪进退、岸边细节、草地降荧光。

不许做：不改 `src/slime/`、`src/game/game.ts`；不改碰撞、钓点、地形高度函数；工作区其他任务的未提交改动保持原样。

验收：`npm run check`、`npm test`、`npm run build` 通过；`tests/home-water-render.test.ts` 断言每帧全场景绘制次数上限；`qa/evidence/home-water-*.jpg` 留海岸、湖岸、桥墩常规与贴地斜看两角度；确认史莱姆流体表面生成、可变形且出现在水面倒影中。画面与手感由用户试玩确认。
