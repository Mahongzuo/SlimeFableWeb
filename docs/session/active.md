# 会话检查点

## 2026-11-25 · 北京时间四季与动态天气

- 在独立家园场景内新增四季、江南纬度的近似日照、昼夜天空、双层云、雾、雨雪、彩虹、湿润与积雪着色。原生建筑、建造预览和玩家放置的同款模型共用材质响应。
- 标题页与暂停菜单可切换自动天气或六种手动天气。自动天气由北京时间确定，历史日期参数用于展出章节。自制天空与气象渲染继续使用项目原有 Three.js 引擎。
- 类型检查、生产构建与 1,523 项测试通过。生产版无头回归通过六门往返、五处钓点、扩建、建造与旧档迁移。
- 季界测试覆盖北京时间零点、闰日、跨时区模拟；无头 Chrome 在美国西海岸时区验证 11 月 30 日到 12 月 1 日在线换季、设置重进与菜单切换。美术与手感待用户试玩。[任务卡](../../tasks/cards/home-climate.md) · [四季实景](../../qa/evidence/home-climate-seasons.jpg) · [雨后彩虹](../../qa/evidence/home-climate-rainbow.jpg) · [夜景](../../qa/evidence/home-climate-night.jpg)

## 2026-11-25 · 凝露港家园独立重建试玩版

