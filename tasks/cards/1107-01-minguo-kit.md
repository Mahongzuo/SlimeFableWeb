---
agent: codex
model: gpt-6-astra
effort: low
files: src/themes/minguo.ts, src/themes/index.ts
checks: check,test
---
# 主题套件：民国上海（minguo-shanghai v2）

目标：让 1920 关的街区一眼看出是民国上海的石库门里弄，而不是普通方盒子。

做法：
1. 新建 `src/themes/minguo.ts`，导出 `minguoKit: ThemeKit`。**在 `plainKit` 的基础上扩展**：先调用 plainKit 的 build 拿到 handles 原样返回，再往场景里加装饰。不要复制 plain.ts 的代码。
2. 装饰按 `layout.lots`、`layout.props` 摆放，全部用 `stage.toon(...)` 材质和 `stage.add(...)` 加入，保证和港口一样有墨线描边：
   - 每栋有门的房子：石库门门框（门两侧石柱 + 门楣上的三角或弧形山花），颜色用浅石灰色。
   - 坡屋顶：屋脊加一条深色脊线，山墙一侧加一小段封火墙。
   - 窗：给 plain 已有的窗加两扇木百叶（开着，偏 15°）。
   - 小巷上空（相邻两栋之间的空隙，y≈3.6）：一根竹竿晾衣杆，挂 2–3 块布（薄平面，颜色素净），不参与碰撞。
   - 部分门口挂一盏红灯笼（球体 + 两端小圆柱），每 3 栋最多 1 盏。
3. 在 `src/themes/index.ts` 里把 `'minguo-shanghai'` 改为使用 `minguoKit`，`look` 和配色沿用现在的值。
4. 不要新增碰撞盒，不要改 `layout`，不要引入新的依赖或贴图文件；canvas 生成的贴图可以用。

验收：`npm run check`、`npm test` 通过；装饰数量与房子数量相当（每栋 < 40 个网格），不能让帧率明显下降。
