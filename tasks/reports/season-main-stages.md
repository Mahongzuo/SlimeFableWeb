# 11 月 27 日至 12 月 1 日 · 二至六号门验收

五个日期沿用原来的史题、门位、收藏与收尾操作。每门的具体中段写在[制作页](../../docs/days/1127-1201-worlds.md)，六门整体进度见[逐日台账](../../docs/six-gate-polish.md)。

## 逐日复核

每张总览按二至六号门从左到右排，三行依次为常规、远景、结尾。每门另有贴地斜看和手机视口原图。

<a id="d1127"></a>

### 11 月 27 日

手稿折痕靠玩家摊开压平，两套测温路线都走完了三段。塔防实测切换母线后塔位增益生效，船台按先艉后艏解除支撑，西站留守与东站接力完成。 [实机总览](../../qa/evidence/season-stage-1127.jpg) · [史书与五门往返](../../qa/evidence/season-stage-1127-harbor.json)

<a id="d1128"></a>

### 11 月 28 日

寻星架在身体摊开后变稳。港灯覆盖的来流减速，雷达拼幅检查横纵方向；分身在制动窗口回收，轻舟、主帆分别通过三对浮标。 [实机总览](../../qa/evidence/season-stage-1128.jpg) · [史书与五门往返](../../qa/evidence/season-stage-1128-harbor.json)

<a id="d1129"></a>

### 11 月 29 日

街机漏球后只重发该球。雪夜合罩后能集中供暖，吊带和风带分别响应纵、横连消；从月球对岸标定两弧，极地分别用借风起跳和摊开稳航越岭。 [实机总览](../../qa/evidence/season-stage-1129.jpg) · [史书与五门往返](../../qa/evidence/season-stage-1129-harbor.json)

<a id="d1130"></a>

### 11 月 30 日

球场测试错过传球后的补救与挑传。均压阀重新分配两包货物余压，塔架先松锁后撤臂，圭表分别留下长影和短影；河轮先测浅水再换岸探出深槽。 [实机总览](../../qa/evidence/season-stage-1130.jpg) · [史书与五门往返](../../qa/evidence/season-stage-1130-harbor.json)

<a id="d1201"></a>

### 12 月 1 日

两座冰上脚架完成基线观测，集齐八枚星尘取得原收藏。着陆器反推扬尘，两个站台分别有通车路径；分身收回时带出凭单，隧道从两边先支护再推进。 [实机总览](../../qa/evidence/season-stage-1201.jpg) · [史书与五门往返](../../qa/evidence/season-stage-1201-harbor.json)

## 分门实测数据

| 日期 | 二号门 | 三号门 | 四号门 | 五号门 | 六号门 |
|---|---|---|---|---|---|
| 11 月 27 日 | [次章](../../qa/evidence/season-stage-1127-second-result.json) | [塔防](../../qa/evidence/season-stage-1127-defense-result.json) | [三消](../../qa/evidence/season-stage-1127-match-result.json) | [分身](../../qa/evidence/season-stage-1127-skirmish-result.json) | [试炼](../../qa/evidence/season-stage-1127-rpg-result.json) |
| 11 月 28 日 | [次章](../../qa/evidence/season-stage-1128-second-result.json) | [塔防](../../qa/evidence/season-stage-1128-defense-result.json) | [三消](../../qa/evidence/season-stage-1128-match-result.json) | [分身](../../qa/evidence/season-stage-1128-skirmish-result.json) | [试炼](../../qa/evidence/season-stage-1128-rpg-result.json) |
| 11 月 29 日 | [次章](../../qa/evidence/season-stage-1129-second-result.json) | [塔防](../../qa/evidence/season-stage-1129-defense-result.json) | [三消](../../qa/evidence/season-stage-1129-match-result.json) | [分身](../../qa/evidence/season-stage-1129-skirmish-result.json) | [试炼](../../qa/evidence/season-stage-1129-rpg-result.json) |
| 11 月 30 日 | [次章](../../qa/evidence/season-stage-1130-second-result.json) | [塔防](../../qa/evidence/season-stage-1130-defense-result.json) | [三消](../../qa/evidence/season-stage-1130-match-result.json) | [分身](../../qa/evidence/season-stage-1130-skirmish-result.json) | [试炼](../../qa/evidence/season-stage-1130-rpg-result.json) |
| 12 月 1 日 | [次章](../../qa/evidence/season-stage-1201-second-result.json) | [塔防](../../qa/evidence/season-stage-1201-defense-result.json) | [三消](../../qa/evidence/season-stage-1201-match-result.json) | [分身](../../qa/evidence/season-stage-1201-skirmish-result.json) | [试炼](../../qa/evidence/season-stage-1201-rpg-result.json) |

每门分别从正式与练习入口通关，检查原收尾和原存档键。带既有收藏的存档能进关、结算并回到原来的门；五天共 25 次港口往返，返回距离均为 2.3 米。二号门另测了收齐南极八枚星尘，三号门通过失守重开当前波，四号门在耗尽步数后复原本段棋盘，五号门实际走出平台触发局部复位，六号门在第二段连续失手后从本段重来。正式与练习的成绩分别存储。

关卡逻辑各覆盖 40 组种子或起始相位。塔防跑完六轮，三消用普通相邻交换求解，三维章节与行动关另在浏览器操作角色。浏览器验证期间加速了塔防波次和部分行走的模拟时钟。手机证据来自独立无头 Chrome 的竖屏视口；六号门还通过了竖屏点击场地移动。实体手机的输入延迟、握持感与画面风格留给玩家试玩。

机位可用同目录中的逐门 QA 脚本复现。例如二号门贴地机位从 (3.7, 1.15, 5.8) 看向 (0, 0.7, −1)，五号门从 (3.7, 0.87, 4.8) 看向 (−0.5, 0.64, −4.6)，六号门远景从 (7.8, 10.8, 16.6) 看向 (0, 1, −4)。每门保留原分辨率的常规、贴地、远景、竖屏和结尾文件；在三至五号门的远景文件中还可对照开场构图。

复查某一天时，可运行 `python scripts/qa-season-main.py --day 1127` 查看五门往返，再用 `python scripts/qa-turning-season.py --group campaign --day 1127` 启动各门专用通关脚本。旧的首章、开场机关试玩与港口测试仍由同一入口的其他分组运行。

## 生产构建与检查

在 5190 端口的生产构建上完成 25 关正式、25 次练习通关。二至六号门对应入口块依次为 `season-second-DI20kJrw.js`、`january-defense-BIYPrLqk.js`、`mode-match-fYOhYiNq.js`、`season-skirmish-C29cDPba.js` 和 `january-rpg-PxoxGuPl.js`。这些入口块 gzip 后分别约 8.4、24.9、35.1、13.3、24.8 KiB，共用引擎和存档代码另外加载。所有常规、贴地、远景、竖屏、收尾文件均已读回检查，共 125 张，另附五张逐日总览。

`npm run check`、`npm run build`、内容检查、`npm run catalog` 和 `npm run catalog:check` 均通过。全量 `npm test` 通过 1,617 项，失败及跳过均为 0。构建仍提示项目中部分共享块超过 500 kB。

按项目五分制自评，场景辨识度、细节、高光、角色能力、操作可读性各 4 分，体积与性能 4 分。三消仍需要同时看棋格纹路和实体机关，适合在真机试玩时重点看清晰度。正式的画面与手感评价留给玩家。
