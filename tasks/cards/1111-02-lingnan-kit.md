---
agent: codex
model: gpt-6-astra
effort: medium
files: src/themes/lingnan.ts
checks: check,test
---
# 主题套件：岭南乡村 1866（关卡 1112 · 1866 翠亨村）

先读 `src/themes/minguo.ts`，照它的做法写：在 `plainKit` 返回的 kit 基础上，先调用原来的 build 拿到 handles 原样返回，再往场景里加装饰。然后读 `docs/art/zone-style.md`。只改 `src/themes/lingnan.ts`，导出名 `lingnanKit` 不变。

目标：一眼看出是清末广东侨乡的村落。

按 `layout.lots`、`layout.props` 摆放：
- **镬耳屋**：有门的房子，山墙做成两只“镬耳”形状的高耸弧形封火山墙，用两段弧加厚墙片拼出来。墙是青砖色，墙头有灰塑线脚，正脊带博古或龙船脊的简化形。
- **门面**：门口加趟栊门，就是竖木栏杆横拉门；门楣和门两侧贴红纸。部分门口挂灯笼，每 3 栋最多 1 盏。
- **屋顶**：灰瓦，瓦垄用细长条表现。
- **村景**：
  - 广场附近 1 棵大榕树（实心树干，气根垂下，名字带 leaf/fx）。
  - 1 口水井。
  - 院子边加竹篱笆、晒谷竹匾、鸡笼和 2～3 只小鸡（fx），每户门口放一只水缸。
- **远景**：场地外围用低矮的稻田台地和几丛竹子收边，不参与碰撞，名字带 grass/leaf/fx。

不许做：新增碰撞盒，改 `layout`，引入贴图文件或依赖，出现日文。整关新增网格数 < 150，重复的东西用 InstancedMesh。

验收：`npm run check`、`npm test` 通过。
