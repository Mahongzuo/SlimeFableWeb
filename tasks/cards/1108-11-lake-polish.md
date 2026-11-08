---
agent: codex
model: gpt-6-astra
effort: medium
files: src/zones/lake.ts
checks: check,test
---
# 镜湖：精细化（对齐凝露港的细节密度）

先读 `docs/art/zone-style.md`（美术规范）和 `src/zones/kit.ts`（已有的树、草、风摆工具），然后只改 `src/zones/lake.ts`。

目标：玩家站在镜湖的任何位置环顾四周，细节密度都接近港口。要有远中近三层，有生活痕迹，风格是中式浙闽渔村。

本卡要加 / 改的内容：
码头加系船柱和绳圈、木箱、渔网架（网名字带 fx）；北岸木亭改成中式六角亭（宝顶、飞檐微翘、美人靠）；东西钓点各加小马扎和水桶；岸边加洗衣石板和两三块踏步石伸进水里；湖边加一条小木栈道。保留 lake-water.ts 的镜面水。

通用要求：
- 保留文件里现有的导出、玩法调用、交互点 id 和坐标。
- 新增物件尽量用 InstancedMesh，整个文件的 draw call 控制在 80 以内。
- 可穿过的物件按规范命名，可攀爬的结构要有厚度。
- 不许改其他文件，不许加贴图文件或依赖，不许出现日文或旗帜。

验收：`npm run check`、`npm test` 通过。Opus 会把截图和港口并排对比。
