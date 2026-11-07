---
agent: codex
model: gpt-6-astra
effort: low
files: src/zones/lake.ts
checks: check,test
---
# 镜湖：把湖边做成想待着钓鱼的地方

目标：镜湖（湖心 (2,114)，椭圆半径 rx=22、rz=16，水面 y=-0.45）看起来像一片安静的山间湖。码头尽头可以钓鱼，湖边还有两处钓点。

只改 `src/zones/lake.ts`，保留导出 `lake: ZoneBuilder`。现有的 `fishingSpot(...)` 和 `critterField(...)` 调用要保留，最后的 update 把所有 update 合并起来。可用接口见 `src/zones/types.ts`、`src/zones/kit.ts`、`src/world/map.ts`（`LAKE`、`lakeEdge`、`pathDistance`），只读。

做法：
1. **水面**：现在是一张平的半透明椭圆，换成好看一点的。
   - 浅水到深水的颜色渐变：用顶点色，或者两层不同透明度的椭圆。
   - 沿岸一圈浅色泡沫环。
   - 几片荷叶，名字带 `leaf`，不参与碰撞。
   - 荷叶上开 2–3 朵荷花，名字带 `flower`。
   - 水面上的东西名字都要带 water / leaf / flower / fx，这样不会被当成实心。
2. **码头**：保留位置和高度（甲板顶面 y≈0.1，从南岸伸进湖里）。
   - 加木栏杆，只做两侧的一半长度。
   - 尽头加一盏挂灯和一个放鱼的木桶。
   - 甲板用 3–4 种深浅不同的木板拼起来，用 InstancedMesh。
3. **新增两个钓点**：用 `fishingSpot(z, id, stand, toward, 'lake')`。
   - `stand` 是岸边站的位置，要在岸上，`lakeEdge` 约 1.1–1.2。
   - `toward` 是朝湖心方向的单位向量（x, z）。
   - 东岸一个，在大石头上；西岸一个，在一截倒下的树干旁。
   - id 分别是 `fish-east`、`fish-west`。
   - 每个钓点旁边放一块小木牌（用 `signpost`）。
4. **湖边**：
   - 芦苇丛 6 簇，名字带 `grass`。
   - 大小石头若干。大石头是实心的，可以站上去；小卵石名字带 fx。
   - 一座小木亭在北岸，实心，可以爬上屋顶。
   - 2 张长椅。
   - 原有的树保留。
5. 用 `z.toon` 材质，重复物件用 Instanced。新增网格 < 100。

不许做：改其他文件、加贴图文件、挡住南岸从公园来的路 (2,80)→(2,94)、改码头位置。

验收：`npm run check`、`npm test` 通过。