- 原版工作区已备份至 GitHub，分支和标签均指向 `146c05d4042f61242fa811468a7e9aa11af5930f`。[可回退标签](https://github.com/Mahongzuo/SlimeFableWeb/tree/backup-before-jiangnan-20261125)
- 新版分支为 `codex/jiangnan-home`。家园从独立河谷场景启动，使用《林栖》自制模型、区域布局和道路数据。出生书埠、水巷钓场、风车公园、梯田农场、镜湖、松果林已接回原有玩法。
- 按 V 进入建造。可接铺原生岸路、选取和移动农床、整组预览并放置小院，也可在本次会话中撤销和重做。旧存档随新版地形首次就位，收藏、作物和设施继续引用原 ID。
- 当前等待用户试玩定稿，重点看出生视线、分区间的步行体验、建筑密度、晴雨和彩虹效果。[玩法与验收记录](../../tasks/reports/jiangnan-home.md) · [家园六处实景](../../qa/evidence/jiangnan-home-regions.jpg)

## 2026-11-24 · 第二阶段 Q1（1–3 月）1/2 号门「岁月拾光」130 关焕新收官！（1–3 月 91/91 天清除 125 关凑数条目，累计 183/366 天达成 1 号门中国 · 2 号门海外）

- **1–3 月全量焕新（移除 125 个凑数关 + 新增 130 个 `chronicle` 关，保留全部既有非凑数原关）**：
  - [chronicle-january.ts](../../content/chronicle-january.ts)（**39 关**：26 中 + 13 外，移除 1 月 37 个凑数关，`17.34 KB gzip`）；
  - [chronicle-february.ts](../../content/chronicle-february.ts)（**49 关**：28 中 + 21 外，含闰日 `0229-2008` 首都机场 T3，移除 2 月 47 个凑数关，`23.33 KB gzip`）；
  - [chronicle-march.ts](../../content/chronicle-march.ts)（**42 关**：26 中 + 16 外，移除 3 月 41 个凑数关，`20.64 KB gzip`）；
  - [registry.ts](../../content/registry.ts) 支持将既有中国史原关（`0104-1951` 史铁生、`0116-1885` 周作人、`0308-1958` 陈锦城、`0310-1924` 金庸、`0319-1939` 东方白、`0320-1881` 章士钊）无损提位至 1 号门，保留全部原链接与存档键；
  - 130 关史料与直达目录归档至 [q1-chronicle-gates.md](../days/q1-chronicle-gates.md)。
- **全量指标与验收**：
  - 全项目达 **366 天、740 个 Web 历史章节、747 条历史记录、1,471 项固定模式挑战**，岁月拾光累计 **221 关**；
  - `npm run check`、`npm run catalog`、`npm run catalog:check`、`npm run build`（所有月度分包 13–23 KB gzip ≤ 60 KB）、`lint-content.mjs`（`lint: 通过`）全通过；
  - [chronicle.test.ts](../../tests/chronicle.test.ts)（221 关 × 40 种子 = 8,840 局仿真）与 [depth-surfaces.test.ts](../../tests/depth-surfaces.test.ts)（221 关顶视+斜视双角度单面共面检测）及全套 `npm test` 全部通过；
  - 无头 Chrome 抽验 6 个代表新关（`0107-2003`、`0116-1605`、`0201-1944`、`0213-1633`、`0301-138`、`0313-1084`）均 `fluid: True`、`done: True`、`errors: []`，多角度证据归档至 `qa/evidence/chronicle-*.jpg`。
- **下一步**：继续推进 **第二阶段 Q2（4–6 月，清理 131 个凑数关：4 月 43 + 5 月 48 + 6 月 40）**，随后收官 **Q3（7–9 月，清理 135 个凑数关，完整保留 `0815-1920` 等手工关）**。

## 2026-11-24 · 10–12 月 1/2 号门「岁月拾光（chronicle）」全量 91 关收官！（全年 366 天双历史门全覆盖，Q4 92/92 天 1 号门中国 · 2 号门海外）

- **全量 91 关补齐（85 关中国史插入 1 号门 + 6 关海外史补入 2 号门）**：
  - [chronicle-october.ts](../../content/chronicle-october.ts)（**31 关**：30 中 + 1 外，`13.46 KB gzip`）；
  - [chronicle-november.ts](../../content/chronicle-november.ts)（**29 关**：28 中 + 1 外，保留 `1112` 原 1 中 4 外不动，`1116-1974` 阿雷西博与 `1123-1963` 神秘博士自动顺移 2 号门原链接/存档零改动，`13.09 KB gzip`）；
  - [chronicle-december.ts](../../content/chronicle-december.ts)（**31 关**：27 中 + 4 外，`14.75 KB gzip`）；
  - 核心模板、8 主题、12 座可动地标与运行时 `chronicle` 分包仅 **`15.78 KB gzip`**，完整 91 关史料表归档至 [q4-chronicle-gates.md](../days/q4-chronicle-gates.md)。
- **全量指标与验收**：
  - 全项目达 **366 天、735 个 Web 历史章节、742 条历史记录、1,471 项固定模式挑战**！
  - `npm run check`、`npm run catalog`、`npm run catalog:check`、`npm run build`、`lint-content.mjs`（`lint: 通过`）全通过；
  - [chronicle.test.ts](../../tests/chronicle.test.ts)（91 关 × 40 种子 = 3,640 局全模式仿真 + 92/92 天门位中外与零重复校验）与 [depth-surfaces.test.ts](../../tests/depth-surfaces.test.ts)（全部 91 关顶视+斜视双角度共面检测）及全套 1,575 项单测全绿；
  - 无头 Chrome 累计实机抽检 12 个代表关（含 `1001/1010/1015/1022/1105/1116/1123/1129/1204/1205/1213/1231`）与 `1015` 凝露港均 `fluid: True`、`done: True`、`errors: []`，证据归档于 `qa/evidence/chronicle-*.jpg`。
- **下一步（按用户选定的选项 2 继续推进）**：1–9 月中已统计出 **391 个公开数据集凑数关**（1 号门 198 关 + 2 号门 193 关，来自纽约爱乐/MoMA 入藏/F1 圈数/NASA 日月食）。待用户确认节奏后按月（1 月 → 9 月）逐步升级替换为「1 号门中国历史 · 2 号门海外经典历史」（保留 `0815-1920` 等手工关与优质原关）。

## 2026-11-24 · 10–12 月 1/2 号门「岁月拾光（chronicle）」Phase 1 底座与 4 个代表样板关完成（1 号门中国 · 2 号门海外）

- **架构与底座**：
  - 新增纯数据轻量程序化模板 [chronicle.ts](../../src/templates/chronicle.ts)（支持 `parkour` 轻跑酷、`gather` 庭院搜集、`relay` 分身连线、`glide` 乘风滑翔巡礼 4 种模式，严格非重叠地面分片防闪烁，内建 `validateChronicle` 40 种子校验）；
  - 新增 8 套程序化场景主题 [chronicle.ts](../../src/themes/chronicle.ts) 与 12 座参数化可动地标 [chronicle-landmarks.ts](../../src/themes/chronicle-landmarks.ts)（`InstancedMesh` 批处理 + Canvas 时代匾额，完整运行时含全部 8 主题 12 地标仅 **`15.76 KB gzip`**）；
  - 新增统一运行时 [chronicle.ts](../../src/level/chronicle.ts) + [chronicle.css](../../src/level/chronicle.css)，沿用凝露港原版 `SlimeCharacter` 流体表面与元素 HUD，途中按进度浮现 3 条「史事微笺」让玩家边玩边了解历史。
- **Phase 1 首批 4 个代表样板关**（[q4-chronicle-gates.md](../days/q4-chronicle-gates.md)）：
  - `1001-1890`（2 号门 · 海外 · `relay` · 优胜美地国家公园设立，原 `design` 升级为 `web`，保留 `1001-1949` 1 号门）；
  - `1015-2003`（1 号门 · 中国 · `parkour` · 神舟五号首次载人飞行，既有 `1015-1997` 自动顺移 2 号门）；
  - `1129-2022`（1 号门 · 中国 · `gather` · 中国传统制茶技艺列入非遗，既有 `1129-1972` 自动顺移 2 号门）；
  - `1213-1642`（2 号门 · 海外 · `glide` 严肃静谧无计时 · 塔斯曼首望新西兰南岛海岸，保留 `1213-1937` 1 号门）。
- **全量验证与多机位证据**：
  - `npm run check`、`npm run catalog`、`npm run catalog:check`（366 天、648 个 Web 章节、655 条历史记录、1,471 项固定模式）、`npm run build`、`lint-content.mjs`（`lint: 通过`）全部通过；
  - `npm test` **1,575 / 1,575 PASS**（含新增 [chronicle.test.ts](../../tests/chronicle.test.ts) 40 种子全模式仿真与 [depth-surfaces.test.ts](../../tests/depth-surfaces.test.ts) 顶视/斜视双角度单面共面回归）；
  - 独立无头 Chrome（[qa-chronicle.py](../../scripts/qa-chronicle.py)）对 4 关 + `1015` 凝露港完成消幕后常规/贴地斜看/终场三机位截图并全部 0 报错通过（`qa/evidence/chronicle-*.jpg`）。
- **下一步**：待用户试玩 4 个样板关并确认画面、手感与节奏；确认后按 Phase 2（10 月 29 关）→ Phase 3（11 月 28 关）→ Phase 4（12 月 30 关）铺满全部剩余 87 关，达成 10–12 月 92/92 天「1 号门中国 · 2 号门海外」。

## 2026-11-24 · 全年 366 天四扇门大满贯收官！（十一月 120 关 + 十二月 124 关全部补齐，中国：海外 = 3：1）

- **十一月全月补齐（30 天 / 120 关）**：新增 [november-four-gates.md](../days/november-four-gates.md)、[november-pilots.ts](../../content/november-pilots.ts)（`42.16 KB gzip`）及 [november-defense.ts](../../src/templates/november-defense.ts)、[november-match.ts](../../src/templates/november-match.ts)、[november-skirmish.ts](../../src/templates/november-skirmish.ts)、[november-rpg.ts](../../src/templates/november-rpg.ts)（新增 118 关，完整保留 `1116` 三号门阿雷西博塔防与 `1123` 四号门神秘博士三消及二号门往期投射/试炼原存档键；全月 90 中国 + 30 海外 = 3 : 1，保留原 34 个十一月 Web 章节）。
- **十二月全月补齐（31 天 / 124 关）**：新增 [december-four-gates.md](../days/december-four-gates.md)、[december-pilots.ts](../../content/december-pilots.ts)（`48.23 KB gzip`）及 [december-defense.ts](../../src/templates/december-defense.ts)、[december-match.ts](../../src/templates/december-match.ts)、[december-skirmish.ts](../../src/templates/december-skirmish.ts)、[december-rpg.ts](../../src/templates/december-rpg.ts)（全月 93 中国 + 31 海外 = 3 : 1，保留原 31 个十二月 Web 章节）。
- **全年大满贯总指标**：全年 **366 天（含闰日 0229）、644 个 Web 历史章节、652 条历史记录、1,471 个固定模式挑战**全部贯通！全部非豁免分包均严格 ≤ 60 KB gzip（各月单模板 `2.2–6.7 KB gzip`）。
- **全量验证与消幕后视觉证据**：
  - `npm run catalog`、`npm run catalog:check`、`npm run check`、`npm run build`、`lint-content.mjs`（`lint: 通过`）全部通过；
  - `npm test` **1,572 / 1,572 PASS**（0 失败，覆盖全年 366 天 × 40 种子全模式仿真、全 644 章节与全部特例回港门校验）；
  - 无头 Chrome 在消幕后（`stage.time >= 2.0`，`uFade = 1.0`）完成 11 月 8 关 + `1116`/`1123` 港口验证（`qa/evidence/nov-full-*.jpg`）与 12 月 8 关 + `1231` 除夕港口验证（`qa/evidence/dec-full-*.jpg`），全部 0 报错、清晰无白幕。
- **下一步（进入“后优化”阶段）**：按用户规划，全 366 天基础闭环已完成，后续可集中发力**场景视觉差异化与关卡玩法特色升级**（例如按题材动态生成标志性 3D 剪影地标、差异化场地材质/天空盒/天气粒子、扩充塔防/交火/RPG 机关与敌人变体等）。

## 2026-11-24 · 九月全月 30 天四扇门补齐（新增 120 关，中国：海外 = 3：1）

- **九月设计总表与注册**：新增 [september-four-gates.md](../days/september-four-gates.md) 与 [september-pilots.ts](../../content/september-pilots.ts)（含 9 月 1 日至 30 日全部 **120 关**，严格按每日 3 关中国历史 + 1 关海外历史编排，总计 **90 关中国 + 30 关海外 = 3 : 1**；全带权威 `https://` 史料，且与九月既有 60 个历史章节及全年其他月份零重复）。连同工作区中同步合入的十月，**一至十月连续 305 天**固定模式门已全部贯通，全项目现含 **366 天、644 个 Web 章节、1,229 个固定模式挑战**。
- **四套九月模板与自动分包**：新增 [september-defense.ts](../../src/templates/september-defense.ts)（5.35 KB gzip）、[september-match.ts](../../src/templates/september-match.ts)（6.15 KB gzip）、[september-skirmish.ts](../../src/templates/september-skirmish.ts)（6.01 KB gzip）、[september-rpg.ts](../../src/templates/september-rpg.ts)（3.98 KB gzip），`september-pilots` 为 40.51 KB gzip，全部非豁免 chunk 均严格 ≤ 60 KB gzip。
- **全量验证与消幕清晰版实机证据**：`npm run catalog`、`npm run catalog:check`、`npm run check`、`npm test`（**1,391 / 1,391 PASS**，含 1–10 月全量 40 种子模拟）、`npm run build`、`lint-content.mjs`（`lint: 通过`）全通过；无头 Chrome 在进场淡入完全结束后（`stage.time >= 2.0`，`uFade = 1.0`）抽验 8 个九月代表关（`0901` 京九铁路、`0925` 北京大兴国际机场、`0914` 中国首封电子邮件、`0925` 中国天眼启用、`0923` 广深港高铁动感号、`0930` 杭州亚运百金、`0905` 旅行者 1 号、`0923` 笔尖上的海王星）及 `0925` 凝露港六门 0 报错，清晰无白幕截图已归档至 `qa/evidence/sept-full-*.jpg` 与 `qa/evidence/sept-full-spotcheck.json`。全年剩余最后两个月：**11 月**（需注意保留 `1116` 塔防与 `1123` 三消及旧存档键）与 **12 月**。

## 2026-11-24 · 十月四门

10 月 31 天的 124 个主关已经接入港口、史书和收藏，逐日为三件中国史事和一件海外史事。新增 123 关。10 月 21 日五号门保留《风帆之间》，六号门默认进入《大渡河的蓄水刻度》，也能选择沿用原链接与收藏的《关原雾阵》。该日六号门两项挑战均返回本门。[逐日事实卡和试玩入口](../days/october-four-gates.md) · [验收与证据](../../tasks/reports/october-four-gates.md)

待用户试玩确认画面和手感。11 月和 12 月已有 34 和 31 个可玩历史章节，固定四门仍分别为 2/120 和 0/124。

## 2026-11-24 · 七月全月 31 天四扇门补齐（新增 124 关，中国：海外 = 3：1）

- **七月设计总表与注册**：新增 [july-four-gates.md](../days/july-four-gates.md) 与 [july-pilots.ts](../../content/july-pilots.ts)（含 7 月 1 日至 31 日全部 **124 关**，严格按每日 3 关中国历史 + 1 关海外历史编排，总计 **93 关中国 + 31 关海外 = 3 : 1**；全带权威 `https://` 史料，且与七月既有 62 个历史章节及全年其他月份零重复）。连同工作区中并行合入的六月与八月，**一至八月全 244 天**固定模式门已全部贯通，全项目现含 **366 天、644 个 Web 章节、986 个固定模式挑战**。
- **四套七月模板与自动分包**：新增 [july-defense.ts](../../src/templates/july-defense.ts)（5.45 KB gzip）、[july-match.ts](../../src/templates/july-match.ts)（6.71 KB gzip）、[july-skirmish.ts](../../src/templates/july-skirmish.ts)（6.08 KB gzip）、[july-rpg.ts](../../src/templates/july-rpg.ts)（4.35 KB gzip），`july-pilots` 为 43.25 KB gzip，全部非豁免 chunk 均严格 ≤ 60 KB gzip。
- **全量验证与消幕清晰版实机证据**：`npm run catalog`、`npm run catalog:check`、`npm run check`、`npm test`（**1,207 / 1,207 PASS**，含 1–8 月全量 40 种子模拟）、`npm run build`、`lint-content.mjs`（`lint: 通过`）全通过；无头 Chrome 在进场淡入完全结束后（`stage.time >= 2.0`，`uFade = 1.0`）抽验 8 个七月代表关（`0701` 香港回归、`0727` 北京中轴线、`0703` 中国天眼 FAST、`0707` 福建土楼、`0712` 刘翔洛桑 12.88、`0731` 潘展乐 46.40、`0721` 阿波罗 11 号登月、`0731` 阿波罗 15 号月球车）及 `0731` 凝露港六门 0 报错，清晰无白幕截图已归档至 `qa/evidence/july-full-*.jpg` 与 `qa/evidence/july-full-spotcheck.json`。下一步可继续推进 **9 月份**（或由用户实机试玩确认七、八月画面与手感）。

## 2026-11-24 · 八月全月四扇门

8 月 1–31 日的固定门位均已接通，共 124 关，每天三件中国史事和一件海外史事。新增 123 关；8 月 15 日保留安康号三消、旧存档键，以及二号门的往期投射与试炼。原有 62 个八月 Web 章节可继续从左侧两扇门进入。[逐日事实与试玩](../days/august-four-gates.md)

独立无头浏览器已逐一打开 124 个关卡页面，四种模式各抽一关操作至结算。八月三消有 30 组新编三幕棋盘，运河继续使用逐闸开放的棋盘。下一步由用户在实际设备确认画面、操作和复玩手感。[验收记录](../../tasks/reports/august-four-gates.md) · [8 月 15 日港口](http://127.0.0.1:5190/?date=0815)

## 2026-11-24 · 五月全月 31 天四扇门补齐（新增 124 关，中国：海外 = 3：1）与按月分包、塔防淡入步长修复

- **五月设计总表与注册**：新增 [may-four-gates.md](../days/may-four-gates.md) 与 [may-pilots.ts](../../content/may-pilots.ts)（含 5 月 1 日至 31 日全部 **124 关**，严格按每日 3 关中国历史 + 1 关海外历史编排，总计 **93 关中国 + 31 关海外 = 3 : 1**；全带权威 `https://` 史料且与五月既有 62 个历史章节及六月零重复）。连同工作区同步合入的六月，**一至六月全半年 182 天（728 扇模板门）**均已贯通，全项目现含 **366 天、644 个 Web 章节、739 个固定模式挑战**。
- **按月模板自动分包与塔防渲染修复**：
  - [vite.config.ts](../../vite.config.ts) 升级 `manualChunks` 规则，自动按月拆分 `*-pilots` 与 `(february..december)-(defense|match|skirmish|rpg)` 模板数据，`mode-match` 回落至 **29.55 KB gzip**、各月单模板仅 **2.3–6.6 KB gzip**，为下半年 7–12 月铺平体积上限；
  - [january-defense.ts](../../src/level/january-defense.ts) 将 `scene.stage.render(.016, ...)` 改为传入真实 `dt`，修复低帧率设备下进场 1.2 秒淡入被拉长的问题。
- **四套五月模板接入**：新增 [may-defense.ts](../../src/templates/may-defense.ts)、[may-match.ts](../../src/templates/may-match.ts)、[may-skirmish.ts](../../src/templates/may-skirmish.ts)、[may-rpg.ts](../../src/templates/may-rpg.ts) 并并入对应注册表；修复 `0512` 塔防 `station` 主题匹配 `alternate` 拓扑。
- **验证与清晰版实机证据**：`npm run catalog`、`npm run catalog:check`、`npm run check`、`npm test`（**1,019/1,019 PASS**，含 1–6 月 182 天 × 40 种子全模式仿真）、`npm run build`、`lint-content.mjs`（`lint: 通过`）全通过；无头 Chrome 在进场淡入完全结束后（`stage.time >= 2.0`，`uFade = 1.0`）抽验 8 个五月代表关（`0505` C919、`0515` 天问一号落火、`0511` 咸通九年敦煌雕版、`0522` 禾下乘凉梦、`0504` 武汉长江大桥、`0512` 银心黑洞、`0527` 金门大桥、`0531` 伦敦大本钟）与 `0515` 凝露港六门 0 报错，清晰截图归档至 `qa/evidence/may-full-*.jpg` 与 `qa/evidence/may-full-spotcheck.json`。下一步可无缝推进 **7 月份**（上半年 1–6 月已全部完成）。

## 2026-11-24 · 六月 30 天的四扇门已可试玩

六月共 120 个挑战。6 月 1 日至 30 日逐日校验，每天三件中国史事、一件海外史事。各关有独立来源、目标、收藏与存档键。港口按 3 号塔防、4 号三消、5 号分身交火、6 号战斗 RPG 排列。[六月完整试玩目录](../days/june-four-gates.md) · [6 月 4 日港口](http://127.0.0.1:5190/?date=0604)

独立无头 Chrome 已逐一加载 120 关并检查原版流体角色。6 月 1 日塔防和三消、6 月 4 日分身交火、6 月 30 日 RPG 各完成一次以上通关。下一步由用户在实际设备确认画面与手感。[任务卡](../../tasks/cards/june-four-gates.md) · [技术验收和截图](../../tasks/reports/june-four-gates.md)

## 2026-11-24 · 四月全月 30 天四扇门补齐（新增 120 关，中国：海外 = 3：1）

- **四月设计总表与注册**：新增 [april-four-gates.md](../days/april-four-gates.md) 与 [april-pilots.ts](../../content/april-pilots.ts)（含 4 月 1 日至 30 日全部 **120 关**，严格按每日 3 关中国历史 + 1 关海外历史编排，总计 **90 关中国 + 30 关海外 = 3 : 1**；全带权威 `https://` 史料且与四月既有 60 个历史章节零重复）。`vite.config.ts` 将 `april-pilots` 独立拆包（**35.76 KB** gzip），所有非豁免 chunk 均低于 60 KB gzip。全项目现含 **366 天、644 个 Web 章节、495 个固定模式挑战**。
- **四套四月模板接入**：新增 [april-defense.ts](../../src/templates/april-defense.ts)、[april-match.ts](../../src/templates/april-match.ts)、[april-skirmish.ts](../../src/templates/april-skirmish.ts)、[april-rpg.ts](../../src/templates/april-rpg.ts) 并并入对应月度模板注册表；全部通过 1–4 月共 121 天 × 40 种子全模式仿真验证。
- **验证与证据**：`npm run catalog`、`npm run catalog:check`、`npm run check`、`npm test`（**835/835 PASS**）、`npm run build`、`lint-content.mjs`（`lint: 通过`）全部通过；无头 Chrome 抽验 8 个四月代表关（`0401` 雄安新区、`0429` 天和核心舱、`0417` 法门寺秘色青瓷、`0420` 联合国中文日、`0425` 神舟十八号斑马鱼、`0430` 东海海上发射、`0423` 莎士比亚环球剧场、`0430` 高斯正十七边形）与 `0424` 凝露港六门 0 报错，截图归档至 `qa/evidence/april-full-*.jpg` 与 `qa/evidence/april-full-spotcheck.json`。下一步可按同样结构继续推进五月份（注意后续月份 `mode-match` 已达 44.07 KB gzip，五月起可将月度模板数据按月拆 chunk 或动态加载以持续稳控 ≤ 60 KB）。

## 2026-11-24 · 三月全月 31 天四扇门补齐（新增 124 关，中国：海外 = 3：1）

- **三月设计总表与注册**：新增 [march-four-gates.md](../days/march-four-gates.md) 与 [march-pilots.ts](../../content/march-pilots.ts)（含 3 月 1 日至 31 日全部 **124 关**，严格按每日 3 关中国历史 + 1 关海外历史编排，总计 **93 关中国 + 31 关海外 = 3 : 1**；全部带权威 `https://` 史料且与三月既有 62 个历史章节互不重复）。`vite.config.ts` 将 `march-pilots` 独立拆包（**34.41 KB** gzip），所有非豁免 chunk 均低于 60 KB gzip。全项目现含 **366 天、644 个 Web 章节、375 个固定模式挑战**。
- **四套三月模板接入**：新增 [march-defense.ts](../../src/templates/march-defense.ts)、[march-match.ts](../../src/templates/march-match.ts)、[march-skirmish.ts](../../src/templates/march-skirmish.ts)、[march-rpg.ts](../../src/templates/march-rpg.ts) 并并入对应月度模板注册表；全部通过 1–3 月共 91 天 × 40 种子全模式仿真验证。
- **验证与证据**：`npm run catalog`、`npm run catalog:check`、`npm run check`、`npm test`（**745/745 PASS**）、`npm run build`、`lint-content.mjs`（`lint: 通过`）全部通过；无头 Chrome 抽验 8 个三月代表关（`0301` 国博新馆、`0320` 鹊桥二号、`0314` 割圆木盘、`0320` 三星堆黄金面具、`0312` 海南一箭十八星、`0331` 北京奥运祥云圣火、`0307` 精武木人桩、`0331` 埃菲尔铁塔）与 `0320` 凝露港六门 0 报错，截图归档至 `qa/evidence/march-full-*.jpg` 与 `qa/evidence/march-full-spotcheck.json`。下一步可按同样结构继续推进四月份（维持中 3 : 外 1 配比）或根据用户试玩反馈精修特定日期。

## 2026-11-24 · 二月全月 29 天（含闰日）四扇门补齐（新增 116 关）

- **二月设计总表与注册**：新增 [february-four-gates.md](../days/february-four-gates.md) 与 [february-pilots.ts](../../content/february-pilots.ts)（含 2 月 1 日至 29 日全部 **116 关**，与二月既有 58 个历史章节互不重复、全带权威 `https://` 史料）；`vite.config.ts` 将 `february-pilots` 独立拆包（**29.6 KB** gzip）。全项目现含 **366 天、644 个 Web 章节、251 个固定模式挑战**。
- **多月日期适配**：将 `january-defense.ts`、`january-skirmish.ts`、`january-rpg.ts`、`january-match.ts` 中的抬头月日与纪念印样罗马月份改为按 `spec.day` 动态渲染，完整支持跨月份展示。
- **四套二月模板接入**：新增 [february-defense.ts](../../src/templates/february-defense.ts)、[february-match.ts](../../src/templates/february-match.ts)、[february-skirmish.ts](../../src/templates/february-skirmish.ts)、[february-rpg.ts](../../src/templates/february-rpg.ts) 并分别并入对应月度模板注册表，全部通过 60 天 × 40 种子自动模拟验证。
- **验证与证据**：`npm run check`、`npm test`、`npm run build`、`npm run catalog`、`npm run catalog:check`、`lint-content.mjs` 全通过；无头 Chrome 抽验 8 个二月代表关（含 `0203` 月球 9 号、`0204` 北京冬奥、`0211` LIGO 引力波、`0214` 暗淡蓝点、`0218` 毅力号、`0226` WorldWideWeb、`0210` 深蓝、`0229` 东京晴空塔）与闰日 `0229` 港口 6 扇时光门 0 报错，截图归档至 `qa/evidence/february-full-*.jpg`。下一步可按同样结构继续推进三月份或根据用户试玩反馈精修特定日期。

## 2026-11-24 · 一月全月 31 天四扇门（3/4/5/6 号门）全量补齐

- **内容与注册**：[january-pilots.ts](../../content/january-pilots.ts) 已按 [一月四扇门设计卡](../days/january-four-gates.md) 补齐 0102–0113、0115–0130 共 28 天 × 4 门 = **112 关**，连同 0101、0114、0131 原有 12 关，一月全月 31 天 **124 扇模板门** 全部可玩；全项目共 **366 天、644 个 Web 章节、135 个固定模式挑战**。
- **3 号门 · 塔防**（`src/templates/january-defense.ts`、`src/themes/january-defense.ts`、`src/level/january-defense.ts`）：在原 `parade` / `station` / `eclipse` 基础上扩展 `harbor` / `lunar` / `workshop` / `ice` / `airship` / `rail` / `orbital` / `ocean` 八类程序化主题与 6 套数学验证路线拓扑，31 天 × 40 种子全零损通关、无人布防必败。
- **4 号门 · 三消**（`src/templates/january-match.ts`、`src/themes/january-match.ts`、`src/level/january-match.ts`、`src/templates/mode-match.ts`、`src/level/mode-match.ts`）：补齐 0102–0130 全部 30 关异形三幕棋盘（支持清除与纵横压印双机制）、8 类 3D 展示台与程序化纪念印样，31 天 × 40 种子（1,240 局）真实交换与加演全通。
- **5 号门 · 分身交火**（`src/templates/january-skirmish.ts`、`src/themes/january-skirmish.ts`、`src/level/january-skirmish.ts`）：补齐 31 天双路交火地图与 7 类主题场景（`air`/`sport`/`facade`/`space`/`workshop`/`maritime`/`court`），全部通过 40 种子拼缝平滑度与靶点高度验证。
- **6 号门 · 战斗 RPG**（`src/templates/january-rpg.ts`、`src/themes/january-rpg.ts`、`src/level/january-rpg.ts`）：补齐 31 天战斗配置与 7 类主题场馆（`ice`/`stage`/`field`/`cosmos`/`atelier`/`expedition`/`court`），31 天 × 双路线 × 40 种子全通，原有 `ice`/`stage`/`field` 完全兼容。
- **体积与验证**：`vite.config.ts` 将 `january-pilots` 独立拆包（29.9 KB gzip），所有非豁免 chunk 均满足 ≤ 60 KB gzip；`npm run check`、`npm test`（**565/565 PASS**）、`npm run build`、`npm run catalog`、`npm run catalog:check`、`lint-content.mjs` 全部通过；无头 Chrome 抽验多日新主题关卡与 0102 港口六扇门 0 报错，截图归档至 `qa/evidence/january-full-*.jpg`。下一步待用户实机试玩一月新增日期并确认画面与手感。

## 2026-11-23 · 一月四门收工

3 塔防、4 三消、5 分身交火、6 战斗 RPG 是每日固定门位。《冰场最后一轮》为元旦六号门冰球主题的动作 RPG。港口、史书和一月 RPG 关内均展示模式名。[三个代表日的试玩入口](../progress.md#一月四扇门)

一月 124 张设计卡、逐日草图、来源及模型清单已齐。0101、0114、0131 的 12 关开放（11 个新增、1 个保留）。其余 28 天 112 关已有设计，留待后续逐日制作。一月原有 62 个历史章节保留。下次先听玩家对三个代表日，特别是体育题材六号门的画面与操作反馈，再取 0102 四张卡。后续批次依次为 02–08、09–13 加 15–16、17–23、24–30 日。[设计总表](../days/january-four-gates.md) · [技术验收与已知限制](../../tasks/reports/january-four-gates.md)

11 月 16 日阿雷西博塔防占三号门；既有章节与旧投射、试炼分别由一、二号门接待。五号门命中活敌人的分身会爆裂，原生第三人称镜头已增加接地高度平滑。下次试玩先看[本轮验收与证据](../../tasks/reports/1116-defense.md)，由玩家确认货舱楼梯舒适度、纸带抉择和手动发信的体验。

10 月 21 日两关现以鼠标右键闪避，Alt 备用。两场战斗已在出发页、门前、史书及纪念品加入同源的「事件始末」，介绍国家与阵营、人物、当日经过和后续。用户决定先玩这两关，再决定其他日期的推广。

10 月 21 日五、六号门已从短遭遇扩为完整任务。继续时先看[双船与关原报告](../../tasks/reports/1021-campaign.md)、[任务卡](../../tasks/cards/1021-campaign.md)和逐日总表的 1021。实机复测用 qa-battle-fleet-play.py、qa-battle-rpg-campaign.py 和 qa-battle-lock-live.py。请记录玩家首次航行用时、是否自行找到铺位捷径，以及能否从动作读出守将追击，再决定怎样调节节奏。

三消通关自动入册，可携余步再加 3 步继续冲分。冲分有效交换有 10% 机会在空闲棋面标出沙漏，消除该格加 2 步，每局最多出现两枚。「近十局」按得分排列本日期最近十次有过有效交换的对局，正式与练习分别保存在本机。


三消棋盘显示目标完成数、得分、本日期正式或练习最佳分与已入册通关次数。最佳分每次有效交换即时写入本机存档。

> 每次收工更新。下次开工先读这里，再读最近的 `tasks/reports/`。

## 2026-11-23 · 塔防 / 分身交火射击 / 战斗 RPG 三模式全方位体验与趣味性升级

- **共享视听与打击感底座（零侵入 `src/slime/` 与 `src/game/game.ts`）**：
  - [combat-audio.ts](../../src/level/combat-audio.ts)：基于 WebAudio 的零依赖程序化合成音效引擎（含并发节流与持久静音开关），覆盖塔防建塔/升级/反应/Boss 号角、射击开炮/Hitmarker/爆桶/铜钟、RPG 挥砍/闪光预警/完美闪避/破韧处决/战鼓全套音效；
  - [combat-juice.ts](../../src/level/combat-juice.ts)：对象池化 3D 伤害飘字与元素反应徽章、Trauma 镜头微震与打击顿帧（尊重 `prefers-reduced-motion`），以及零 Z-fighting 的 3D 地面攻击预警贴花池（扇形横扫/长条直刺/扩散震波红毯）。
- **3 号门 · 史莱姆塔防（`1116-defense`，`src/templates/defense.ts`、`src/themes/defense.ts`、`src/level/defense.ts`、`defense.css`）**：
  - 兼容原版全部 11 项旧单测（`enhanced` 可选开关，实战默认开启）；新增 3 类战术地形格（⚡信号增幅格/❄液冷散热槽/✧聚露泉眼，绘入单张棋盘纹理零闪烁）、Lv.1→Lv.3 塔升级觉醒与 3D 进化外观、修理与 60% 拆解返露、全 6 元素反应闭环（蒸发/感电/扩散/超载/侵蚀/破甲）、主角「史莱姆指挥官」3×3 共鸣支援炮、1×/2× 倍速、整备期提前迎敌奖露、掉落凝露结晶磁吸拾取、右侧 3D 刷怪预警光柱、第 4 波谐振盾体与第 8 波关底 Boss「失谐母体」及顶部 Boss 血条/护盾条与结算 MVP 战报。
- **5 号门 · 分身交火射击（`1021-skirmish`，`src/level/skirmish-fx.ts`、`battle-enemies.ts`、`battle-preview.ts`、`battle-preview.css`）**：
  - 升级动态四向十字准星（后坐力扩缩 + 5 格青色分身弹药槽 + 命中/暴击 Hitmarker + 空弹回收提醒）、6 元素分身差异射击（水洼减速/火溅射/雷水洼闪电链/风凌空截弹反伤/暗黑雾易伤/岩破盾）、头部与外露帆结弱点暴击（×1.45）、双船 11 处可射击战术道具（火药桶连环爆/船舷铜钟震晕/凝露补给桶回血回能）、3D 航海航点光柱与距离指针、船首像守卫二阶段「五连扇射 + 可击爆追踪炽焰弹」与顶部 Boss 血条、战绩评分卡。
- **6 号门 · 关原战斗 RPG（`1021-rpg`，`src/templates/rpg-build.ts`、`src/themes/battle-field.ts`、`src/level/battle-enemies.ts`、`battle-preview.ts`）**：
  - 新增敌人可视化金色韧性条（Poise）与破韧失衡 `F · ⚔ 处决重击`、3D 地面红毯预警与 0.25s 武器闪光提醒音、动态 Style Rank 连击评级（D→SS，含回能与全伤加成）、雾口与山道两次三选一「6 大关原战意印记」构筑体系、随身「凝露葫芦」补给（`H` 键）、可敲响破护旗庇护的 2 座战地大鼓、风系可卷起烈焰扩散的 3 座火盆、西路补给箱与东路高坡先手旗台、阵旗守将二阶段「松尾山变阵」与地面旗阵震波及顶部 Boss 双条。
- **验证与证据**：`npm run check`、`npm test`（**463/463 PASS**，含新增 `tests/defense-enhanced.test.ts` 与 `tests/rpg-build.test.ts`）、`npm run build`、`npm run catalog:check` 全通过；无头 Chrome 0 报错验证并留存 7 张证据图至 `qa/evidence/upgrade-*.jpg`。下一步交由用户实机试玩确认画面与手感。

## 2026-11-23 · 可扩展「玩法教程」手册（开始界面 & ESC 暂停菜单）

- **数据驱动可扩展教程目录**（`src/ui/guide-catalog.ts`）：按 `GuideSection` 结构化收录全项目 6 大玩法模块（移动/形态/滑翔伞、六属性 ARPG 战斗与反应、农田种植与 32 种作物、家园建造与无限领土扩建、生态来客/钓鱼与手账、历史上的今天与六扇时光门）。提供 `BUILTIN_GUIDE_SECTIONS` 与运行时动态注册接口 `registerGuideSection(section)`，未来新增 ARPG 副本、Boss 或其他玩法无需修改任何 UI 代码即可自动纳入目录并按 `order` 排序。
- **双入口教程弹窗与状态闭环**（`src/ui/game-ui.ts`、`src/ui/ui.css`、`src/game/game.ts`）：在游戏开始标题界面和 ESC 暂停菜单均增加 **「📖 玩法教程」** 入口，采用绘本双栏布局（左侧模块目录 + 右侧按键条/功能卡/技巧提示 + 上下章翻页），关闭或按 `Esc` 精准返回进入前界面（标题页或暂停菜单）。
- **验证与证据**：`npm run check`、`npm test`（**427/427 PASS**，含新增 `tests/guide-catalog.test.ts`）、`npm run build` 全通过；无头浏览器验证标题页/暂停菜单双入口开关与 `Esc` 状态回退 0 报错，截图已归档至 `qa/evidence/guide-modal-combat.jpg`。

## 2026-11-23 · 农田防穿模 × 6属性 ARPG（E/R/Q 技能与11种元素反应）× 1秒切换冷却与HUD美化 × DreamWorld 无限扩建

- **修复自建农田碰撞穿模**（`src/home/build-catalog.ts`）：将 3 款自建农田（木框/石砌/大型田垄）设为 `solid: true`，生成与外框 1:1 严丝合缝的实体碰撞盒（高度 `0.36–0.38m` 高于 `0.32m` 自动踏步阈值），平地走近外墙严格阻挡穿模，轻跳可站上田面。
- **二次元 ARPG 战斗体系与 HUD 升级**（`src/slime/skills.ts`、`skill-vfx.ts`、`combat.ts`、`character.ts`、`src/ui/game-ui.ts`、`ui.css`、`src/game/game.ts`）：
  - 6 属性职业定位 × 18 套 E/R/Q 技能（水·控场法师 / 风·高速刺客 / 火·爆破法师 / 雷·链式雷法 / 暗·领域召唤 / 物·重装破韧）及全套 3D 特效（投射物、水穹顶、龙卷旋风、天雷柱、闪电链、火柱阵、黑洞领域、高空陨石、剑气波、地震碎石）；
  - 完整 11 种 UE 元素反应（蒸发/感电/超载/扩散/余烬/虚空震/墨潮/破韧），风车公园边缘新增 3 座带血条与元素附着标签的练功木靶，技能同样联动农田交互；
  - 新增 **1.0 秒全局属性切换冷却** 防止秒切连发技能；重构底部属性栏彻底修复文字溢出边框问题，并加入冷却遮罩倒计时与右下角 E/R/Q 技能快捷栏（Q 键带元素能量充能环）。
- **DreamWorld 风格无限自由领土扩建**（`src/world/expansion.ts`、`src/home/frontier.ts`、`builder.ts`、`src/ui/build-ui.ts`、`src/life/state.ts`）：
  - 取消 12 块上限，升级为无限整数晶格 `tileKey(gx, gz)` + 焦点动态边疆（实时预览镜头周边 8 块，平移镜头自动刷新）+ 2m 轻量网格；
  - 首块免费，后续封顶 `50 🐚/块`，并提供 **「🏖️ 自由沙盒模式（免费无限扩建）」** 一键开关。
- **验证与证据**：`npm run check`、`npm test`（**413/413 PASS**，含新增 `tests/slime-arpg-and-infinite-expand.test.ts` 4 项单测）、`npm run build`、`npm run catalog:check` 全通过；后台无头 Chrome 0 报错验证并归档 4 张证据图至 `qa/evidence/v3-*.jpg`。已更新 `dist/`，下一步待用户实机试玩验收。

## 2026-11-23 · UE 6属性刀光 × 作物元素摧毁与32种作物 × 可摆农田 × DreamWorld 领土扩建

- **UE 6 属性刀光特效**（`src/slime/slash-vfx.ts`、`combat.ts`、`character.ts`）：按 `USlimePathSwordComponent` 参数实现 4 段连击挥砍弧面丝带（水平双扫 + 斜砍 + 1.30× 终结挑斩与冲击波环）及水/风/火/雷/暗/物 6 套专属 GLSL 纹路与碎屑粒子池，命中窗口通过 `onElementAttack` 广播元素范围判定。
- **元素攻击交互作物 + 32 种 UE 作物 + 可摆放农田**（`src/life/catalog.ts`、`cultivation.ts`、`src/zones/farm-registry.ts`、`src/home/build-catalog.ts`、`builder.ts`、`src/ui/build-ui.ts`）：
  - 扩充至 **32 种 UE 作物**与 6 大差异化 3D 植株造型（叶菜/高秆/藤蔓瓜/灌木果/花穗/根茎菌），按 `F` 对空田弹出 UE 同款「选种面板」（支持一键再种同款），种子铺支持分类筛选与 1/5 包购入；
  - 建造模式新增 **🌱 农田**页签（木框高架农田、石砌防草花床、大型高产田垄）与「田园自耕小菜园」一键景组，建造卡片附带 `🐾 吸引动物` 提示徽章；
  - 攻击挥砍直连全部农田：火砍非喜火作物 1 刀烧毁、水砍怕涝/湿润作物或终结水浪冲毁、雷劈干田、水+火触发「♨️ 蒸汽温室」、水+雷触发「⚡ 雷击催熟 ✨」、风授粉、暗/物增肥清枯，均带 3D 飘字与元素粒子爆发。
- **DreamWorld 风格家园领土扩建**（`src/world/expansion.ts`、`src/home/frontier.ts`、`src/slime/sim.worker.ts`、`character.ts`、`game.ts`）：
  - 在北境、西境与东岬规划 12 块无缝拼接领土（支持二级向外蔓延），首块免费体验、后续逐级消耗贝壳；
  - 建造模式新增 **🗺️ 扩建领土** 页签，提供 3D 绿色虚线边疆预览与连接光环，支持 4 种主题地貌（沃土农庄/江南水乡/林缘牧场/潮汐花岬）与天然生态风物（自动助力吸引动物来客）；
  - 开垦即时动态拼接无闪烁地形与 6m 边缘草色融合，并同步热更新主线程与 `sim.worker.ts` 碰撞面和边界。
- **验证与证据**：`npm run check`、`npm test`（**409/409 PASS**，含新增 `tests/slime-slash-and-farm.test.ts` 10 项测试）、`npm run build`、`npm run catalog:check` 全通过；后台无头 Chrome 0 报错验证并留存 5 张验收截图至 `qa/evidence/`（`v2-slash-fire-water.jpg`、`v2-placed-farm-beds.jpg`、`v2-crop-burn-destroy.jpg`、`v2-expansion-frontier.jpg`、`v2-expansion-seam-closeup.jpg`）。已更新 `dist/`，下一步待用户实机试玩验收。

## 2026-11-23 · 三消特效和按住拖动

三个试玩日的 4 号门支持鼠标和单指拖动，也保留两次轻点与键盘操作。横纹、竖纹、爆芯、虹彩有各自的生成、互换和连锁范围，提示只标出建议的两格。固定练习种子 `prism-26` 能在第一步做出五连。后续复测可用第 6 行第 6 列向下拖，再将虹彩左拖到雷凝露。手势和小屏检查在独立无头 Chrome 中运行，实体手机手感待试玩。[固定练习](http://127.0.0.1:5190/level.html?id=0101-match&practice=prism-26) · [规则、来源和验收](../../tasks/reports/1123-match-rules.md)

## 2026-11-23 · UE 角色手感/钟型/滑翔伞/准星对齐 & 史莱姆家园升级（DreamWorld 预设/自由建造/种植培养/栖地来访）

- **UE 角色 3C 与形态对齐**（`src/slime/`、`src/ui/`）：重构移动与跳跃手感（0.12s 土狼时间、跳跃缓冲、轻跳截断、非对称重力、高速质心弹簧与惯性拉伸）；完整还原 UE `Dome` 钟型裙摆（`ApplyBellFlare` EDT 距离场与圆角收口，按 `8` 键与圆球切换）；复刻 UE `SlimeUmbrellaComponent`（二段跳后按空格撑 6 元素 3D 滑翔伞，0.28s 刹降至 `1.8 m/s`，回程高空分身自动撑迷你伞）；修复过肩瞄准镜头并接入 40m 解析低弧炮弹、`G`/右键双瞄准与 UE 中心四段极简十字准星。
- **史莱姆家园大升级**（`public/models/dreamworld/`、`src/home/model-pack.ts`、`build-catalog.ts`、`builder.ts`、`src/ui/build-ui.ts`、`src/life/cultivation.ts`、`habitat.ts`、`unlocks.ts`）：引入 35 个 DreamWorld 轻量化 GLB 与缩略图；新增 `V` 键家园自由建造模式（贴地预览、旋转/缩放/退壳拆除、3 套一键景组预设与实时动态碰撞同步）；升级梯田可视化种子铺、每日特供稀缺苗、四元素深度培育（水双倍/火暖阳+35%/风授粉金色变异/雷充能洒水泉 12h 保水）、10 种栖地来访动画动物、今日家园手账与 Lv.1–Lv.10 解锁成长树。
- **验证与证据**：`npm run check`、`npm test`（390/390 PASS）、`npm run build`、`npm run catalog:check` 全通过；后台无头 Chrome 0 报错验证并归档 5 张证据图至 `qa/evidence/`（`ue-dome-shape.jpg`、`ue-umbrella-glide.jpg`、`ue-aim-crosshair.jpg`、`home-build-mode.jpg`、`home-journal-habitat.jpg`）。下一步待用户实机试玩确认画面、手感与家园建造体验。

## 2026-11-23 · 三种模式各讲一件史事，修复一月几何闪烁

三个试玩日有九件独立史事。按每个模式的 `storyId`、`source` 和 `saveId` 查表。原试玩地址继续有效。更换题材的六关各用新的通关记录，初版纪念品仍展示原史实。三消加入消除与真实下落动画、反馈音效和持久静音。1 月 1 日三处已知重面用两种角度和实际网格复验，规则已入 AGENTS.md。两个端口均已更新。完整测试 390 项通过；九关可从两种入口出发并通过生产版通关、收藏与回港检查。[新报告](../../tasks/reports/1123-mode-revision.md) · [1 月 1 日港口](http://127.0.0.1:5190/?date=0101)

发布使用 10:31 生成并通过验证的生产构建，之后另一位 Agent 的角色源码仍在变动。后续角色集成可用同种子重放新星图、双馈源和印刷机低道，分别核对移动中投射、实际落点与摊开连击。下一步收集玩家对三消的听感、学习记忆和闪烁修复的实机反馈。

## 2026-11-23 · 三日固定模式与角色并行升级

366 天、644 个历史章节，加 3 个日期共 9 个固定模式。已跑完双入口和九关通关，三天试玩与复述待用户确认。本次到此为止。[11 月 23 日港口](http://127.0.0.1:5190/?date=1123) · [逐项结果及截图](../../tasks/reports/1123-pilot.md)

另一位 Agent 正在改史莱姆形态、射击与移动手感。关卡依赖原生分身位置及阶段、摊开、贴壁、连击命中。发生变化时先用同一正式种子比较稳定版和升级版。当前测试已结束；本机用户反馈自动试玩时光标会跳到左上角。测试脚本已在独立无头页面中禁用指针锁，本轮后续只做命令行检查。下次集成建议先复跑庭院落灯和演播室两条道。

已留存本机生产快照 `C:\Users\admin\AppData\Local\Temp\SlimeFable-pilot-3add6764`，资源指纹 `f04b88f7e6d4744f595f3d202d2f11954b424ed5452c4400eb07dbfbae06e14d`。临时目录可由系统清理；跨机器接手以仓库报告和固定种子为准。

## 2026-11-22 · 全年双入口与 1–9 月每日第二关

当前版本有 366 天、644 个 Web 关。5180 和 5190 的首页、关卡页及资源都来自同一个 dist，旧端口的浏览器存档仍以原键读取。[8 月 4 日港口](http://127.0.0.1:5190/?date=0804) · [能力关逐日设计](../days/second-calendar.md) · [逐关验收](../../tasks/reports/1122-second-calendar.md)。

**收工位置**。总表已提交到本地 main，提交号为 `e820b87`，本轮代码和截图保存在这个共享工作区。明天先读 [逐关结果](../../tasks/reports/1122-second-calendar-results.json) 的 `remaining`，以及 [技术报告](../../tasks/reports/1122-second-calendar.md)。类型检查、361 项测试、生产构建和内容检查均通过。274/274 个第二关已完成浏览器正反例、存档与回港检查，待跑清单为空。凤凰号双门及回港已实机复验。下一次从凤凰号、和平钟的用户试玩反馈接续，再整理关卡实现的版本提交。今晚停在每日两关。

接手时查 [逐日总表](../level-catalog.json) 的 `days[MMDD].chapters`，按数组顺序对应港口。修改章节后运行 `npm run catalog` 和 `npm run catalog:check`。下一批按每天 3–5 关的目标补第三扇门，先查当天已有史事、年份与必需能力。视觉和手感由用户试玩确认。

## 2026-11-22 · 十月秋夜长卷

10 月 2–31 日 30 关已接入 `folio`，10 月 1 日原章未动。桥面、仪式台和台阶的共面闪烁已分开。`npm test` 85 项、`npm run build` 和内容检查通过。试玩在 5191： [10 月 24 日](http://127.0.0.1:5191/level.html?id=1024-2003)。[验收](../../tasks/reports/1122-october.md) · [截图](../../qa/evidence/october-1122.jpg)。下一步等用户看画面和手感。

## 2026-11-22 · 全年日历与一至九月关卡

全年版在 5180 端口。1–9 月新增 273 个历史航道，8 月 15 日继续使用原探索关。第四季度 92 个日期、96 个可玩章节已经接入当前构建，原先缺失的十月 folio 运行时也已就位。全项目共 366 个日期、370 个 Web 关。

新关共用凝露港的原版 SlimeCharacter。关卡资料从 [逐日事实卡](../days/atlas-calendar.md) 接续；模板、玩法和美术分别位于 src/level/atlas.ts、src/templates/atlas.ts、src/themes/atlas.ts。下一步由用户试玩确认画面与手感。[试玩目录](../progress.md) · [验收记录](../../tasks/reports/1122-calendar-atlas.md)

## 2026-11-22 · 十二月全月补齐（冬至奇境）

十二月全部 31 天（`1201`–`1231`）已完成并接入 `solstice`（冬至奇境）模板，沿用凝露港原生 `SlimeCharacter` 流体表面与六属性/分身/摊开/跳跃操作，含 6 大主题生态、11 座可动 3D 宏伟地标、自定义 GLSL 极光与动态星海着色器、4 种立体玩法和 3D 烟花/祈愿天灯高光演出。[制作报告与试玩入口](../../tasks/reports/1122-december.md) · 实机截图已归档至 `qa/evidence/december-1225.png`、`december-1224.png`、`december-1217.png`。注：因并发 Agent 正在 `src/level/main.ts` 新增 `./folio`（尚未落盘 `src/level/folio.ts`），待其完成后可统一复跑一次 `npm run build` 更新 `dist/`。

## 2026-11-22 · 十一月主角修正

时光剧场 28 关共用凝露港的 SlimeCharacter，原地址 5190 已更新。后续 Agent 制作关卡时按 AGENTS.md 第 7 条接入并检查流体表面。当前等用户试玩确认跟随镜头与动作手感。[11 月 24 日试玩](http://127.0.0.1:5190/level.html?id=1124-1859) · [验收与截图](../../tasks/reports/1122-fluid-player.md)

## 2026-11-22 · 十一月全月试玩

十一月已覆盖 30 天、34 个 Web 章节。28 个新增关共享时光剧场，三站操作采用 11 种玩法和按日期配置的立体布景。Chrome 已逐关通关这 28 关，核对存档并复查其余 6 关启动。当前等用户试玩反馈。[整月试玩与验证记录](../../tasks/reports/1122-november.md)

## 2026-11-16


- **最新交付**　阿雷西博卡 1111-15 已接入 11 月 16 日的 1 号时光门。[直接试玩](http://127.0.0.1:5180/level.html?id=1116-1974) · [制作报告与验收](../../tasks/reports/1111-15-landmark-arecibo.md)。目前为 8 个 Web 关、4 个展出日期。浏览器通关与自动检查通过，接下来收用户试玩反馈。

- [项目进度与试玩目录](../progress.md)列出了 7 个已接入的 Web 关卡、9 个仅有章节条目的内容和 5 张待制作的每日关卡卡片。浏览器已逐关核对直达入口，68 项测试、类型检查、生产构建和内容检查通过。
- 用户指定 Codex 全权负责每日关卡，从选题、定稿到制作和技术验收。用户负责试玩及最终画面、手感验收。以下日期的记录保留当时分工。
- 当前可续做旅行者美术卡 1111-21，工作区有 3 个相关文件含未提交改动。11 月 13–17 日的新关可按目录接卡。本次仅整理交接和验证入口，尚未逐关通关。

## 2026-11-11（下午）

**完成**
- skill `.agents/skills/slimefable-level`：流程、设计标准和自评表、美术规范、模板说明、史实和分寸，以及 `lint-content` 和 `new-day` 两个脚本。
- 设计页 `docs/days/1112.md`～`1117.md`：Opus 重新设计了 7 关。
- 1112 · 2014 菲莱：lander 模板 + space 套件 + 一轮美术返工，已完成。
- 1112 · 1980 旅行者：flyby 模板，玩法完成。美术返工卡 `1111-21` 跑到一半，`src/templates/flyby.ts` 和 `src/themes/space.ts` 有未提交的部分改动，下次在 Codex 里接着跑这张卡。
- `agent-run` 支持 `images:`：返工卡会附上截图，智能体能看到画面。

**分工（从今天起）**：用户在 Codex 里执行任务卡（没有时间限制，可以并行）；Opus 写设计页和返工卡，用截图验收。

**待执行的卡**：1111-21（旅行者返工）、1111-12（1113）、1111-13（1114）、1111-14（1115）、1111-15（1116）、1111-16（1117）。

## 2026-11-11

**完成**
- 画质分档（`src/game/graphics.ts`）：自动 / 低 / 中 / 高 / 极致。实测下来，主要开销在场景：每帧要重画 5～6 遍（阴影、海面倒影、水洼倒影、湖面倒影、描边、主画面）。各档调的是：渲染分辨率、抗锯齿、阴影尺寸和刷新频率、倒影的分辨率和刷新频率、哪些物体进倒影（按尺寸）、新区域的可见距离加雾、草的密度、史莱姆的模拟频率。草、花、作物、小动物和特效不参与阴影、倒影和描边。自动档先按 GPU 猜一档，帧率低于约 40 时降一档。港口补丁新增了渲染分辨率、MSAA、阴影刷新三个接口。关卡页面用同样的设置。
- 11/12 试点日（`content/days/1112.ts`），三关可玩：
  - 1866 翠亨村（探索任务 + 岭南套件，Codex 做）
  - 1936 海湾大桥（跑酷；新增收费站 / 桥面 / 隧道 / 桥头四种路段，加上 sf1936 套件）
  - 1954 埃利斯岛（探索任务 + 埃利斯套件，Codex 做）
  - 1980 和 2014 两关标为“设计完成”。
- Grok 停用。之后由 Codex（astra medium）和 Opus 分工。

**下一步**
- 新模板：着陆（2014 菲莱，低重力弹跳）和引力弹弓（1980 旅行者 1 号）。
- 1108-21 北平套件精修，sf1936 精修。
- 去弱一点的设备上验证自动档。

## 2026-11-08

**完成**
- 派卡脚本：Codex 续跑时固定模型和强度（之前续跑会退回到 gpt-6.1-sol）。运行开始前就把状态标成可续跑。报告里写明实际模型、token 数和周额度。
- 港口改名凝露港：`scripts/localize-harbor.mjs` 从 `vendor/sunharbor/harbor.ja.js` 生成 `public/harbor.js`。114 条日文改成中文，字体换成简体中文字体，船旗全部去掉。
- 山坡四栋房子改成浙闽渔村民居（`src/home/chinese-houses.ts`）：马头墙石屋三栋，燕尾脊红砖古厝一栋。原来的地块、挡土墙、电线保留。
- 镜湖：沿用港口海水着色器，加一个独立的平面反射，110 m 以内才渲染。
- 美术基准：`docs/art/zone-style.md`。kit 里的草改成会随风摆的草叶，树冠改成多团、抬高到镜头以上；地面加色块斑驳，路边加石块。
- Codex（gpt-6-astra，medium 强度）把四个区域按规范各精修了一遍，报告里确认实际模型都是 astra。

**下午追加**
- 凝露小厨：切到火属性才能做料理。委托板：每天 3 个委托，交货换贝壳。港口码头和浮码头都能钓鱼。
- M0 收尾：runner 模板（带可达性校验）和 1001 · 1949《奔向天安门》都能玩了：胡同 → 屋脊 → 长安街 → 金水桥，沿途收集 28 面小红旗，到旗台后旗子升起，会计时并记录最好成绩。
- 卡 1108-21（北平 1949 主题精修）连续超时 3 次，没有产生任何改动；现在用的是 Opus 写的第一版北平主题。下次开工先续跑这张卡，或者拆成城楼、胡同两张小卡。

**注意**
- 全图视角约 300 万三角面、约 700 次 draw call。低配机器可能需要做距离剔除，草地也要按距离做 LOD。
- 森林里的石灯笼要留意，别做成日式石灯笼的样子。

**下一步**
- 料理锅、委托板、港口码头钓点。
- 1108-21 北平主题精修；11/12 的 5 关试点卡。

## 2026-11-07（下午）

**完成**
- 静态网格碰撞：高度场改成奇偶实体规则，柱子从地面起算；船体、消波块按实心算（鱼箱、售货机都挡住了）。
- 爬墙 / 贴墙（参考 UE SlimeClingComponent）：`src/slime/cling.ts`。0.6 m 以上的墙会贴住；内角、外角都能转过去；到顶会翻上去，矮墙可以翻越；空格蹬墙跳，T 松手。求解器用贴附平面代替地面。侧面蹭到角不再卡住。
- Home 扩图约 6 倍：`src/world/`（地图、地形网格、按区域烘焙）+ `src/zones/`（公园、镜湖、梯田农场、松果林，一个区域一个文件）。HeightAtlas 每个区域一张 0.1 m 瓦片。阴影相机跟着史莱姆走。
- 常驻玩法：`src/life/`（物品目录、种田、钓鱼、小动物，纯逻辑，有测试）+ `zones/*-loop|spot|field.ts`（接线）。贝壳货币、收购站、种子铺；B 键打开图鉴。
- 派卡：Codex 做了公园（风车、弹跳蘑菇、8 环计时跑酷）、镜湖、农场、松果林的场景。Grok 种田那张卡单轮推理超过 150 s，连续超时 4 次，后来改由 Opus 自己写。

**经验**
- Grok 卡要小，规格要写死，不能留“自己设计”的空间；否则单轮推理会超过 150 s，续跑也接不上。
- device_bash 单次 180 s，agent-run 必须单独一次调用，不能和 verify 串在一起。

**下一步**
- 草丛还是锥体，比较粗糙，需要一张统一的草和花的卡。林子里树冠偏低，镜头会钻进树冠。
- 料理锅（RECIPES 已经有数据）、委托板（`life.requests`）、港口码头钓点、夜间萤火虫效果。
- M0 收尾：跑酷模板 + 1001 · 1949；11/12 的 5 关试点卡。

## 2026-11-07

**完成**
- 修复：移动抽帧抖动（网格按帧锚点平移）、贴墙穿模（7 cm 表面皮层，高度场 0.1 m，盒子同样生效）。
- M0：`level.html` 关卡页、Stage（港口同画风）、explore-quest 模板 + 可达性校验、任务系统、主题套件接口、0815 · 1920 可从时光门进入并回到门前。
- 派卡流水线跑通：Grok 写 1920 台词（133 s）、Codex 做民国上海套件（150 s），均通过验收并提交。

**待验证（需要 5180 服务 + 浏览器面板）**
- 切出浏览器再回来后拖尾 / 透视消失：数据层正常，显卡上下文丢失后恢复的情况还没在画面上确认。
- 碰撞形变的实际观感、1920 关整关流程、民国套件画面。

**下一步**
- 跑酷模板 + 1001 · 1949（M0 最后一项，11/8）。
- 11/12 试点 5 关的任务卡（孙中山诞辰、海湾大桥、埃利斯岛、旅行者 1 号、菲莱）。
