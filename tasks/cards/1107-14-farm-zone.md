---
agent: codex
model: gpt-6-astra
effort: low
files: src/zones/farm.ts
checks: check,test
---
# 梯田农场：场景美化

目标：西边的梯田要像一片温暖的小农场：石头挡土墙、谷仓、风向鸡、稻草人，地块边上有矮篱笆。玩法已经接好了，这张卡只负责好看。

只改 `src/zones/farm.ts`，保留导出 `farm: ZoneBuilder`。以下部分**不能改位置和数据**：9 块地的 `plots`（坐标和 id）、`farmLoop(...)` 和 `critterField(...)` 的调用、收购站坐标 `stall`。可用接口见 `src/zones/types.ts`、`src/zones/kit.ts`、`src/world/map.ts`（`TERRACE`、`inland`、`pathDistance`），只读。

做法：
1. 挡土墙（`terrace-wall`）从光滑盒子换成石块墙：
   - 用 InstancedMesh 摆不规则大小、颜色略有深浅的石块。
   - 外形尺寸和现在的盒子一致。
   - 路口缺口的位置不能变。
   - 缺口处加 4–6 级石阶，阶高 ≤ 0.3 m，实心。
2. 谷仓：
   - 红墙白边，人字顶，放在第 4 层梯田上，x 约 -77、z 约 15。
   - 大门敞开，里面有草垛。
   - 屋顶可以爬上去。
3. 地块装饰：
   - 每块地四周加一圈矮木框，高 0.15 m，可以走上去。
   - 每层梯田放 1 个稻草人。
   - 加一辆小推车、一个水井（实心，水面名字带 water），以及 1 座风向鸡杆（鸡名字带 fx，绕 y 轴慢慢摆动；这需要你自己在返回的 update 里加，和原 update 合并）。
4. 收购站和种子铺两个摊位：
   - 现在是两个盒子，换成木摊。
   - 收购站挂一块写“收购站”的牌子，种子铺挂“种子铺”。
   - 牌子用 `signpost` 或者自己的 canvas 贴图都可以。
   - 遮阳篷名字带 fx 或者设 `userData.walkThrough=true`。
5. 草丛和花保持不参与碰撞。整个农场新增网格数要少于 120。

不许做：改其他文件、加贴图文件、改地块坐标、挡住路。

验收：`npm run check`、`npm test` 通过。
