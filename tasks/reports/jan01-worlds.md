# 1 月 1 日六门 · 生产试玩验收

六关可从[凝露港](http://127.0.0.1:5190/?date=0101)及史书进入。[分门试玩与事实卡](../../docs/days/0101.md) · [六关实景](../../qa/evidence/jan01-six-worlds.jpg)

## 逐门操作

| 门 | 后台浏览器完成的操作 | 证据 |
|---|---|---|
| 一 · 印匣 | 真实攀上印钮、分身压纸、揭开试印。分别走完近角首印完整、远角补印、保留缺角三条路线。旧档从 41 贝壳增至 49，练习完成后仍为 41。 | [试纸](../../qa/evidence/jan01-seal-proof.jpg) · [揭画](../../qa/evidence/jan01-seal-finale.jpg) · [缺角存档](../../qa/evidence/jan01-seal-gap.json) |
| 二 · 立体书 | 持续推墙翻上书脊。第一局沿折痕攀到赤色压花，第二局落沟回到书签后借风滑翔到金色压花。两局均以自身重量压下末页，重进后两枚压花都已记录，首胜只给一次。 | [折页](../../qa/evidence/jan01-book-fold.jpg) · [末页插画](../../qa/evidence/jan01-book-final.jpg) · [路线与表面射线](../../qa/evidence/jan01-book-result.json) |
| 三 · 花车 | 从温室视角进入俯视布防。失守时在当前弯道重试。正式与练习分别移动两种塔过六波，分身与本体配合拉开花拱，两桶各记一次完好与无支援。 | [温室入口](../../qa/evidence/jan01-defense-entry.jpg) · [花拱放行](../../qa/evidence/jan01-defense-finale.jpg) · [实测数据](../../qa/evidence/jan01-defense-result.json) |
| 四 · 钱屉 | 第一枚直接下落，第二枚横移对槽，第三枚可提前消两组、在底排补救。实际交换、竖屏选币、落点提示、零次重排、余步冲分、近十局入榜和回港均通过。 | [实物柜体与钱屉](../../qa/evidence/jan01-match-drawer.jpg) · [竖屏](../../qa/evidence/jan01-match-portrait.jpg) · [钱屉推出](../../qa/evidence/jan01-match-finale.jpg) |
| 五 · 首航 | 近岸和高廊各完成一次正式放行。另从竖屏练习进入，测试分身回收、当前航段重试、铃响后继续移动和机身离水。正式累计双路线，练习独立计次。 | [船棚与飞机](../../qa/evidence/jan01-skirmish-entry.jpg) · [离水](../../qa/evidence/jan01-skirmish-departure.jpg) · [航段与接缝数据](../../qa/evidence/jan01-skirmish-result.json) |
| 六 · 冰场 | 滑行后收身转向，分别以风步和格挡完成守门对决。射失保留轮次，回到门前再射。验证球网顶点兜球、看台动作、双翼胜利记录与回港。 | [门将重心](../../qa/evidence/jan01-rpg-keeper.jpg) · [门前出手](../../qa/evidence/jan01-rpg-goal-right.jpg) · [竖屏](../../qa/evidence/jan01-rpg-portrait.jpg) |

## 共用入口与存档

- 用带历史收藏的 v1 存档打开史书，检查六个正式入口和两个往期挑战。随后逐门进入、等待原版史莱姆表面生成、按关内回港按钮，并分别从二号门进入旧投射和借印试炼。八次返回均在对应门前约 2.3 米，所选日期仍是 1 月 1 日。[六门与往期挑战往返记录](../../qa/evidence/jan01-gates.json)
- 两个历史章节使用原 ID 和原纪念品。塔防、三消、首航和冰场继续分别使用原故事收藏键；重进尚能读出升级前的收藏。六门各计一次首胜的回归合计 48 贝壳，练习成绩单列。
- 日期专用玩法与角色模块分开实现。测试运行在独立无头 Chrome，预先禁用指针锁。图片为正常 WebGL 渲染，手机图为竖屏视口。实体手机触摸手感和美术认可待玩家确认。

## 技术检查

- `npm run check`、`npm test`（1,561 项全部通过）、`npm run build`、`npm run catalog`、`npm run catalog:check` 和内容检查均通过。立体书的浏览器回归还在通关前从另一标签页更新旧存档，再验证该成绩和本局压花同时保留。
- 小关状态与解法按 40 组输入检查。印匣是固定书案，覆盖两处落款、不同试印结果和帧长；折页改变起风相位与压花位置；其余固定模式覆盖正式与练习棋盘或战局种子。
- 近景、远景、低角度与竖屏截图保存在 `qa/evidence/jan01-*`。印匣从两角度检查落款是否被遮挡，立体书以六条射线检查可走表面；首航检查高廊与浮台支撑误差，实测最大 0.00028 米。
- 原版史莱姆随登钮、起跳、展伞、迁塔、推钱屉、投射或冰面摊开变形。渲染抽测中，印匣额外 48 次绘制，立体书整帧 51 次，花车正式场景额外 145 次，钱屉额外 36 次，首航入口额外 134 次，冰场额外 60 次。
- 本次验收的入口资源为 `jan01-seal-uqpP5miu.js`、`jan01-book-DZGjvcaP.js`、`january-defense-CP_xtrFO.js`、`mode-match-D0lJz9RC.js`、`january-skirmish-Dbmw729f.js`、`january-rpg-DxSHedAm.js`。生产入口 JS 单包 gzip 约 6.8–31.0 KiB。
- 制作侧自评（五分制）：辨识度 4、细节密度 4、玩家触发的高光 4、能力运用 4、操作可读性 4、体积和绘制预算 5。首轮请玩家优先试玩缺角后补印、页角扬起时展伞、弯道迁塔和门将预移。
