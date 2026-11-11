---
agent: codex
model: gpt-6-astra
effort: medium
files: src/themes/ellis.ts
checks: check,test
---
# 主题套件：埃利斯岛 1954（关卡 1112 · 1954）

先读 `src/themes/minguo.ts`，照它的做法写：在 `plainKit` 返回的 kit 基础上，先调用原来的 build 拿到 handles 原样返回，再往场景里加装饰。然后读 `docs/art/zone-style.md`。只改 `src/themes/ellis.ts`，导出名 `ellisKit` 不变。

目标：一眼看出是 1950 年代的纽约港埃利斯岛移民站。整体是红砖墙配石灰岩装饰，铜绿色的圆顶；天气阴冷，有点萧索，像最后一天的样子。

按 `layout.lots`、`layout.props` 摆放：
- **建筑**：有门的建筑做成红砖立面，窗框、檐口、转角石都用浅色石灰岩。最大的一栋屋顶四角各加一座小塔，塔顶是铜绿色洋葱圆顶，这是主楼的标志。门口有拱形入口和雨棚。
- **场地**：广场一侧加一段码头岸线、系船柱、铁栏杆，以及一盏老式双头路灯。
- **生活痕迹**：
  - 长椅、行李推车、几只旧皮箱（fx）。
  - 墙上挂“移民站”英文旧招牌，只放一块：用 canvas 写 “ELLIS ISLAND — IMMIGRATION STATION”，下面一行小字中文“埃利斯岛移民站”。
  - 门口贴一张告示：“本站将于 1954 年 11 月 12 日关闭”。
- **远景**：场地外围是灰蓝色海面，用平面水体，名字带 water。远处有一个曼哈顿天际线剪影，用一排高低不同的深灰盒子，名字带 fx，放在 60 m 外。

不许做：新增碰撞盒，改 `layout`，引入贴图文件或依赖，出现日文。整关新增网格数 < 150，重复的东西用 InstancedMesh。

验收：`npm run check`、`npm test` 通过。
