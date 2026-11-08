---
agent: codex
model: gpt-6-astra
effort: medium
files: src/zones/farm.ts
checks: check,test
---
# 梯田农场：精细化（对齐凝露港的细节密度）

先读 `docs/art/zone-style.md`（美术规范）和 `src/zones/kit.ts`（已有的树、草、风摆工具），然后只改 `src/zones/farm.ts`。

目标：玩家站在梯田农场的任何位置环顾四周，细节密度都接近港口。要有远中近三层，有生活痕迹，风格是中式浙闽渔村。

本卡要加 / 改的内容：
谷仓改成中式粮仓/农舍（夯土或红砖墙、青瓦、木窗），门口晒谷场（竹匾里晒玉米、辣椒串挂墙）；稻草人戴斗笠；水井加辘轳；田埂边放竹篓、锄头、水瓢；加一棵大榕树或老樟树作为地标；收购站和种子铺摊位加竹棚、价目牌（中文）。不要改地块、摊位坐标和 farmLoop/critterField 调用。

通用要求：
- 保留文件里现有的导出、玩法调用、交互点 id 和坐标。
- 新增物件尽量用 InstancedMesh，整个文件的 draw call 控制在 80 以内。
- 可穿过的物件按规范命名，可攀爬的结构要有厚度。
- 不许改其他文件，不许加贴图文件或依赖，不许出现日文或旗帜。

验收：`npm run check`、`npm test` 通过。Opus 会把截图和港口并排对比。
