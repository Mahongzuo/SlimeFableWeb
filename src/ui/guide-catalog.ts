/**
 * Data-driven, extensible Gameplay Guide & Tutorial Registry.
 *
 * Adding a future feature / ARPG dungeon / minigame to both the Title Screen & ESC Pause tutorials
 * requires ZERO UI changes: either append a GuideSection to BUILTIN_GUIDE_SECTIONS or call
 * `registerGuideSection(section)` at startup.
 */

export interface GuideKeybind {
  keys: string[];
  label: string;
}

export interface GuideCard {
  icon: string;
  title: string;
  tag?: string;
  summary: string;
  bullets?: string[];
}

export interface GuideSection {
  id: string;
  order: number;
  icon: string;
  title: string;
  badge?: string;
  subtitle: string;
  keybinds?: GuideKeybind[];
  cards: GuideCard[];
  tip?: string;
}

export const BUILTIN_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'movement',
    order: 10,
    icon: '🫧',
    title: '移动、形态与滑翔伞',
    badge: '基础',
    subtitle: '掌握果冻软体物理、钟型切换、二段跳滑翔伞与过肩分身炮弹。',
    keybinds: [
      {keys: ['W', 'A', 'S', 'D'], label: '移动'},
      {keys: ['Shift'], label: '冲刺'},
      {keys: ['空格'], label: '二段跳 / 空中开伞'},
      {keys: ['8'], label: '钟型 / 圆球形态'},
      {keys: ['C'], label: '摊开钻缝'},
      {keys: ['G', '右键'], label: '过肩瞄准 + 左键发射分身'},
      {keys: ['X'], label: '按住收回分身'},
      {keys: ['T'], label: '脱离墙面 / 卡住复位'},
    ],
    cards: [
      {
        icon: '☂️',
        title: '二段跳与六属性滑翔伞',
        tag: '高空探索',
        summary: '起跳后再次按空格完成二段跳，在空中第三次按空格即可展开对应属性的 3D 滑翔伞平稳滑翔。',
        bullets: [
          '开伞后下落速度迅速刹降至 1.8 m/s，适合从宝塔和风车高处俯瞰水巷与田野。',
          '按住 X 召回高空分身时，分身也会自动撑起迷你滑翔伞慢慢飘回！',
        ],
      },
      {
        icon: '🎯',
        title: '分身发射与黏合回收',
        tag: '物理机关',
        summary: '按住 G 或鼠标右键进入过肩瞄准视角，屏幕中心出现四段准星，左键可发射最多 5 团分身（射程 40m）。',
        bullets: [
          '分身可用来压住远处的机关踏板、在关卡中协助触发连携。',
          '按住 X 键可将散落的分身吸回本体，靠近后触发丝滑液体融球。',
        ],
      },
      {
        icon: '🧗',
        title: '贴墙攀爬与钟型形态',
        tag: '探索技巧',
        summary: '朝墙面持续推近即可黏附攀爬，爬到顶端自动翻上；按 8 可随时在 UE 钟型果冻与经典圆球间切换。',
        bullets: [
          '按住 C 可将身体摊平，轻松钻过低矮门洞或栅栏缝隙。',
          '贴墙时按空格蹬墙跳，按 T 可立即松手下落。',
        ],
      },
    ],
    tip: '小提示：水属性史莱姆在海面与镜湖里游得最快；建造大风车或红宝塔后爬到顶端再撑伞，可以滑翔飞越整片港口！',
  },
  {
    id: 'combat',
    order: 20,
    icon: '⚔️',
    title: '六属性 ARPG 战斗与反应',
    badge: 'ARPG',
    subtitle: '六大史莱姆职业定位、四段刀光连击、E / R / Q 技能与 11 种元素反应。',
    keybinds: [
      {keys: ['1', '6'], label: '切换水/风/火/雷/暗/物（1秒冷却）'},
      {keys: ['左键'], label: '四段元素刀光连击'},
      {keys: ['E'], label: '属性战技（短 CD）'},
      {keys: ['R'], label: '连携 / 控场技（中 CD）'},
      {keys: ['Q'], label: '元素爆发大招（需 100 能量）'},
    ],
    cards: [
      {
        icon: '💧',
        title: '水 · 中程控场法师',
        tag: '远程 / 挂水',
        summary: '擅长中远距离稳定附着「水」元素，为蒸发与感电反应铺场。',
        bullets: [
          'E 水泡弹：发射高速晶莹水泡球，命中炸开水花。',
          'R 潮汐鞭扫：270° 大范围流体横扫并击退周围敌人。',
          'Q 苍穹泡泡爆：张开巨型透明水幕穹顶 + 漫天泡泡雨爆裂。',
        ],
      },
      {
        icon: '🍃',
        title: '风 · 高速近战刺客',
        tag: '位移 / 扩散',
        summary: '超高机动性与聚怪能力，轻松触发各类扩散连锁反应。',
        bullets: [
          'E 疾风突进：化作青色风带瞬间前冲 4.5m 穿透敌人。',
          'R 风刃回旋：卷起多层翠绿龙卷牵引并持续风切。',
          'Q 翠啸飓风斩：超长贯穿冲刺并在终点引爆十字风暴。',
        ],
      },
      {
        icon: '🔥',
        title: '火 · 爆破元素法师',
        tag: '爆发 / 蒸发',
        summary: '核心高伤爆破位，配合水/雷附着打出惊人倍率伤害。',
        bullets: [
          'E 熔岩火球：投掷拖尾火球，命中引发炽烈火环溅射。',
          'R 烈焰突袭：裹挟烈焰猛冲，引爆沿途火星。',
          'Q 岩浆怒炎阵：脚下展开熔岩法阵，升起冲天火柱群！',
        ],
      },
      {
        icon: '⚡',
        title: '雷 · 链式雷电法师',
        tag: '弹射 / 群攻',
        summary: '精准天雷打击与多目标弹射电链，清场效率极高。',
        bullets: [
          'E 落雷天罚：在前方目标位置劈下紫色锯齿天雷柱。',
          'R 链式电弧：最多在 4 个目标间连续弹射高压电链。',
          'Q 雷霆万钧域：展开大范围雷阵，连续轰下 5 道天雷！',
        ],
      },
      {
        icon: '🌑',
        title: '暗 · 咒术领域召唤',
        tag: '持续域 / 陨石',
        summary: '以黑洞持续领域与高空陨石掌控战场节奏。',
        bullets: [
          'E 虚空暗弹：发射黑紫重力法球，命中爆发暗影侵蚀。',
          'R 深渊暗雾域：生成持续 4 秒的墨紫领域不断造成暗伤。',
          'Q 陨暗星石砸：从天空召唤巨型暗影陨石轰砸大地！',
        ],
      },
      {
        icon: '🪨',
        title: '物 · 重装破韧战士',
        tag: '破防 / 剑气',
        summary: '刚猛击飞与稳定破韧，能对任何附着元素触发额外破防重击。',
        bullets: [
          'E 重锤震击：膨胀重砸前方地面，超高削韧击飞。',
          'R 裂地剑气劈：挥出高速穿透前进的金白巨型月牙剑气。',
          'Q 天崩巨锤砸：跃起蓄力下砸，掀起环形岩石地震波！',
        ],
      },
    ],
    tip: '实战连招提示：切属性有 1.0 秒冷却，刚好用来「先挂元素 → 切属性打反应」！可在风车公园边缘的 3 座练功木靶上自由演练蒸发（水+火 ×1.5）、感电（水+雷）、超载（火+雷）等全部 11 种反应。',
  },
  {
    id: 'farming',
    order: 30,
    icon: '🌾',
    title: '农田种植与 32 种作物',
    badge: '农耕',
    subtitle: '自由摆放高架农田、体验 32 种特色作物与六属性元素农耕互动（含摧毁与催熟）。',
    keybinds: [
      {keys: ['F'], label: '打开选种面板 / 照料 / 收获'},
      {keys: ['V'], label: '在「农田」页签摆放种植床'},
      {keys: ['左键', 'E/R/Q'], label: '元素刀光与技能直接影响农田'},
    ],
    cards: [
      {
        icon: '🌱',
        title: '三款可自由摆放农田',
        tag: '随处开垦',
        summary: '除西侧原有的梯田外，你可以在草地、院落甚至新扩建的领土上自由摆放高架农田。',
        bullets: [
          '木框高架农田（8🐚）：入门实惠，3×2 植株排布。',
          '石砌庭院花床（16🐚）：4×3 排布，自带防杂草护边。',
          '大型肥沃田垄（26🐚）：5×3 排布，每次收获额外 +1 产量！',
        ],
      },
      {
        icon: '🍅',
        title: '32 种作物与选种面板',
        tag: '丰富图鉴',
        summary: '靠近空田按 F 弹出选种面板（支持一键再种同款），农场入口种子铺可按蔬果/瓜果/谷茶/花卉/元素特产自由选购。',
        bullets: [
          '作物拥有叶菜、高秆、藤蔓瓜、灌木果、花穗、根茎菌 6 大差异化 3D 外观。',
          '摆放「玻璃温室」可常驻解锁全部稀有种苗；「元素洒水泉」用雷属性充能可自动保水 12 小时。',
        ],
      },
      {
        icon: '🔥',
        title: '元素攻击互动与摧毁机制',
        tag: '小心挥刀',
        summary: '按 F 是安全的温和照料，而左键刀光与 E/R/Q 技能会带来强力元素冲击！',
        bullets: [
          '🔥 火击：非喜火作物 1 刀直接「烧毁」；喜火作物（火辣椒/向日葵等）加速；浇水 8 秒内接火触发「♨️ 蒸汽温室」大幅加速！',
          '💧 水击：干土首击强力浇透；怕涝作物（火辣椒/薰衣草/咖啡）、已湿润作物再砍或终结水浪会直接「🌊 冲毁」。',
          '⚡ 雷击：干田直接「劈毁」；水后 8 秒内接雷触发「⚡ 雷击催熟 ✨」直接升级金色变异！',
          '🍃 风授粉催生金色高价果实；🌑 暗注入高肥力产量 +1；🪨 物一刀斩清枯苗。',
        ],
      },
    ],
    tip: '致富秘诀：种下作物 → 水属性浇透 → 8 秒内切雷属性轻击触发「雷击催熟 ✨」变成金色变异，收获再拿去收购站或做料理能赚大量贝壳！',
  },
  {
    id: 'building',
    order: 40,
    icon: '🏡',
    title: '家园建造与无限领土扩建',
    badge: '无限扩建',
    subtitle: '从书埠北侧接铺石径，把凉亭和院落沿路展开，也可以向外开垦新地块。',
    keybinds: [
      {keys: ['V'], label: '进入 / 退出家园建造模式'},
      {keys: ['W', 'A', 'S', 'D'], label: '建造镜头平移'},
      {keys: ['右键拖动'], label: '旋转建造视角'},
      {keys: ['Q', 'E'], label: '旋转当前摆放物件'},
      {keys: ['R'], label: '切换 85% / 100% / 120% 缩放'},
      {keys: ['左键'], label: '摆放物件 / 点击绿色边疆地块'},
    ],
    cards: [
      {
        icon: '🏮',
        title: '自由造景与一键景组',
        tag: '30+ 建筑植物',
        summary: '包含江南亭台、徽派民居、临水茶馆、水磨坊、灯塔、红宝塔与丰富水岸植物；拆除 100% 退还贝壳。',
        bullets: [
          '用「铺地」续接青石径、土路或种植带。点「移动」可连作物一起移走农床，撤销和重做保留到退出本次建造。',
          '建造卡片右上角标有「🐾 吸引动物」提示，方便快速凑齐生态组合。',
          '选景组可整组预览小菜园、竹影小院或海岬灯塔，点击可用位置一次扣费摆放。',
        ],
      },
      {
        icon: '🗺️',
        title: '无限自由领土扩建',
        tag: 'DreamWorld 融合',
        summary: '在建造栏切换到「🗺️ 扩建领土」，向北、向西与东岬外可无上限逐格向外蔓延开垦！',
        bullets: [
          'WASD 平移镜头会自动刷新周边 8 块绿色虚线边疆，点击即可选择地貌主题。',
          '支持 4 种主题：🌾 沃土农庄 / 🏮 江南水乡 / 🌲 林缘牧场 / 🏖️ 潮汐花岬，开垦即附带天然树水景并无缝通行。',
          '首块扩建完全免费，后续封顶 50 🐚/块；右侧还可一键开启「🏖️ 自由沙盒模式」0 消耗无限建图！',
        ],
      },
    ],
    tip: '小提示：时光门广场与史书台附近为保护区不可摆放建筑，其余草地、湖岸、农田与所有新开垦领土均可随心建造。',
  },
  {
    id: 'ecology',
    order: 50,
    icon: '🐾',
    title: '生态来客、钓鱼与家园手账',
    badge: '休闲养成',
    subtitle: '打造自然栖息地吸引 10 种动画小动物来访，完成每日手账、钓鱼与料理。',
    keybinds: [
      {keys: ['B'], label: '打开家园手账 / 背包 / 图鉴 / 来客'},
      {keys: ['F'], label: '投喂小动物 / 钓鱼 / 烹饪 / 交委托'},
    ],
    cards: [
      {
        icon: '🦊',
        title: '10 种栖地生态来客',
        tag: '自动来访',
        summary: '在建造模式摆出对应生态组合（或扩建水乡/牧场/海岬领土），动物会自动前来家园漫步！',
        bullets: [
          '例：睡莲 + 芦苇 → 青莲池蛙；翠竹×2 + 凉亭/月洞门 → 小熊猫；牧场木棚 + 树×2 → 梅花鹿。',
          '按 B 切到「生态来客」可查看全部 10 只动物的实时解锁进度。',
          '靠近小动物按 F 投喂它最爱的作物，每天都会回赠稀有种子与繁荣经验！',
        ],
      },
      {
        icon: '🎣',
        title: '钓鱼、小厨与每日委托',
        tag: '贝壳来源',
        summary: '柳岸钓台、南溪浅湾与镜湖的三处钓点可垂钓 10 种鱼类（含雨天鳗鱼、清晨金鳟与史书鱼）。',
        bullets: [
          '公园门口「凝露小厨」切火属性（3）可将作物与渔获做成高价料理。',
          '「委托板」每天刷新 3 个订单，配合 B 键每日手账任务可快速升级家园 Lv.1~Lv.10 并解锁高级地标。',
        ],
      },
      {
        icon: '✦',
        title: '收集 12 枚时光碎片',
        tag: '港口探索',
        summary: '从书埠石径到水巷、茶坡和南溪浅水，沿路可以找齐 12 枚发光的时光碎片。',
      },
    ],
    tip: '小提示：放一座「史书纪念展台」在院子里，按 F 可以把自己通关历史关卡拿回来的纪念品摆出来展示！',
  },
  {
    id: 'portals',
    order: 60,
    icon: '📖',
    title: '历史上的今天与六扇时光门',
    badge: '关卡挑战',
    subtitle: '穿过港口广场的六扇时光门，体验 366 天历史故事与三大固定玩法挑战。',
    keybinds: [
      {keys: ['J'], label: '随时翻开 / 合上史书'},
      {keys: ['F'], label: '靠近时光门或史书台互动'},
    ],
    cards: [
      {
        icon: '🚪',
        title: '1–2 号门 · 历史故事',
        tag: '366 天档案',
        summary: '按年份展出当天发生的历史事件关卡（涵盖登月、探索、接力、节奏、解谜等多样模板）。',
        bullets: [
          '通关后点亮史书记录并获得专属历史纪念品。',
          '按 J 打开史书日历，可任意切换港口展出的日期，游玩全年 640+ 历史章节！',
        ],
      },
      {
        icon: '🎮',
        title: '3–6 号门 · 每日固定玩法',
        tag: '塔防 / 三消 / 射击 / RPG',
        summary: '四扇门各有固定玩法，正式与练习成绩分别保存。',
        bullets: [
          '3 号门：史莱姆塔防，在五条线路上部署元素塔，守护当天的历史任务。',
          '4 号门：元素三消（支持鼠标/单指拖动，连消触发横竖纹、爆芯与虹彩特效）。',
          '5 号门：分身交火挑战（考验过肩瞄准、分身投射与走位）。',
          '6 号门：战斗 RPG 试炼（六属性战斗与技能实战）。',
        ],
      },
    ],
    tip: '未来新增的 ARPG 地下城、Boss 讨伐或其他新玩法模块，都将自动收录在本教程手册的新增章节中！',
  },
];

const extraSections: GuideSection[] = [];

/**
 * Extensibility API: future gameplay modules can register their own tutorial section
 * at runtime without modifying GameUI or CSS.
 */
export function registerGuideSection(section: GuideSection) {
  const idx = extraSections.findIndex(s => s.id === section.id);
  if (idx >= 0) extraSections[idx] = section;
  else extraSections.push(section);
}

/** Returns all built-in + dynamically registered tutorial sections sorted by `order`. */
export function getGuideSections(): GuideSection[] {
  const byId = new Map<string, GuideSection>();
  for (const s of BUILTIN_GUIDE_SECTIONS) byId.set(s.id, s);
  for (const s of extraSections) byId.set(s.id, s);
  return [...byId.values()].sort((a, b) => a.order - b.order);
}
