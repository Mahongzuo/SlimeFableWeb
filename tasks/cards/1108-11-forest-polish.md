---
agent: codex
model: gpt-6-astra
effort: medium
files: src/zones/forest.ts
checks: check,test
---
# 松果林：精细化（对齐凝露港的细节密度）

先读 `docs/art/zone-style.md`（美术规范）和 `src/zones/kit.ts`（已有的树、草、风摆工具），然后只改 `src/zones/forest.ts`。

目标：玩家站在松果林的任何位置环顾四周，细节密度都接近港口。要有远中近三层，有生活痕迹，风格是中式浙闽渔村。

本卡要加 / 改的内容：
树屋做成竹木结构（竹栏杆、茅草或青瓦小顶）；溪边加石板桥和小水车（轮子慢慢转，名字带 fx）；林间加护林员小木屋（实心）、木柴堆、松果堆（fx）、蘑菇；倒木上长苔藓（颜色块）；林道加木头指路牌（中文：“往东·凝露港” 等）；夜里萤火虫多的地方加两盏石灯笼（中式，矮）。保留 critterField 调用。

通用要求：
- 保留文件里现有的导出、玩法调用、交互点 id 和坐标。
- 新增物件尽量用 InstancedMesh，整个文件的 draw call 控制在 80 以内。
- 可穿过的物件按规范命名，可攀爬的结构要有厚度。
- 不许改其他文件，不许加贴图文件或依赖，不许出现日文或旗帜。

验收：`npm run check`、`npm test` 通过。Opus 会把截图和港口并排对比。
