---
agent: claude
files: content/october.ts, content/types.ts, content/levels/types.ts, content/registry.ts, content/levels/registry.ts, src/level/main.ts, src/level/folio.ts, src/level/folio.css, src/templates/folio.ts, src/themes/folio.ts, src/themes/folio-landmarks.ts, tests/october.test.ts, docs/days/1002.md … docs/days/1031.md, docs/progress.md, docs/session/active.md, tasks/reports/1122-october.md, qa/evidence/october-1122.jpg
checks: check,test,build
---
# 十月整月更新：秋夜长卷

目标：10 月 2 日到 31 日每天一关，可从港口时光门直接进入。10 月 1 日已上线的「奔向天安门」和那天另外 4 个设计条目保持原样。

做法：
1. 30 关共用一条秋夜石桥（新模板 `folio`）。玩家是真正的史莱姆：沿石桥拾六枚银杏光，其中两枚在石碑顶上要贴墙爬；三座石台各做一次元素仪式（点灯 / 接弧 / 转风 / 映月），在光环重合时按 F；最后贴墙爬上地标台，按 F 触发地标的终场动作。
2. 每天的地标、仪式、终场动作、配色写在 `content/october.ts`，纯逻辑在 `src/templates/folio.ts`，场景在 `src/themes/folio.ts` 与 `src/themes/folio-landmarks.ts`，运行时在 `src/level/folio.ts`。
3. 复玩写入 `save.data.life.records`：`<id>-time-ms`、`<id>-medal`、`<id>-lights`、`<id>-dry`、`<id>-flawless`。收齐六枚银杏光得到纪念品。

不许做：改 `src/slime/`、`src/game/game.ts`、`content/days/1001.ts`；画人物肖像、挂旗、画商标或受版权保护的角色；新增贴图、字体、音频或依赖。

## 事实卡

- 10/02 · 1836　小猎犬号结束近五年的环球考察，在英国法尔茅斯落锚。 [来源](https://nmmc.co.uk/2025/07/following-hms-beagle-to-falmouth/)
- 10/03 · 1990　民主德国与联邦德国正式统一。 [来源](https://en.wikipedia.org/wiki/German_reunification)
- 10/04 · 1957　斯普特尼克 1 号进入地球轨道。 [来源](https://www.nasa.gov/history/dawn-of-the-space-age/)
- 10/05 · 1962　披头士第一支单曲《Love Me Do》在英国发行。 [来源](https://www.beatlesbible.com/1962/10/05/single-release-love-me-do-ps-i-love-you/)
- 10/06 · 1889　红磨坊在巴黎蒙马特山脚开业。 [来源](https://en.wikipedia.org/wiki/Moulin_Rouge)
- 10/07 · 1959　月球 3 号拍下第一批月球背面照片。 [来源](https://en.wikipedia.org/wiki/Luna_3)
- 10/08 · 1958　第一枚全植入式心脏起搏器植入阿内·拉松体内。 [来源](https://en.wikipedia.org/wiki/Artificial_cardiac_pacemaker)
- 10/09 · 1874　《伯尔尼条约》签署，成立后来的万国邮政联盟。 [来源](https://en.wikipedia.org/wiki/Universal_Postal_Union)
- 10/10 · 1846　拉塞尔发现海卫一。 [来源](https://science.nasa.gov/neptune/moons/triton/)
- 10/11 · 1982　玛丽玫瑰号船体从索伦特海峡吊出水面。 [来源](https://en.wikipedia.org/wiki/Mary_Rose)
- 10/12 · 1968　墨西哥城奥运会开幕，恩里克塔·巴西利奥点燃主火炬。 [来源](https://en.wikipedia.org/wiki/1968_Summer_Olympics)
- 10/13 · 1884　国际子午线会议确定格林尼治为本初子午线。 [来源](https://en.wikipedia.org/wiki/International_Meridian_Conference)
- 10/14 · 1947　耶格尔驾驶 X-1 突破音障。 [来源](https://en.wikipedia.org/wiki/Bell_X-1)
- 10/15 · 1997　卡西尼-惠更斯号发射。 [来源](https://science.nasa.gov/mission/cassini/the-journey/timeline)
- 10/16 · 1923　华特·迪士尼签下动画发行合同。 [来源](https://thewaltdisneycompany.com/news/disney100-anniversary-disney-contract/)
- 10/17 · 1604　开普勒观测蛇夫座超新星。 [来源](https://en.wikipedia.org/wiki/Kepler%27s_Supernova)
- 10/18 · 1922　英国广播公司在伦敦成立。 [来源](https://en.wikipedia.org/wiki/British_Broadcasting_Company)
- 10/19 · 1901　桑托斯-杜蒙驾驶飞艇绕埃菲尔铁塔。 [来源](https://en.wikipedia.org/wiki/Alberto_Santos-Dumont)
- 10/20 · 1973　悉尼歌剧院正式开放。 [来源](https://www.sydneyoperahouse.com/our-story/50-years-extraordinary-moments)
- 10/21 · 1858　《地狱中的奥菲欧》在巴黎首演。 [来源](https://en.wikipedia.org/wiki/Orpheus_in_the_Underworld)
- 10/22 · 1879　门洛帕克的碳化棉线灯泡亮了约十三个半小时。 [来源](https://edison.rutgers.edu/life-of-edison/biographical-essays/lighting/the-carbon-filament-lamp)
- 10/23 · 2001　第一代 iPod 发布。 [来源](https://www.apple.com/newsroom/2001/10/23Apple-Presents-iPod/)
- 10/24 · 2003　协和式客机完成最后一次商业航班。 [来源](https://www.britishairways.com/content/en/information/about-ba/history-and-heritage/celebrating-concorde)
- 10/25 · 1875　柴可夫斯基《第一钢琴协奏曲》在波士顿首演。 [来源](https://en.wikipedia.org/wiki/Piano_Concerto_No._1_(Tchaikovsky))
- 10/26 · 1863　英格兰足球协会成立。 [来源](https://en.wikipedia.org/wiki/The_Football_Association)
- 10/27 · 1904　纽约第一条地铁开通。 [来源](https://en.wikipedia.org/wiki/New_York_City_Subway)
- 10/28 · 1886　自由女神像在纽约港揭幕。 [来源](https://en.wikipedia.org/wiki/Statue_of_Liberty)
- 10/29 · 1969　阿帕网发出第一则报文「LO」。 [来源](https://www.lk.cs.ucla.edu/internet_first_words.html)
- 10/30 · 1938　广播剧《世界大战》播出。 [来源](https://en.wikipedia.org/wiki/The_War_of_the_Worlds_(1938_radio_drama))
- 10/31 · 2000　远征一号乘组升空。 [来源](https://en.wikipedia.org/wiki/Expedition_1)

验收：`lint-content`、`npm run check`、`npm test`、`npm run build` 通过；浏览器走完 1004、1020、1028 三关的终场，截图存 `qa/evidence/october-1122.jpg`，交用户试玩。
