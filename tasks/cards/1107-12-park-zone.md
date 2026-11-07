---
agent: codex
model: gpt-6-astra
effort: low
files: src/zones/park.ts
checks: check,test
---
# 风车公园：场景 + 两个常驻小玩法

目标：从港口广场往北走进公园，第一眼看到一座会转的风车和一片能玩的游乐场。弹跳蘑菇可以把史莱姆弹上天，环形跑酷可以计时、刷新纪录。

只改 `src/zones/park.ts`，要保留现有导出 `export const park: ZoneBuilder`，也要保留现有的 `critterField(...)` 调用（把它的 update 和你新写的 update 合在一起返回）。

可用接口（只读，不许改）：
- `src/zones/types.ts`：`ZoneContext`，常用的有 `T`、`ground(x,z)`、`rand()`、`toon(color, opts)`、`interact(...)`、`life`、`save()`；`PlayerHandle`，常用的有 `position`、`velocity`、`grounded`、`launch(v)`、`toast(text)`、`mood(m)`。
- `src/zones/kit.ts`：`signpost`、`trees`、`fence`、`tufts`。
- `src/world/map.ts`：`pathDistance(x,z)`。公园范围是 x∈[-30,31]、z∈[30,80]。土丘在 (20,64)，半径约 10 m，高 3.2 m。

做法：
1. **风车**：放在土丘顶 (20, ground, 64)。石砌塔身（截锥，约 5 m 高）+ 尖顶 + 4 片扇叶，扇叶每秒转约 0.6 圈。扇叶组命名为 `windmill-blades-fx`，名字带 fx 就不参与碰撞。塔身是实心的，可以爬。
2. **弹跳蘑菇** ×5：散布在 x∈[-20,0]、z∈[40,60]，可以错开高度做成一串。菌柄是实心的；菌盖是扁的半球，颜色要鲜艳。在 update 里判断：玩家脚下距离菌盖顶面 0.25 m 以内、水平落在菌盖半径内、并且 `velocity[1] <= 0` 时，调用 `player.launch([vx, 9.5, vz])` 把它弹起来（vx/vz 保留玩家原来的水平速度），同时让菌盖做一次 0.25 s 的压扁回弹动画。用 `player.mood('Happy')`。
3. **环形跑酷**：沿公园外圈摆 8 个竖立的圆环（torus，半径约 1.2 m，名字带 fx，不参与碰撞），环心高 1–3.5 m 错落，其中至少 2 个要靠弹跳蘑菇或爬树才能穿过。起点是一块踩上去会亮的石板。
   - 玩家穿过第 1 个环开始计时；按顺序穿过，下一个环会发光（emissive）。
   - 穿过最后一个环停止计时，`player.toast` 显示用时。
   - 用 `z.life.records['park-rings']` 保存最好成绩（毫秒，越小越好），破纪录时提示“新纪录！”，然后调用 `z.save()`。
   - 60 秒没穿下一个环就重置。
   - 用 `z.interact` 在起点石板放一个提示：标题“环形跑酷”，副标题写最好成绩或“还没有纪录”；`act` 留空。
4. **游乐场装饰**：
   - 滑梯 1 座，梯子和滑面都是实心的，滑面是可以走的斜面。
   - 秋千架 1 座。
   - 长椅 4 张，路灯 6 盏，沿路摆放。
   - 花坛 2 个：矮砖圈 + 花，花的名字带 flower。
   - 现有的树保留，树数量可以调整，但不要挡住路（`pathDistance > 3`）。
   - 草丛可以换成更好看的形状（保留 `tufts` 也行）。
5. 风格：和港口一样的低多边形卡通风，全部用 `z.toon(...)` 材质，颜色饱和但柔和。重复的物件用 InstancedMesh。整个公园新增的网格数 < 120（Instanced 算 1 个）。

不许做：改其他文件；新增贴图文件或依赖；在 update 里每帧分配大对象（Vector3 可以复用）；挡住 (12,30)→(2,94) 这条主路。

验收：`npm run check`、`npm test` 通过。截图由 Opus 补拍。
