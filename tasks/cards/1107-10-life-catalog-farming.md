---
agent: grok
model: grok-4.7-medium-fast
files: src/life/catalog.ts, src/life/farming.ts, tests/life-farming.test.ts
checks: check,test
---
# 常驻玩法数据：物品目录 + 种田逻辑（纯逻辑，不碰画面）

目标：Home 的农场、钓鱼、捕捉、委托共用一份物品目录；种田的生长规则可以单独测试。

背景：存档里的常驻数据在 `src/life/state.ts`（`LifeData`、`PlotState`、`addItem/takeItem/record`），**只读它，不许改**。时间一律用真实毫秒（`Date.now()` 由调用方传进来，函数里不许自己取时间）。

做法：
1. `src/life/catalog.ts`：
   - `export type ItemKind = 'seed' | 'crop' | 'fish' | 'critter' | 'food' | 'bait' | 'deco'`
   - `export interface ItemDef {id: string; name: string; kind: ItemKind; price: number; icon: string; desc: string}`，`icon` 用一个 emoji。
   - `export const ITEMS: Record<string, ItemDef>`，至少包括：
     - 种子 + 作物各 6 种：萝卜、番茄、玉米、南瓜、草莓、向日葵。种子 id 用 `seed-<x>`，作物 id 用 `crop-<x>`。
     - 鱼 10 种（`fish-<x>`）：池塘里常见的鲫鱼、鲤鱼，到稀有的金鳟、彩虹鳟、“史书鱼”（彩蛋）。
     - 小动物 10 种（`critter-<x>`）：蝴蝶、蜻蜓、萤火虫、松鼠、刺猬、兔子、青蛙、瓢虫、甲虫、猫头鹰。捉住后会放生，只记在图鉴里，`price` 写 0。
     - 料理 5 种（`food-<x>`），比如烤玉米、番茄鱼汤、南瓜派、草莓冰沙、萝卜沙拉。
     - 鱼饵 2 种（`bait-worm`、`bait-glow`）。
   - `export const CROPS: Record<string, {seed: string; crop: string; growMs: number; yield: [number, number]; season?: string}>`。生长时间从 3 分钟（萝卜）到 20 分钟（南瓜），按真实时间算。
   - `export const RECIPES: {id: string; needs: Record<string, number>}[]`，每道料理 2–3 种原料。
2. `src/life/farming.ts`，只写纯函数：
   - `export type PlotPhase = 'empty' | 'sprout' | 'growing' | 'ripe' | 'withered'`
   - `growth(plot: PlotState, now: number): number`：返回 0..1。只有 `watered` 之后 `WATER_MS` = 10 分钟内的时间才算生长；超过 10 分钟没浇水就停止生长，不会倒退。用 `plot.grown` 累计已经长了多少，这样多次浇水可以续上。
   - `phase(plot: PlotState | null, now: number): PlotPhase`：`withered` 的条件是成熟后 24 小时还没收获。
   - `plant(life, plotId, seedId, now)`：会消耗 1 个种子，空地才能种，返回 boolean。
   - `water(life, plotId, now)`：先把到目前为止的生长写进 `grown`，再把 `watered` 设为 now。水属性浇水效果翻倍：多一个参数 `element: number`，`0` 是水属性，翻倍的办法是把这次有效浇水时长记成 20 分钟（自己设计一个字段或常量来实现，不许改 `PlotState` 结构；可以用 `watered = now + WATER_MS` 的写法）。
   - `burnWeeds(life, plotId)`：火属性清掉 `weeds`。`weeds` 在 `water` 时以 15% 的概率出现，概率由传入的 `rand: () => number` 决定。有杂草时生长速度减半。
   - `harvest(life, plotId, now, rand)`：成熟才能收获。产量按 `yield` 随机取，`addItem` 加进背包，用 `record` 记一笔图鉴，地块清空。返回 `{item, n} | null`。
   - `export const PLOT_IDS`：9 块地，id 是 `farm-<terrace>-<row>`，terrace 取 1..3，row 取 0..2。
3. `tests/life-farming.test.ts`（node:test + assert/strict，参考 `tests/quest.test.ts` 的风格）：
   - 种下后不浇水不长。
   - 浇一次水，10 分钟后停止生长。
   - 水属性浇水能长 20 分钟。
   - 成熟后可以收获，并且背包和图鉴都更新。
   - 杂草让生长减半，火能清掉。
   - 成熟 24 小时不收会枯萎。
   - 种子不够不能种。

不许做：改 `src/life/state.ts` 或别的文件；用 `Date.now()` 或 `Math.random()`（随机数一律由调用方传 `rand`）；加依赖。

验收：`npm run check`、`npm test` 通过。
