---
agent: codex
files: tasks/cards/home-meadow-orchard.md, src/home/foliage/bamboo-ism.ts, src/home/foliage/foliage-atlas.ts, src/home/foliage/grass-ism.ts, src/home/foliage/meadow-field.ts, src/home/foliage/orchard-trees.ts, src/home/foliage/tree-ism.ts, src/home/garden-stage.ts, src/home/frontier.ts, src/home/builder.ts, src/home/garden-regions.ts, src/world/island-coast.ts, src/world/expansion.ts, src/world/terrain-mesh.ts, src/zones/kit.ts, src/zones/park.ts, src/zones/farm.ts, src/zones/forest.ts, src/zones/harbor.ts, src/zones/lake.ts, src/game/graphics.ts, src/home/orchard.ts, src/home/orchard-navigation.ts, src/life/orchard.ts, src/life/state.ts, src/life/catalog.ts, src/ui/build-ui.ts, src/ui/orchard-ui.ts, src/ui/orchard.css, src/ui/game-ui.ts, src/ui/ui.css, src/ui/guide-catalog.ts, src/game/game.ts, src/slime/character.ts, tests/home-meadow-field.test.ts, tests/home-orchard.test.ts, tests/home-orchard-needles.test.ts, tests/home-orchard-navigation.test.ts, tests/meadow-upgrade-and-night.test.ts, scripts/qa-home-orchard.py, scripts/qa-orchard-needles.py, scripts/qa-orchard-navigation.py, qa/evidence/orchard-*.jpg, qa/evidence/orchard-*.json, qa/evidence/orchard-*.webm, tasks/reports/home-meadow-orchard.md, docs/progress.md, docs/session/active.md
checks: check,test,build,catalog:check
---
# 凝露港草甸与果园

按定稿分工派发与验收。保留共享工作区已有修改。

1. 草甸。按 meadow 原项目三叶草、8 米分块、近密远疏、混生花带和分区植被制作，全港与四类扩建地使用实际地表，随铺地和建筑更新。正常接地压草，空中解除。森林增加橡树、杨树与灌木。
   所有默认扩建地在购入和旧档重访时即具备草、花及随坡矮栏，按四种主题制作，留开口与连续可用空地。栅栏段进入结构碰撞与种植选址。修正海岸网格侵入相邻地块时的重叠面。
2. 树种。苹果、梨、桃、橡树、杨树、垂柳、银杏，分别有树苗、幼树和成年外形。农场外围有可采的天然苹果树。种子铺买苗、按棵结算、采果入袋，兼容旧档。
3. 园艺。在购地内预览并亲手种或逐棵自动跑动种，使用原版主角和碰撞。栽一棵扣一苗，中断或受阻不吞苗。F/触屏能栽种、采果、停止。3/15/20 分钟成长，采果后 15 分钟再结。
4. 专项授权 game.ts 接入家园园艺与交互入口，character.ts 只授权可被真实输入抢占的移动方向与栽种动作。键盘与触屏 F1 同步。
5. 记录参考与改前场景、草坡、花带、果园、接缝双角度、按画质的性能与存档/流程回归。独立无头浏览器禁用指针锁，运行类型、全量测试、构建和目录检查，补全报告与检查点。视觉手感由用户试玩确认。

6. 实地排查用户截图标出的黑色松针状地面物，旧构建逐层隐藏、同机位确认并移除对应的生成来源，避免影响其他绿植。

可改文件补充：`qa/evidence/orchard-*.webm`，用于保存正常第三人称走、摊开、冲刺和跳跃的连续实录。
