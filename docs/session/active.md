# 会话检查点

## 2026-11-28 · 东岸运动公园

五个原作场地、动物阵容、真实泳池水域和十天成长曲线已接入家园。场边选阵和结算都能查看 F1 帮助。下次试玩可沿风车公园东侧步道前往，重点确认手机触感、队友跑位和泳池水花。[任务卡](../../tasks/cards/home-sports.md) · [检查与实景](../../tasks/reports/home-sports.md)

## 2026-11-27 · 1 月 7 日三号门着陆修复

原收尾弹窗模块缺失时可复现按钮停在六轮完成。现由同一场景直接放绳、在加来一侧落地，落稳后领奖。正式鼠标和竖屏触控均已用缺失模块条件回归，F1 已同步。[验收与实景](../../tasks/reports/0106-0110-six.md)

## 2026-11-27 · 1 月 6 日一号门简化

译室改为左右金圈各校一次，前方合稿。五枚译笺作为可选收集。已验证两种先后、零收集通关、正式练习分账、触屏 F1 和原路回港。[验收与实景](../../tasks/reports/0106-0110-six.md#1-月-6-日一号门易读性调整)

## 2026-11-27（终·十一项场景体验精修）· 青蛙防抽搐、水岸泡沫与雨滴、跳床蘑菇材质法线、秋千亭子移位与可荡物理、传送门无缝涡流、四段二次元刀光、树林空气墙清除、礁石碰撞、野外遭遇直接提示与树根禁草

- **1. 青蛙待机/游动防抽搐**：[simpond-ai.ts](../../src/home/simpond-ai.ts) 为两栖类新增最短弧角插值 `stepAngle()`、锁存游动落点 `swimTx/swimTz`（`> 0.28 m` 停步区 + 步长夹紧）、平滑 `group.rotation.y` 转向与温和 `croak` 喉囊脉动；[critter-field.ts](../../src/zones/critter-field.ts) 为池蛙增加 `0.004 m` 移动死区与平滑朝向插值。
- **2. 湖泊/河道/近海有机近岸泡沫 & 7. 稀疏细腻雨滴涟漪**：[water-surface.ts](../../src/home/render/water-surface.ts) 重写 `bakeFoamTexture(512)` 为域扭曲柔云 + 微气泡（移除生硬 Voronoi 网格泡沫），并将雨滴波纹改为低密度双层 `rainRingLayer`；[fft-ocean.ts](../../src/home/render/fft-ocean.ts) 升级近海碎浪为双尺度滚动波峰与退潮薄纱；[rain-contact.ts](../../src/home/rain-contact.ts) 移除 14 边形线框环与刺状王冠，改为细雨丝 + 96 粒柔和雾滴 `Points`。
- **3. 跳床蘑菇与森林蘑菇反向法线修复 + 绘本材质升级**：[park.ts](../../src/zones/park.ts) 与 [forest.ts](../../src/zones/forest.ts) 将 `LatheGeometry` 轮廓改为严格自下而上（法线朝外，根治夜间透明/透底问题），新增 512² 五色釉面斑点菌盖、底面放射菌褶贴图、直绑 `emissiveMap`（仅斑点与菌褶夜间微亮）及带菌环弯曲菌柄。
- **4. 秋千与凉亭移至草地 + 模型升级 + 去空气墙与可荡物理**：[garden-regions.ts](../../src/home/garden-regions.ts) 将凉亭移至 `(-18.5, 65.0)`、紫藤架移至 `(-22.5, 63.5)`、银杏移至 `(-8, 74)`；[park.ts](../../src/zones/park.ts)、[types.ts](../../src/zones/types.ts)、[game.ts](../../src/game/game.ts)、[solver.ts](../../src/slime/solver.ts)、[surface.ts](../../src/slime/surface.ts)、[character.ts](../../src/slime/character.ts) 将秋千移至 `(-9.5, 70.0)` 并重建实木 A 字架、石墩、横撑、金属吊环、双绳与带装饰条座板，`skipHeightBake = true` 彻底消除 2.5D 高度场封堵；站上座板后自动锁定并稳住 1.0 秒起荡，通过随动倾斜 `ridePlane` 同步约束 PBF 384 粒子与 Marching Cubes 标量场底面裁切、跳过悬边下垂并同帧刷新渲染偏移，彻底杜绝穿模与滑落（无头 Chrome 实测跟踪误差 `0.000 m`，仅在玩家主动按 `WASD`/空格/右键冲刺时离开，起跳按真实切向甩飞）。
- **5. 传送门涡流去水平接缝**：[portal-vfx.ts](../../src/home/portal-vfx.ts) 用连续笛卡尔 `rot2()` 对数螺线旋转与周期单位向量替代传入 `fbm()` 的不连续 `atan(uv.y, uv.x)`，彻底消除中左侧 `-π/+π` 水平拼缝。
- **6. 鸣潮/异环风格四段连击二次元刀光**：[slash-vfx.ts](../../src/slime/slash-vfx.ts) 重构为双层刀带（Normal 混合高饱和暗墨底剪影 + Additive HDR 锐利刃脊）、UV 噪波侵蚀发光焦边与色散副缘，4 段差异化连段轨迹（1 段快斩、2 段残影上挑、3 段 X 交叉双斩、4 段 248° 螺旋终结技+外环斩波）及 4 角星芒受击闪光。
- **8. 清除松林树枝空气墙**：[bake.ts](../../src/world/bake.ts) 将 `branch` 加入 `NEVER_SOLID`，[forest.ts](../../src/zones/forest.ts) 为 `pine-branches` 标记 `walkThrough` 与 `skipHeightBake`。
- **9. 岸边礁石与湖畔石块碰撞**：[island-coast.ts](../../src/world/island-coast.ts) 抽离视觉与物理共用 `computeCoastalReefPoses()` 并导出 `buildCoastalReefBoxes()`（不可攀爬 OBB）接入 [home-world.ts](../../src/world/home-world.ts)；[lake.ts](../../src/zones/lake.ts) 为东岸平岩与全部湖畔礁石注册 `climbable: false` OBB。
- **10. 野外遭遇去 C 摊扁门槛，直接提示所需物品与来源**：[ranch.ts](../../src/life/ranch.ts) 与 [ranch-runtime.ts](../../src/home/ranch-runtime.ts) 新增 `describeItemSource()`，交互与提示直接显示所需偏好物品及获取方式，背包有 1 份即可直接 `F` 结识。
- **11. 树干树根全区域禁草防穿模**：[park.ts](../../src/zones/park.ts)、[forest.ts](../../src/zones/forest.ts)、[lake.ts](../../src/zones/lake.ts)、[harbor.ts](../../src/zones/harbor.ts)、[farm.ts](../../src/zones/farm.ts) 与 [builder.ts](../../src/home/builder.ts) 在静态草簇与动态 GPU 禁草遮罩中均排除全部程序化树、原生景观树及玩家种植树树干核心。
- **验证与证据**：新增 [home-eleven-fixes.test.ts](../../tests/home-eleven-fixes.test.ts)；`npm run check`、`npm run build` 全通过；家园/史莱姆/物理/PBF/生态/生活全部 28 个专项测试套件 **134 / 134 PASS**（注：共享工作区并行日常关卡的 `tests/january-match.test.ts` 存在 1 项非本任务失败）；独立无头 Chrome 连接 `http://127.0.0.1:5180/` 最新生产构建（0 控制台/页面报错），留存 9 张多角度及昼夜验收截图至 `qa/evidence/polish-11-*.jpg`。下一步待用户本机试玩确认画面、手感、秋千摇晃与四段刀光观感。

## 2026-11-27 · 1 月 6 日至 10 日六门

1 月 6–10 日的 30 扇门逐日登记完毕，台账累计 45 天。留存 150 张实机图、五张逐日拼图、30 份正式／练习回执、30 页 F1 回执。1 月 6 日海岸拼桌补验原失败种子，1 月 7 日车渡贴地复核接轨，1 月 10 日邮局在竖屏用纯触控通关。类型、目录、内容和生产构建通过。全量测试 2,073/2,073，关卡与 F1 专项 63/63。实体设备画面与手感待玩家定稿。[逐门试玩](../days/0106-0110-six.md) · [逐日验收](../../tasks/reports/0106-0110-six.md)

## 2026-11-27 · 1 月 2 日至 5 日六门

四天 24 扇门、25 个入口已逐日完成，台账累计 40 天。保留 1 月 2 日二号门两章。关卡与 F1 专项 31 项通过，类型、内容、目录及构建通过，五视图、正式与练习、旧档回港和触屏帮助均有记录。全库 2,020/2,021，唯一失败为并行角色的斩击角度，按用户意见留给角色任务。下一步由玩家在实体设备确认画面与手感。[试玩入口](../days/0102-0105-six.md) · [分门验收与项目检查](../../tasks/reports/0102-0105-six.md)

## 2026-11-27 · 柳岸钓台与史莱姆号

已接入家园远海航次、三类可登陆岛屿、船钓潜水、逐波舷炮战和一次性返港结算。对照 Pirate Ship Sunset 加入船形生浪、世界坐标泡沫历史、含气水与随浪反光；玩家船和敌船共用。后台生产浏览器已跑通两波、读档、钓鱼入包、登岛回船与返港。下一步由玩家确认扬帆转向、浪花观感、舷炮射界和触屏布局。[任务卡](../../tasks/cards/slime-voyage.md) · [实景与验收](../../tasks/reports/slime-voyage.md) · [本机试玩](http://127.0.0.1:5292/)

## 12 月 22 日至 31 日六门

已完成月底十天共 60 关，原史题、存档键和入口核对一致。12 月全部 31 天的六门已逐日登记，含既有 1 月 1 日与 11 月 27–30 日，台账累计 36 天。新批次每关留存五机位、正式与练习、40 种子、旧档回港及 F1 证据。竖屏纯轻点完成暗房两色套印；三消帮助附实盘示意。封版全量测试 1,961 项通过，类型、内容、目录和构建均通过。实体设备上的画面与手感待玩家试玩。[分门设计与入口](../days/1222-1231-six.md) · [验收结果](../../tasks/reports/1222-1231-six.md) · [台账](../six-gate-polish.md)


## 2026-11-27（夜·终）· 地形道路无缝拼接、田垄动态禁草、Meadow 风格草花树冠/花尘升级与 SimPond 夜间光照修复

- **1. 地形与道路拼接修复 + Meadow 地面笔触**：
  - [jiangnan.ts](../../src/home/jiangnan.ts)：移除叠在 `gardenRoads` 之上的 6 块生硬矩形 `nativeLane` 石板 `groundTile`；为玩家建造铺设的 `groundTile()` 增加基于世界坐标多尺度噪波边缘羽化与湿润过渡土边。
  - [garden-regions.ts](../../src/home/garden-regions.ts) & [terrain-mesh.ts](../../src/world/terrain-mesh.ts)：新增统一的 `sampleTerrainRoadWeight()`，使石埠北向支路平滑跨过 `harbor`/`park` 的 `z = 30` 分区边界并自然汇入公园主道；清除汇入路口横穿中线的 `path-stones-fx` 路缘石；为全部分区内部接缝统一计算连续 `inland()` 解析法线；地形片元着色器新增草地底层画笔笔触（brush dabs）、双频噪波路肩破边、潮湿深色过渡泥唇与碎石颗粒。
- **2. 实时 GPU 田垄/建筑禁草遮罩（零杂草穿模）**：
  - [grass-ism.ts](../../src/home/foliage/grass-ism.ts)：新增最多支持 48 个任意旋转朝向 OBB 的实时 GPU 禁草/禁花遮罩（`updateGrassExclusions`、`grassExclusionUniforms`、`isPointGrassExcluded`），种植床新建、移动或拆除下一帧即时生效，零几何重建开销。
  - [builder.ts](../../src/home/builder.ts)：在 `syncCollisionAndHabitats()` 与 `syncTiles()` 自动按优先级同步全部 `farmBed` 种植床、实心建筑、玩家铺装与原生建筑轮廓至禁草遮罩。
  - [farm.ts](../../src/zones/farm.ts)、[harbor.ts](../../src/zones/harbor.ts)、[park.ts](../../src/zones/park.ts)：加宽梯田菜地（`4.18 × 2.62`）、石埠花坛、临水凉亭与道路边缘静态安全裕量。
- **3. Meadow 风格草地、4 种 3D 野花簇、体积树冠与飘浮花尘**：
  - [grass-ism.ts](../../src/home/foliage/grass-ism.ts)：草地升级为 Voronoi 丛心双层分布（28% 高草丛 + 72% 贴地草毯）、俯视防薄化后仰增宽、折叶左右明暗微差与暖稻草金/冷翡翠杂化；野花升级为 4 种真 3D 物种花簇飘带（`daisy` 11 瓣雏菊、`poppy` 双层杯状虞美人、`lupin` 6 层螺旋羽扇豆、`buttercup` 5 瓣毛茛），共享风摇、史莱姆踩踏与 GPU 禁草遮罩。
  - [tree-ism.ts](../../src/home/foliage/tree-ism.ts)：升级阔叶树冠为 4 团块体积内芯（UV 落在 Q0 实心叶区，兼容 `forest.ts` `alphaTest`）+ 32 张球面传递法线外层叶簇，保留树干嵌入下冠射线不变量，并新增 4 板根树干与顶光暖绿/底冠冷影/逆光金边着色。
  - 新增 [atmosphere-motes.ts](../../src/home/foliage/atmosphere-motes.ts) 并接入 [garden-stage.ts](../../src/home/garden-stage.ts)：420 粒镜头环绕 GPU 飘浮花尘（日间暖金逆光微尘、夜间柔和萤火粉尘，雨雪天自动淡出隐藏）。
- **4. SimPond 生物夜间发黑根治**：
  - [simpond-assets.ts](../../src/home/simpond-assets.ts)：新增 `normalizeSimPondMaterial()` 与 `simpondLighting`（由 `garden-stage.ts` 每帧同步 `daylight`/`sunDir`），强制 `metalness = 0`、`metalnessMap = null`（根治 `common-frog.glb` / `smooth-newt.glb` 的 glTF 2.0 默认 `metallicFactor = 1.0` 金属黑化缺陷），约束粗糙度 `[0.46, 0.78]`、提亮 `envMapIntensity = 1.25` 与柔和色基，并为全部 22 种生物注入仅夜间生效的月光漫反射补底与菲涅尔轮廓光。
  - [ibl.ts](../../src/home/render/ibl.ts) & [pipeline.ts](../../src/home/render/pipeline.ts)：温和抬升夜间天空 IBL、下半球反弹底噪、`environmentIntensity` 与半球光暗部基线。
- **验证与证据**：新增 [meadow-upgrade-and-night.test.ts](../../tests/meadow-upgrade-and-night.test.ts)；`npm run check`、`npm run build`、全量 `npm test`（**1,961 / 1,961 PASS**）全部通过；独立无头 Chrome（生产构建，0 报错，实测 60 个 SimPond 模型 `hasMetalMap = 0`、`maxMetalness <= 0.02`）留存 8 张多角度与深夜证据截图至 `qa/evidence/meadow-*.jpg`。下一步待用户本机试玩确认画面、植物密度与昼夜观感。

## 12 月 17 日至 21 日六门

30 关均从原来的港口及史书入口进入。已验证正式、练习、局部补救、40 种子、旧存档回港，以及键盘和触屏 F1。三消的帮助能显示当前可解目标与可交换坐标。十个历史展台按手机画幅取景，12 月 19 日天平已在 390×844 下通过轻点去皮、左右托运样盒、封签全流程。全量测试 1,850 项通过，内容、目录、类型和生产构建检查通过。台账累计 26 天，下一批从 12 月 22 日起。画面与手感待玩家试玩。[逐日验收](../../tasks/reports/1217-1221-six.md) · [优化台账](../six-gate-polish.md)


## 2026-11-27（夜·续）· 引入 SimPond 生物模型、骨骼/顶点动画与多物种 AI 状态机

- **模型与贴图引入**（[public/models/simpond/](../../public/models/simpond/)，共 24 个资源 / 3.33 MB，含 [NOTICE.txt](../../public/models/simpond/NOTICE.txt) 许可声明）：
  - **带真实骨骼动画的两栖类**：`common-frog.glb`（5 段骨骼动画：`sit / croak / hop / swim / float`）、`smooth-newt.glb`（4 段骨骼动画：`rest / walk / swim / court`）。
  - **淡水与海洋鱼类（`_lo.glb`）**：红白锦鲤 `koi-kohaku`、昭和锦鲤 `koi-showa`、彗星金鱼 `goldfish-comet`、金雅罗鱼 `golden-orfe`、河鲈 `perch`、蓝鳃太阳鱼 `bluegill`；以及 CC0 Fish Kit 海洋鱼类 `madai`、`kurodai`、`aji`、`saba`、`kasago`、`suzuki`。
  - **水生/飞虫与甲壳/软体生物**：帝王蜻蜓 `dragonfly-emperor`、红蜻蜓 `dragonfly-darter`（配 `dragonfly-wings.webp` / `damselfly-wings.webp` 四翼透明翅脉）、水黾 `water-strider`、豉甲 `whirligig-beetle`、岸蟹 `shore-crab`、寄居蟹 `hermit-crab`、信号小龙虾 `crayfish-signal`、池塘蜗牛 `pond-snail`。
- **骨骼/顶点动画加载器与多物种 AI 状态机**：
  - [simpond-assets.ts](../../src/home/simpond-assets.ts)：`GLTFLoader` 异步流式缓存 + `SkeletonUtils.clone` 独立骨骼实例与 `AnimationMixer` 淡入淡出切换；为鱼类与甲壳类注入 GPU 顶点着色器波浪摆尾/足部划动变形；为 Fish Kit 鱼鳍修正 `alphaTest` 深度排序，为蜻蜓装配四翼透明翅脉扑动。
  - [simpond-ai.ts](../../src/home/simpond-ai.ts)：实现 5 套可单测 AI 有限状态机——两栖类水陆切换（受惊抛物线跃水→游泳→漂浮/求偶回岸）、鱼群 Boids 集群+水面觅食+遇敌冲刺逃逸（`flee_dart` 加速摆尾）、水黾/豉甲脉冲滑行与受惊散开、蜻蜓巡航/悬停/突刺/停栖、岸蟹横行/寄居蟹缩壳僵直/龙虾退水，并封装 `SimPondEcosystem` 接入镜湖、河道与东/南海岸沙滩。
- **全生态无缝融合**：升级 [water-fish.ts](../../src/home/water-fish.ts)（镜湖/河道/扩建荷塘接入锦鲤/河鱼 GLB + Boids 逃逸 FSM，100% 兼容既有图鉴与单测）、[ocean-life.ts](../../src/home/ocean-life.ts)（潜水礁区接入 CC0 Fish Kit GLB 与近距加速逃逸）、[critter-field.ts](../../src/zones/critter-field.ts)（青蛙与蜻蜓接入骨骼/翅脉模型）及 [game.ts](../../src/game/game.ts) 主循环挂载。
- **验证与证据**：新增 [simpond-ecology.test.ts](../../tests/simpond-ecology.test.ts)，`npm run check`、`npm run build` 与全量 `npm test` 全部通过；无头 Chrome 实机确认 0 报错、60 个 SimPond 模型实例（含 13 个骨骼蒙皮网格、23 种生物节点）正常加载与动画播放，留存截图至 `qa/evidence/simpond-*.jpg`。

## 2026-11-27（夜）· 凝露港七项体验精修与碰撞/性能治理

- **1. 去除冗余开始界面，进门/回港直接开玩**：[game.ts](../../src/game/game.ts) 启动及 `?from=` 回港直接进入可操控状态，单目标时光门跳过二次确认卡片；全部 20+ 关卡运行时（`explore`、`runner`、`lander`、`flyby`、`landmark`、`almanac`、`solstice`、`folio`、`ability`、`chronicle`、`atlas`、`mode-world`、`jan01-chapter`、`season-skirmish`、`january-skirmish`、`january-rpg`、`mode-match`、`battle-preview`、`january-defense`、`defense`）均在 `onReady` 后直接进入 `play`。
- **2. 禁用浏览器右键菜单 + 家园右键向前冲刺**：[character.ts](../../src/slime/character.ts) 全局拦截游戏区 `contextmenu`，在家园模式（`homeDash: true`）将右键改为 `17.5 m/s × 0.18 s` 短距离向前突进，采用 `<= 0.06 m` 细步长射线检测 + `moveCapsule` + `support` 贴地防穿模防掉地下；同步更新 [game-ui.ts](../../src/ui/game-ui.ts) 与 [guide-catalog.ts](../../src/ui/guide-catalog.ts) 按键说明。
- **3. Niagara 风格精细粒子技能与斩击特效**：重写 [skill-vfx.ts](../../src/slime/skill-vfx.ts)（2,600 粒子统一 HDR 加法 GPU 粒子系统、5 种程序化粒子贴片、旋涡/引力场与寿命色带渐变、细刃冲击波/旋转法阵/薄膜干涉泡罩/多分支折线闪电/螺旋火柱/冲刺尾迹）并升级 [slash-vfx.ts](../../src/slime/slash-vfx.ts)（360 粒子精细星芒火星替换粗糙八面体碎块）。
- **4. 解决月洞墙卡顿 + 零分配流体表面优化 + 树木不可攀爬 + 建筑屋顶防悬空**：
  - [surface.ts](../../src/slime/surface.ts) 复用 `blurred`/`vals` 类型数组，彻底消除 Marching Cubes 主循环每帧数万次临时数组分配，并在细边缘垂挂时自适应网格密度避免顶点溢出递归重建；[world.ts](../../src/slime/world.ts) 预计算 `CachedBox` 零分配 OBB 查询；[jiangnan.ts](../../src/home/jiangnan.ts) 将 3 面月洞粉墙合并为单 OBB（实测 Chrome WebGL 墙顶解算 `simAvgMs = 6.16 ms`、`meshAvgMs = 1.83 ms`）。
  - [types.ts](../../src/slime/types.ts)、[height-field.ts](../../src/slime/height-field.ts)、[world.ts](../../src/slime/world.ts)、[bake.ts](../../src/world/bake.ts)、[build-catalog.ts](../../src/home/build-catalog.ts)：新增 `Box.climbable` 与 `HeightField.noCling` 掩码，所有树木保持实心阻挡但不可贴墙攀爬，建筑全部保留可攀爬。
  - [prop-structures.ts](../../src/world/linqi/prop-structures.ts)、[builder.ts](../../src/home/builder.ts)、[farm.ts](../../src/zones/farm.ts)、[lake.ts](../../src/zones/lake.ts)：按 GLB 三角网格逐层截面标定全部坡屋顶/攒尖顶建筑为轻量 2 层阶梯碰撞（`build-thatch`、`pack-pavilion`、`build-teahall`、`build-huizhou`、`pack-greenhouse`、`watermill`、`pack-windmill`、`build-red-pagoda`、`waterside-stilt-house`、`pasture-shelter`、`build-covered-bridge`、`build-lighthouse`、`farm-barn`、`lake-pavilion`），去除 `builder.ts` 重复错比例凉亭盒，消除屋檐悬空。
- **5. 场景生物高精度建模**：重构 [critter-field.ts](../../src/zones/critter-field.ts) 全 10 种生物，补齐翅脉蝴蝶、七星鞘翅瓢虫、四翼蜻蜓、池蛙、绒兔、松鼠、刺猬、独角仙、萤火虫与猫头鹰的程序化纹理与多段关节模型。
- **6. 修复镜湖木桶等单面透视模型**：[lake.ts](../../src/zones/lake.ts) 木桶改为 20 段厚壁闭合 `LatheGeometry`；[plaza-life.ts](../../src/zones/plaza-life.ts) 铁锅与招牌改为厚壁/双面实体；[park.ts](../../src/zones/park.ts) 与 [forest.ts](../../src/zones/forest.ts) 蘑菇伞盖改为闭合厚底；[ocean-life.ts](../../src/home/ocean-life.ts) 水母钟罩补齐双面材质。
- **7. 梯田麦田可交互 GPU 倒伏与防穿模**：[farm.ts](../../src/zones/farm.ts) 将静态烘焙麦秆升级为 3 秆弯茎+麦叶+6 面金穗 `InstancedMesh`，接入 `uTime`/`uWind`/`uSlimePos` 实现随风麦浪与史莱姆拨开倒伏交互。
- **验证与证据**：`npm run check`、`npm test`（**1,791 / 1,791 PASS**，含新增 [home-experience-fixes.test.ts](../../tests/home-experience-fixes.test.ts)）、`npm run build` 全通过；无头 Chrome（0 报错）验证并留存多机位截图至 `qa/evidence/home-exp-*.jpg`。下一步待用户本机试玩确认画面、手感与特效观感。

## 12 月 12 日至 16 日 · 六门已逐日登记

三十关均完成三维主场、中段操作、可触发结尾和 F1。复测了每门的正式、练习及 40 个种子；纪念庭用手机画幅从护烛一直点按到纸鹤入水，领取原收藏并确认不计时。港口与史书均已核对原门位回港。本轮最终类型、内容、目录、构建检查及 1,792 项全量测试通过。后续日期从 12 月 17 日开始，实体设备上的画面与手感待玩家确认。[五日制作页](../days/1212-1216-six.md) · [台账](../six-gate-polish.md) · [验收记录](../../tasks/reports/1212-1216-six.md)

## 12 月 7 日至 11 日 · F1 与三十关

五天六门已逐日登记，30 关正式与练习、40 种子、60 次实体门或史书进出均已核对。台账内 16 天、98 个可玩页面均已用键盘和触屏打开帮助。下一项为实体设备试玩。共享工作区的全量测试另有家园月洞墙性能用例未达 25 毫秒，家园任务负责底层修复，本卡保留集成复测。[台账](../six-gate-polish.md) · [实机记录](../../tasks/reports/1207-1211-help.md)

## 12 月 2 日至 6 日 · 六门逐日验收

五天共 30 关已走通正式与练习模式。每关保存五个机位或阶段的截图，并按日核对从港口进门及返回的位置。六号门铝冠收尾改为向上取景，三号门和四号门的铁路双洞保留穿行与接缝回归。当前待玩家在实体设备确认画面与手感。[六门台账](../six-gate-polish.md) · [逐日记录](../../tasks/reports/1202-1206-six.md)

## 11 月 27 日至 12 月 1 日 · 每日六门精修

1 月 1 日及 11 月 27 日至 12 月 1 日共六天，在[六门优化台账](../six-gate-polish.md)均为 6/6。新五天的二至六号门各有可操作的三维主场、中段选择和原收尾；五个日期分别完成后台逐门验收。旧存档、原门位回港和正式／练习分账已复测。下一项是玩家在实体设备上确认画面与手感。[制作页](../days/1127-1201-worlds.md) · [逐日实机报告](../../tasks/reports/season-main-stages.md)

## 2026-11-27（晚）· 凝露港四项核心体验升级（精确 OBB 碰撞 / 海浪浮力摇晃 / 无船自由下潜 / UE 风格 HDR 传送门 VFX）

- **1. 家园建筑与立方体精确 3D/OBB 碰撞修复**：
  - [types.ts](../../src/slime/types.ts)、[world.ts](../../src/slime/world.ts)、[height-field.ts](../../src/slime/height-field.ts)、[bake.ts](../../src/world/bake.ts)：`Box` 原生支持 `yaw` 旋转 OBB（`support`、`projectPoint`、`moveCapsule`、`cast`、`wallHit` 全面支持局部 6 面碰撞）；`HeightField.pushOut` 消除 `0.38–0.45m` 顶部死区并将逃逸搜索半径由 `0.2m` 扩至 `0.5m`；新增 `userData.skipHeightBake` 防止 2.5D 高度场烘焙破坏空心/架空 3D OBB 结构。
  - [prop-structures.ts](../../src/world/linqi/prop-structures.ts)、[build-catalog.ts](../../src/home/build-catalog.ts)、[jiangnan.ts](../../src/home/jiangnan.ts)、[layout.ts](../../src/home/layout.ts)、[portals.ts](../../src/home/portals.ts)、[props.ts](../../src/home/props.ts)、[home-world.ts](../../src/world/home-world.ts) 及 [src/zones/](../../src/zones/)：实测全部 DreamWorld GLB 顶点包络并补齐所有实心建筑与 16 处程序化 POI 的精确多段结构碰撞，修复未列建筑 `0.36` 缩箱与 `0.88` 矮箱问题；为 3 面月洞粉墙（含可通行圆洞与 `y = 1.98` 压顶）、4 座石花坛、临水凉亭、6 扇时光门、史书台及各分区架空/遮檐建筑补齐精确 3D OBB 碰撞。
- **2. 史莱姆与海舟同步海浪起伏摇晃**：
  - [fft-ocean.ts](../../src/home/render/fft-ocean.ts)、[character.ts](../../src/slime/character.ts)、[solver.ts](../../src/slime/solver.ts)、[render.ts](../../src/slime/render.ts)、[pipeline.ts](../../src/home/render/pipeline.ts)、[postprocess.ts](../../src/home/render/postprocess.ts)：新增 CPU–GPU 共用 6 分量方向性 Gerstner 涌浪（含海岸 SDF 近岸衰减），史莱姆在开放海域通过平滑阻尼浮力弹簧紧跟浪峰/浪谷起伏、随浪坡产生微弱漂移，并在 PBF 求解器内按海面法线倾斜粒子晶格且跳过 `SEA_LEVEL - 0.14` 固定平面锁死；海舟改为 3 点波面采样同步纵倾横摇；水下后处理同步相机处实时动态浪高 `uSeaLevel`。同时修复 [pipeline.ts](../../src/home/render/pipeline.ts) 动态分辨率换档时 WebGL2 不可变 `DepthTexture` 未重建导致的 `GL_FRAMEBUFFER_INCOMPLETE_DIMENSIONS (1286)` 黑屏问题。
- **3. 无船自由上浮/下潜与 3D 游泳**：
  - [ocean-adventure.ts](../../src/home/ocean-adventure.ts)、[character.ts](../../src/slime/character.ts)、[game.ts](../../src/game/game.ts)：水深 `>= 0.85m` 时不召唤海舟也可直接按 `C` 潜入水下，松手自然中性悬停，`空格` 上浮、`C/Shift` 下潜，上浮至实时浪面自动无缝切回随浪漂浮（含 `0.28s` 防误跳锁）；水下与海面状态均禁用 `C` 摊开与空中化伞，HUD 提示与深度/海洋生物计数同步更新。
- **4. UE 风格多层 HDR 时光门 VFX 升级**：
  - 新增 [portal-vfx.ts](../../src/home/portal-vfx.ts) 并升级 [portals.ts](../../src/home/portals.ts)：3 层切线空间视差深空星云与双旋涡裂隙、沿精确石拱 SDF 展开的高对比 HDR 事件视界光边（接入真实 `HomePostProcess` 彩色 RGB Bloom 且限制夜曝过白）、外缘细微引力透镜折射、3D 拱内流光丝带（防 `pow` 负数 `NaN` 黑点）、台基星盘符文光池、全 6 门单次合批 264 粒子 GPU 粒子场，以及拱顶棱晶宝石、铜饰环、暖光屋檐灯笼与旋转金环模式徽章，零共面 Z-fighting。
- **验证与多机位视觉证据**：
  - 新增 [home-collision-ocean-portal.test.ts](../../tests/home-collision-ocean-portal.test.ts)，`npm run check`、`npm run build` 与全量 `npm test`（**1,561/1,561 PASS**）均通过；
  - 后台独立无头 Chrome（1280×720 High，0 控制台报错，动态分辨率 `1280→1152` 换档 `glErr: 0`）验证流体史莱姆（6,948 顶点）、月洞墙压顶（`y = 1.98`）常规与贴壁斜看双角度、开放海面随浪起伏、无船按 `C` 下潜至珊瑚中层（`-5.45m`）与 `空格` 自动浮出水面，以及正午/近景悬停/黄昏六门实景，留存 7 张证据至 `qa/evidence/home-upgrade-*.jpg`。
- **下一步**：待用户本机试玩确认建筑碰撞贴合度、海面摇晃与无船下潜手感、以及六扇时光门昼夜观感（预览命令：`npm run build; node scripts/serve.mjs --port=5180`）。

## 2026-11-27 · 1 月 1 日六门手工关卡

- 原入口已接入两章专用玩法和四门专属机关。六关任务卡以 `tasks/cards/jan01-` 为前缀，事实、演绎范围和试玩地址见[1 月 1 日设计页](../days/0101.md)。
- 本机生产预览在 [5190 端口](http://127.0.0.1:5190/?date=0101)。独立无头验收覆盖正式与练习记录、两条折页和放飞路线、两翼射门、旧收藏、首胜及回港位置。[验收报告](../../tasks/reports/jan01-worlds.md) · [实机总览](../../qa/evidence/jan01-six-worlds.jpg)
- 待玩家确认画面与手感。先看印匣试纸的缺角提示与揭纸停留，再看花车迁塔的时机、竖屏落币的可读性和门将的重心变化。

## 2026-11-27（下午）· 凝露港水体与渲染重整（任务卡 [home-water-render](../../tasks/cards/home-water-render.md)）

- **帧图重写**（[pipeline.ts](../../src/home/render/pipeline.ts)）：每帧全场景绘制从约 13 次降到 3 次，分别是云全景分帧切片、一张共享平面反射（斜裁近平面，`REFLECT_MASK` 只画 1、4 层）和主 HDR MSAA 通道。不透明颜色与深度在第一块水体的 `onBeforeRender` 内拷贝；GTAO 改从深度重建法线；PMREM 复用并限频；着色器预热；静态合批；动态分辨率（EMA 0.035）。新增逐帧细节剔除：屏幕上小于 2.5 px 的物体隐藏，回到 3.2 px 再显示。镜像通道跳过整体位于水面下的物体、仅在 1 层的细小实例和镜像分辨率下小于 3.5 px 的物体。[graphics.ts](../../src/game/graphics.ts) 的反射档位已接回新通道。
- **史莱姆倒影修复**：镜像相机只开反射层，史莱姆所在的默认 0 层原先一像素都不画。现在调用 `reflectActor` 前临时开全部层。镜像目标是线性 HDR，史莱姆按显示范围着色，所以经 `actorRT` 做 Reinhard 往返：先映射到显示范围画史莱姆，再写回线性。已在镜像目标中逐像素确认：游泳时露出水面的部分会画出来，水下部分被裁掉。
- **统一水体**（[water-surface.ts](../../src/home/render/water-surface.ts)、[lake-water.ts](../../src/zones/lake-water.ts)、[fft-ocean.ts](../../src/home/render/fft-ocean.ts)）：海、湖、河、塘、水洼共用一套 `WaterShared` 着色，含深度色带、泡沫、闪烁和平面反射，平面反射缺失时回落屏幕空间反射，再回落天空。水洼改为噪声积水，边缘解析淡出，`uWet` 随天气湿度缓变，干燥时只剩湿石，不再是蓝色圆片。海岸接触泡沫改为 fbm 团块；焦散改用双采样旋转并加 mip 偏置，去掉了浅礁上的龟甲网纹。
- **海岸、湖岸与草地**（[island-coast.ts](../../src/world/island-coast.ts)、[terrain-mesh.ts](../../src/world/terrain-mesh.ts)、[grass-ism.ts](../../src/home/foliage/grass-ism.ts)）：去掉静态正弦焦散（网格感的来源）；沙滩加随时间进退的冲刷湿线，湖岸加拍岸湿带。草色降饱和、降荧光。草按距离分层：用 `aRank` 属性加分块 `mesh.count`，14–62 m 内密度降到 30%，超过 104 m 整块不画；草三角形从 4.3M 降到 1.8M。
- **调色**（[calibrated-params.ts](../../src/home/render/calibrated-params.ts)、[postprocess.ts](../../src/home/render/postprocess.ts)）：天空散射重新校准，GTAO 0.5，饱和度 1.08，起雾距离 42 m 改为 180 m，朝“清透绘本海岛”收敛。
- **性能（4K High，无头 RTX 4090）**：基线船上海面 p50 52 ms、p99 133 ms。空闲复测 `qa/evidence/home-perf-after.json` 为 14.4 / 18.2 ms（有一帧 34 ms）。同日再复测 `qa/evidence/home-perf-retest.json`：船上海面 p50 13.9、p99 17.4、最大 19.6、0 次超过 33 ms；出生广场 8.2 / 12、湖边 6.4 / 10、东岸 4.7 / 8.5、飞越 8.2 / 12.1；五处都是 3/3 全场景绘制，零报错。船上海面 p99 仍略高于 16.7 ms。1080p 低档、中档和手机视口的同轮结果在 `home-perf-1080p-low.json`、`home-perf-1080p-medium.json`、`home-perf-phone-low.json`。
- **验证**：`npm run check`、`npm test`（1549/1549，含新增 [home-water-render.test.ts](../../tests/home-water-render.test.ts)）、`npm run build` 通过。截图在 `qa/evidence/home-water-after-*`（干燥）、`home-water-wet-puddles-*`（湿水洼）、`home-water-after-slime-mirror-*`（湖中史莱姆），每处都有常规与贴地斜看两个角度。截图与性能脚本为 [qa-home-water.py](../../scripts/qa-home-water.py) 和 [qa-home-perf.py](../../scripts/qa-home-perf.py)。
- **卡点与注意**：
  - 船上海面受 CPU 和 draw call 限制（主通道约 1033 次、镜像约 390 次），p99 18.2 ms 略超 16.7 ms 目标，30 秒里有一帧 34 ms。下一步可以合批海舟与海洋生物，或把镜像改为隔帧更新。
  - 动态分辨率换档时会重建渲染目标，产生约 35 ms 的卡顿；目前只用慢 EMA 缓解，彻底解决要改成固定大小目标加视口。
  - 无头 GPU 有快慢两种状态，绝对值相差约 2 倍；机器上有其他程序占用 4090 时，测量也会大幅波动（傍晚复测时旧版与新版同样出现 p99 40–100 ms）。只看同一轮内的 A/B 对比。
  - `jiangnan.ts` 往着色器注入 `#include <tonemapping_fragment>`，现在已不起作用；该文件不在本卡范围内，未改。
- **下一步**：等用户本机试玩，确认水色、浪花、水洼和草色的观感，以及 4K 下是否还有掉帧。

## 2026-11-27 · 凝露港家园体验与渲染精修（时光门/雾效/海岸入海/海底后处理与海洋生物/海舟垂钓下潜/蘑菇跳床/建筑与风车地形）

- **1. 时光门防闪烁、移除顶部浮牌、下调交互提示高度 + 轻量风格化雾效**：
  - [pipeline.ts](../../src/home/render/pipeline.ts)：在半分辨率 GTAO 法线通道中自动剔除 `Sprite`、透明/无深度写入材质与 `alphaTest` 植被片，根治时光碎片深色方形黑框、时光门 GTAO 闪烁与远景树叶发脏问题；渲染前钳制 `camera.near >= 0.14` 恢复 3.5× 深度缓冲精度。
  - [portals.ts](../../src/home/portals.ts)：消除拱心石与横梁（`z = ±0.25`）及柱础/台座间的共面重叠，去除门面 8 Hz 噪点，并移除 6 扇门顶部受雾遮挡的 3D 浮牌。
  - [game.ts](../../src/game/game.ts)：将时光门接近时的 `[F]` 提示锚点从 `3.05m` 下调至 `1.25m`（史书台 `1.45m`、一般交互点 `+0.95m`），贴合低矮史莱姆自然视线。
  - [postprocess.ts](../../src/home/render/postprocess.ts)、[garden-stage.ts](../../src/home/garden-stage.ts)、[calibrated-params.ts](../../src/home/render/calibrated-params.ts)：新增 `42m` 起雾距离与陆地远树雾上限，显著减轻晴/雨/雾天雾效与 GTAO 脏感，保持清新明快的风格化通透画面。
- **2. 平滑海岸斜坡入海、海底碰撞、水上水下后处理、预设海洋生物与深海海舟（垂钓 + 按深度下潜）**：
  - [island-coast.ts](../../src/world/island-coast.ts)、[terrain-mesh.ts](../../src/world/terrain-mesh.ts)、[home-world.ts](../../src/world/home-world.ts)、[expansion.ts](../../src/world/expansion.ts)：统一内陆与海岸边界草色、微纹理及解析连续法线，消除硬直海岸接缝；构建平滑 C1 入海斜坡与 4 条外围海岸/海底碰撞带（`buildCoastalCollisionSurfaces`）及外海浮力域（`buildOceanFluidVolumes`），扩充可行走/下潜边界至 `±72m`、`y ∈ [-24, 65]`，走入深海不掉出不重置。
  - [postprocess.ts](../../src/home/render/postprocess.ts) & [fft-ocean.ts](../../src/home/render/fft-ocean.ts)：新增水下 HDR 后处理（光谱吸收、动态海底焦散、水下丁达尔光束、微浮游光点与水波折射）以及双面海面水下斯涅尔之窗（Snell's Window）与全内反射。
  - 新增 [ocean-life.ts](../../src/home/ocean-life.ts) 与 [ocean-adventure.ts](../../src/home/ocean-adventure.ts)（样式见 [ui.css](../../src/ui/ui.css)）：在近海礁台预设海带、珊瑚与 28 只常驻海洋生物（小丑鱼、蓝倒吊、绿海龟、海月水母、蝠鲼、深海灯笼鱼）；游至深海弹出召唤海舟提示，登船后支持 `WASD` 划行、`F` 星露谷式海上垂钓、`C` 潜入海底（`空格` 上浮 / `C`/`Shift` 下潜），下潜时根据距水面实时深度在史莱姆周围程序化生成阳光浅海/珊瑚中层/幽蓝深海对应海洋生物。
- **3. 蘑菇跳床 5 倍冲天弹跳 + 修复“拆开”建筑与压平风车底座山丘**：
  - [park.ts](../../src/zones/park.ts)：蘑菇弹跳竖直初速由 `9.5` 提升至 `23.5 m/s`（约 5.5× 腾空高度）并放宽触发窗口与挤压弹性动画；为风车前平台补齐落地石砌台基。
  - [map.ts](../../src/world/map.ts)：将风车公园 `(20, 64)` 尖顶土丘改为 `r ≤ 4.6m` 水平平顶台地，使风车与前甲板严丝合缝坐落在平地上。
  - [model-pack.ts](../../src/home/model-pack.ts) & [garden-regions.ts](../../src/home/garden-regions.ts)：修补 `build-teahall` 墙顶与屋檐间 `0.21m` 镂空缝及 `pack-pavilion` 檐口接缝，并为全部实体建筑 GLB 自动补齐内缩石砌落地基础裙边防止斜坡悬空；微调风车旁茶舍坐标避让石阶。
- **4. 原神/鸣潮式明亮通透风格化渲染升级**：
  - [postprocess.ts](../../src/home/render/postprocess.ts)：替换为保留明快蓝天与翠绿饱和度的风格化 Filmic 色调映射曲线，新增软阈值 RGB HDR Bloom（太阳/云缘/水光/碎片光晕）、暖阳冷影色温分离、智能鲜明度（Vibrance）与微对比清晰度；调整自动曝光测光权重避免亮天空拉暗地面。
  - [atmosphere.ts](../../src/home/render/atmosphere.ts)、[clouds.ts](../../src/home/render/clouds.ts)、[pipeline.ts](../../src/home/render/pipeline.ts)、[calibrated-params.ts](../../src/home/render/calibrated-params.ts)：提升天蓝冷色半球补光（`hemiIntensity: 0.64`）、海面天光反弹与 IBL 环境反射，调清天顶蔚蓝渐变并提亮体积云白度对比。
  - [terrain-mesh.ts](../../src/world/terrain-mesh.ts)、[grass-ism.ts](../../src/home/foliage/grass-ism.ts)、[climate-material.ts](../../src/home/climate-material.ts)、[park.ts](../../src/zones/park.ts)、[bamboo-ism.ts](../../src/home/foliage/bamboo-ism.ts)、[pbr-materials.ts](../../src/home/render/pbr-materials.ts)：将草坪、草叶、树冠与竹林从偏灰橄榄色升级为明快清透的阳光翠绿/暖金高光，抬高草根 AO 避免暗沉。
- **5. 参考 `crazytoolsteam/ThreeJSAI` 开源案例的草地、三层地形、海岸过渡、实时倒影与垂钓精修**：
  - **调研核实**：`@zavrenn` 的 `Stillwater`（`stillwater.zavrenn.chatgpt.site` 返回 401）与 `Pine & Parcel` 未公开源码；重点拆解了 `ThreeJSAI/showcases` 中直接相关的开源项目 **`dedekpo/stylized-scene`**（WebGPU/TSL 三层 UE 风格路肩过渡、不翻转天空法线草、草地冠层 AO）与 **`Humpalumps/Ultra-Water`**（mipmap 平面反射、沙滩波纹法线、3D 岩壁噪声）。
  - **修复出生点广场异常融合**（[jiangnan.ts](../../src/home/jiangnan.ts)、[terrain-mesh.ts](../../src/world/terrain-mesh.ts)）：根治 `buildQuay` 着色注入顺序早于地形贴图叠加导致的“方形广场被染绿 + X 形石板路穿插”问题；广场改为在 `// __TERRAIN_SPLAT_END__` 后独立绘制暖色灰岩条石，并清零半径 `9.55m` 内的交叉道路权重。
  - **三层 UE 风格 PBR 地形与 3D 法线倒角**（[terrain-splat.ts](../../src/home/render/terrain-splat.ts)、[terrain-mesh.ts](../../src/world/terrain-mesh.ts)）：所有道路采用「草地+冠层 AO → 踩踏暖土/苔藓路肩 → 高度混合 Voronoi 石板+缝隙 AO」三层过渡，接入 `uTurfNorm` / `uFlagNorm` / `uSandNorm` 世界空间法线扰动。
  - **风格化草地重构**（[grass-ism.ts](../../src/home/foliage/grass-ism.ts)）：9 叶弧形草簇、`normal` 与 `nonPerturbedNormal` 同步定向朝上（彻底消除双面黑草）、根部精确采样内陆地形顶点色并叠加冠层 AO、行进风浪高光与视角防锯齿增宽；野花改用正面朝上花瓣避免黑面。
  - **海岸零接缝 + 实时海面角色倒影 + 垂钓细节**（[island-coast.ts](../../src/world/island-coast.ts)、[harbor.ts](../../src/zones/harbor.ts)、[pipeline.ts](../../src/home/render/pipeline.ts)、[fft-ocean.ts](../../src/home/render/fft-ocean.ts)、[ocean-life.ts](../../src/home/ocean-life.ts)、[fishing-spot.ts](../../src/zones/fishing-spot.ts)、[ocean-adventure.ts](../../src/home/ocean-adventure.ts)）：使用逐顶点 `aCoastSand` 保证 `x=31` 边界与内陆着色逐位一致，叠加沙滩波纹法线、620 枚圆润鹅卵石、240 株香蒲芦苇与自然越界草皮，并限制海带高度防止穿出水面；新增半分辨率 mipmap 实时平面反射通道（含 `reflectActor` 映射流体史莱姆、海舟与岛屿）；码头与海舟垂钓补齐 3D 竹竿与浮漂双环涟漪。
- **验证与证据**：`npm run check`、`npm test`（**全量通过**）、`npm run build` 全通过；后台独立无头 Chrome 0 报错验证并留存 `qa/evidence/home-stylized-upgrade.jpg`、`qa/evidence/home-ocean-reflection-shore.jpg`、`qa/evidence/home-bright-stylized.jpg`、`qa/evidence/home-polish-*.jpg`。下一步待用户本机试玩确认画面、手感与是否借助本地 Blender/MCP 替换核心地标与码头资产。

## 2026-11-26 · 凝露港升级为“无限海域岛屿”（AAA 物理渲染管线 / 双级联 GPU FFT 海洋 / ISM 植被 / OKLCH 数学校准）

- **Phase 1（家园独立物理渲染底座，零侵入 `src/slime/`、`src/game/game.ts`、`src/level/stage.ts`）**：新增 [params.ts](../../src/home/render/params.ts)、[calibrated-params.ts](../../src/home/render/calibrated-params.ts)、[atmosphere.ts](../../src/home/render/atmosphere.ts)（Hillaire 2020 Transmittance / Multi-Scattering / Sky-View LUT）、[ibl.ts](../../src/home/render/ibl.ts)（实时天空 PMREM IBL + 海面/地表反弹 GI）、[pbr-materials.ts](../../src/home/render/pbr-materials.ts) 与 [pipeline.ts](../../src/home/render/pipeline.ts)，接入 [garden-stage.ts](../../src/home/garden-stage.ts) 与 [climate-material.ts](../../src/home/climate-material.ts) 雨雪粗糙度联动；`resolvedTarget` 以线性显示空间输出给 `SlimeCharacter.render()`，流体史莱姆零改动完美适配。
- **Phase 2（动态海岸 SDF + 双级联 GPU Stockham FFT 无限海洋）**：新增 [island-coast.ts](../../src/world/island-coast.ts)（动态 `256×256` 岛屿 SDF 与海底深度场 + 分层灰白岩崖/南港东湾沙滩/水下礁石群，随 `FrontierRenderer.sync()` 无限扩建实时外扩，零共面 Z-fighting）与 [fft-ocean.ts](../../src/home/render/fft-ocean.ts)（WebGL2 Ping-Pong Stockham Radix-2 IFFT 双级联 `180m / 31m` JONSWAP 频谱 + 径向 `2800m` CDLOD 网格 + Beer-Lambert 透底碧蓝吸收 + 浪峰 SSS + 贴岸碎浪与日光闪烁路径）；移除旧版硬直 `inland-skirt` 与 2D 远山环；修复 [lake-water.ts](../../src/zones/lake-water.ts) 镜湖倒影隐藏外海网格与切机位即时刷新。
- **Phase 3（AAA 级 ISM 植被系统）**：新增 [foliage-atlas.ts](../../src/home/foliage/foliage-atlas.ts)（`1024×1024` 四象限防黑边 Alpha 植被图集）、[grass-ism.ts](../../src/home/foliage/grass-ism.ts)（`24m×24m` 视锥剔除分块弧形 7 叶草簇 ISM，含行进风浪、史莱姆踩压弯折、距离淡出与逆光金边 SSS）、[tree-ism.ts](../../src/home/foliage/tree-ism.ts)（球面转移软法线 26 跨片阔叶冠与分层松针羽枝 ISM，100% 兼容 `tests/home-waterside.test.ts` 射线单测）与 [bamboo-ism.ts](../../src/home/foliage/bamboo-ism.ts)（常绿海岸竹林与崖缘蕨类 ISM），替换 [kit.ts](../../src/zones/kit.ts)、[forest.ts](../../src/zones/forest.ts) 并为 [harbor.ts](../../src/zones/harbor.ts) 补齐草坡与竹林。
- **Phase 4（体积云与电影级 HDR 后处理）**：新增 [clouds.ts](../../src/home/render/clouds.ts)（半分辨率 20 步 Beer-Powder + 双瓣 HG 光线步进体积云）、[gtao.ts](../../src/home/render/gtao.ts)（Jimenez 2016 半分辨率 GTAO + 深度双边降噪）、[postprocess.ts](../../src/home/render/postprocess.ts)（Multi-Bounce AO + 高度指数体积雾/大气透视/太阳散射 + GPU Log-Luminance 自动曝光 + UE Local Exposure 局部色调映射 + AgX Filmic）；扩展 [graphics.ts](../../src/game/graphics.ts) 四档画质分级，并支持 `?tune=1` 实时物理调参浮层。
- **Phase 5（Steps 4–8 数学驱动 OKLCH 最小二乘校准闭环）**：新增 [oklch.ts](../../src/home/render/oklch.ts)、[targets.json](../../qa/calibration/targets.json) 与 [calibrate-home.py](../../scripts/calibrate-home.py)，实机跑通 2 轮完整雅可比 Levenberg-Marquardt 拟合（`RMSE_OKLCH: 0.2024 → 0.1880`），参数自动写回 `calibrated-params.ts`，并支持日后向 `qa/references/` 放入自定义参考帧一键重拟合。
- **验证与证据**：`npm run check`、`npm test`（**1,542 / 1,542 PASS**，含新增 [home-ocean-pipeline.test.ts](../../tests/home-ocean-pipeline.test.ts) SDF/Stockham IFFT/ISM 几何/OKLCH 与 LM 求解器单测）、`npm run build`、`npm run catalog:check` 全通过；后台独立无头 Chrome（RTX 4090，1280×720 High 档，0 报错）测得均值 **12.77 ms/帧（~78 FPS）**，流体史莱姆网格正常生成（6,972 顶点）且动态扩建海岸重算通过。多机位与校准证据已存至 `qa/evidence/home-ocean-overview.jpg`、`qa/evidence/home-ocean-calibration.jpg`、`qa/evidence/home-ocean-expanded-coast.jpg`。下一步待用户本机试玩确认画面、海浪节奏与手感（可运行 `npm run build && node scripts/serve.mjs --port=5180` 打开 `http://127.0.0.1:5180/` 或加 `?tune=1` 实时微调）。

## 2026-11-25 · 家园长线玩法重构（活的 POI 加工链 / 绘本轻体素建造 / 稀兽遭遇与牧场 / 星露谷进阶垂钓 / 时光博物苑）

- **Phase 1（活的 POI、手工加工链与时光博物苑）**：新增 [artisan.ts](../../src/life/artisan.ts)、[museum.ts](../../src/life/museum.ts)、[poi-visuals.ts](../../src/home/poi-visuals.ts)，扩充 [catalog.ts](../../src/life/catalog.ts)、[cooking.ts](../../src/life/cooking.ts) 与 [build-catalog.ts](../../src/home/build-catalog.ts)。水磨坊、炒茶坊、酿造桶、窑烤面包房、蜂箱（周边 9m 花卉定蜜种）、腌渍缸、织布机支持 20 套 2.5–4× 价值手工加工与元素挥砍/按 F 主动加速出金标；新增露天温泉、观星授时台、乘风热气球台、传送风铃柱、时光博物苑展台；食谱扩至 24 道并接入 15 分钟生活 Buff；新增「凝露港·时光博物苑」6 大展厅捐献与永久港湾增益。
- **Phase 2（绘本风轻体素 / 榫卯积木建造）**：新增 [voxel-catalog.ts](../../src/home/voxel-catalog.ts)（24 款江南绘本与历史主题积木、8 色染色、3 套内置蓝图）、[voxel-mesher.ts](../../src/home/voxel-mesher.ts)（Chunk 面剔除 + 2D Greedy Meshing 零共面 Z-fighting + 3D AABB 碰撞盒自动合并 + 闭合木栅栏牧场自动识别）与 [voxel-engine.ts](../../src/home/voxel-engine.ts)（贴面叠高、Shift 直线拉墙、Alt 吸管、撤销重做、自定义蓝图保存与四季雨雪着色），挂载至 `V` 键「🧱积木」工坊，零改动 `src/slime/`。
- **Phase 3（稀有动物生态遭遇与牧场养殖）**：新增 [ranch.ts](../../src/life/ranch.ts) 与 [ranch-runtime.ts](../../src/home/ranch-runtime.ts)，按季节/天气/时段/历史日生成野外发光稀兽遭遇，支持按 C 潜行/元素共鸣/投喂驯服解锁收养；牧场容量结合牧舍/鹿苑与玩家自建体素围栏牧场自动叠加，支持每日轻抚喂食、亲密度成长、每日产奶/蛋/绒/松露/温泉露及宠物跟随散步；[critter-field.ts](../../src/zones/critter-field.ts) 野外小动物升级为多部件绘本造型。
- **Phase 4（星露谷进阶垂钓、生态鱼塘与每日史事联动）**：升级 [fishing.ts](../../src/life/fishing.ts) 与 [fishing-spot.ts](../../src/zones/fishing-spot.ts) 至 4 大水域、28 种鱼类（含 4 条四季鱼王）、3 阶钓竿、4 种鱼饵、5 种鱼类游动 AI 动态追鱼滑块与水中打捞宝箱（100% 兼容原有经典张力单测）；新增 [fishpond.ts](../../src/life/fishpond.ts)（活鱼繁育、心愿扩容、鱼籽与河珠产出）与 [daily-history-link.ts](../../src/life/daily-history-link.ts)（每日史事风物祝福 + 灯塔潮汐历史漂流瓶）。[life-ui.ts](../../src/ui/life-ui.ts) 升级为 5 页签手账（手账/博物苑/稀兽牧场/工坊集市/全图鉴）。
- **验证与多机位视觉证据**：`npm run check`、`npm test`（**1,538 / 1,538 PASS**，含新增 [home-longterm-systems.test.ts](../../tests/home-longterm-systems.test.ts) 全四期测试与零共面重叠几何断言）、`npm run build`、`npm run catalog:check` 全通过；后台独立无头 Chrome 0 报错验证流体角色、66 块轻体素、1 座自动识别围栏牧场与 8 座活的 POI，留存俯瞰、贴地斜看特写及三套 UI 实景图至 `qa/evidence/home-longterm-*.jpg`。待用户实机试玩确认画面、手感与节奏。

## 2026-11-25 · 镜湖、河道与家园结构修整

- 家园水面接入 Three.js 的 Water2 着色器，使用自制法线、折射场景和包含角色的镜像。镜湖、河道与江南扩建荷塘使用同一材质。入水按速度激起薄水冠、透明飞滴和局部波前，移动才产生尾波。
- 锦鲤在镜湖与荷塘活动，溪鳟在河道游动。首次身体接触登记农鱼图鉴，独立存档重进已核对两种鱼。扩建荷塘的水位、游鱼和圆形物理水域一起随地块增减。
- 晴日保留蓝天、远山和秋日金绿分色。树干伸入主冠，围栏横杆连接两端实际地面高度。月洞门侧墙、廊桥分段桥板、开放建筑和树干采用结构碰撞。实景射线核对了门洞、侧墙和树干旁的空地，廊桥三处桥面支撑高度与可见网格误差均小于 1 毫米。
- 独立版本 `codex/waterside-polish` 通过类型检查、1,533 项测试与生产构建。在独立 Chrome、RTX 4090、800×480 高画质下，同一栈桥机位预热后 21 帧的中位耗时从 8.2 ms 到 8.3 ms。固定相机与时间切换角色倒影，308 个像素的 RGB 最大通道差超过 8。最终画面与手感待玩家试玩。
- [水面同机位对照](../../qa/evidence/home-waterside-dock-comparison.jpg) · [实际入水动图](../../qa/evidence/home-waterside-entry.webp) · [树干近景](../../qa/evidence/home-waterside-after-trunk.jpg) · [侧视](../../qa/evidence/home-waterside-after-side.jpg) · [扩建荷塘](../../qa/evidence/home-waterside-expanded-pond.jpg) · [任务卡](../../tasks/cards/home-waterside.md)

## 2026-11-25 · 软体化伞与全套表情

- 主体与高空自然返回的分身使用已有流体粒子舒展为六瓣伞面，外缘下垂，内侧拱起。现有属性折射、颜色、高光、表情及共享几何的阴影和倒影沿用同一身体。连续开合保留原有输入、回收和下降限速。
- 14 种神态共用圆润眼形、柔和脸颊与渐变嘴形，加入滑翔和鱼咬钩时的惊喜。二段跳、微笑眯眼、安静闭眼、委屈泪珠与单眼俏皮均已在生产构建中取样。事件优先级决定何时打断或恢复日常神态。
- 类型检查、1,529 项自动测试和生产构建均通过。常规与高画质测试比较了软体连通性、展开宽度、中心厚度与收拢状态。独立无头 Chrome 实际按空格开合、空中换属性并落地，核对全部 14 种神态与六属性。美术效果待玩家试玩。[任务卡](../../tasks/cards/slime-glide-form.md) · [空中实录](../../qa/evidence/slime-face-glide.webp) · [表情一览](../../qa/evidence/slime-face-expressions.jpg) · [展开过程](../../qa/evidence/slime-glide-form.jpg)

## 2026-11-25 · 家园接触效果与每日探索

- 火属性使用有上升、摆动和消散过程的独立粒子，雷属性按实时脚底接触生成分支电弧。两者均跳过湿痕图集和墙面留痕。其余元素贴墙攀爬时，可在墙面看到随时间消退的接触痕迹。
- 雨丝、水圈和溅起的水珠共用落点。镜湖、河面和积水引用实时流体网格绘制倒影。房屋按可见表面深度遮挡背景轮廓。水属性改为蓝色，风属性使用原水属性的淡绿色透光参数。旧档圆球转换为钟型，8 键进入天气时间面板。
- 六扇门每门每日首胜 8 贝壳，12 枚碎片各 3 贝壳。独立浏览器验证了实际购买扩建、在新地块拾取、重进保留账目与点位。日期使用北京时间，修改天空时刻不影响奖励刷新。
- 类型检查、1,526 项自动测试与生产构建通过。
- 后台实景验证了火、雷在移动时均为零地面留痕，起跳后电弧消失。房屋遮挡对照中，墙后测试物没有改变墙面采样区的像素，隐藏墙体后同区出现 458 个明显变化像素。镜湖同机位切换角色倒影后，脸和身体下缘均有可辨差异。常规与侧面机位均已留存。最终美术与手感待玩家试玩。[任务卡](../../tasks/cards/home-contact-rewards.md) · [雷电实景](../../qa/evidence/home-feedback-volt.jpg) · [火焰实景](../../qa/evidence/home-feedback-fire.jpg) · [雨滴落点](../../qa/evidence/home-feedback-rain-water.jpg) · [贴墙](../../qa/evidence/home-feedback-wall.jpg) · [贴墙侧视](../../qa/evidence/home-feedback-wall-side.jpg)

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
