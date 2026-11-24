import type {Vec} from '../slime/types';
import {rng} from './random';
import {alongStroke,type MapStroke} from './january-layout';
import {februarySkirmishSpecs} from './february-skirmish';
import {marchSkirmishSpecs} from './march-skirmish';
import {aprilSkirmishSpecs} from './april-skirmish';
import {maySkirmishSpecs} from './may-skirmish';
import {juneSkirmishSpecs} from './june-skirmish';
import {octoberSkirmishSpecs} from './october-skirmish';
import {julySkirmishSpecs} from './july-skirmish';
import {augustSkirmishSpecs} from './august-skirmish';
import {septemberSkirmishSpecs} from './september-skirmish';
import {novemberSkirmishSpecs} from './november-skirmish';
import {decemberSkirmishSpecs} from './december-skirmish';

export type SkirmishDay = string;
export type SkirmishStyle = 'air' | 'sport' | 'facade' | 'space' | 'workshop' | 'maritime' | 'court';
export type SkirmishBonus = 'high' | 'cross' | 'pin';
export type Lane = -1 | 1;
export interface FloorTile {x: number; z: number; width: number; depth: number; near: number; far: number}
export interface SkirmishSpec {
  style: SkirmishStyle;
  bonus: SkirmishBonus;
  routes: [string, string];
  names: [string, string, string, string];
  prompt: string;
  finale: string;
  tactic: string;
  banner: [string, string];
  sky: [string, string];
  floor: string;
  accent: string;
}
export interface Course extends SkirmishSpec {
  day: SkirmishDay;
  spawn: Vec;
  end: Vec;
  pad: Vec;
  tiles: FloorTile[];
  anchors: Vec[];
  phases: number[];
}

function sk(
  style: SkirmishStyle,
  bonus: SkirmishBonus,
  routes: [string, string],
  names: [string, string, string, string],
  prompt: string,
  finale: string,
  tactic: string,
  banner: [string, string],
  sky: [string, string],
  floor: string,
  accent: string,
): SkirmishSpec {
  return {style, bonus, routes, names, prompt, finale, tactic, banner, sky, floor, accent};
}

export const skirmishSpecs: Readonly<Record<string, SkirmishSpec>> = {
  '0101': sk('air', 'high', ['近岸浮台', '船棚高廊'], ['试风球', '西岸风向标', '棚顶风向标', '放行信号'],
    '进入栈桥尽头的金环拉响放行铃', '水上飞机离开坦帕湾', '高廊顺风射击加力，浮台可留守风标',
    ['ST. PETE • TAMPA', '1914 FIRST FLIGHT'], ['#78a5b7', '#ffd4a0'], '#bc8c61', '#de7653'),
  '0102': sk('space', 'pin', ['外框稀尘格', '中央尘束窗'], ['冰蓝校准粒', '左格捕尘点', '右格高速尘', '采样闭合闩'],
    '走进采样台金环手动合拢捕集板', '维尔德二号彗尘入格', '在青环留守分身可放缓高速尘束，便于瞄准',
    ['STARDUST • WILD 2', 'DUST CAPTURED'], ['#162440', '#7084a6'], '#586c82', '#6bd3e8'),
  '0103': sk('workshop', 'pin', ['近岛版架', '远岛墨道'], ['岛孔试印', '西湾木版', '串珠远岛', '版辊总闸'],
    '走到群岛桌金环转动版辊印图', '阿拉斯加群岛轮廓显现', '青环留守可截住逆行墨滴并加速点亮远岛',
    ['ALASKA • 1959', 'STATE MAP PRINT'], ['#4f768c', '#ebd9bd'], '#968268', '#d47c4a'),
  '0104': sk('space', 'high', ['岩缝低道', '岩脊高台'], ['花瓣解锁标', '左翼太阳板', '岩脊远标', '坡底展开柄'],
    '走到坡底金环按下展开柄', '勇气号六轮驶下着陆台', '登上右侧岩脊射击可隔石加力，左道便于回收',
    ['SPIRIT • GUSEV', 'ROVER DEPLOYED'], ['#7e4437', '#ebb07f'], '#ad6e52', '#f2bd6b'),
  '0105': sk('space', 'pin', ['左星图夹', '右叠片窗'], ['参考恒星', '首帧底片点', '次帧位移点', '坐标锁格'],
    '走到灯箱金环锁上星图坐标格', '阋神星短弧轨迹连成', '留分身守参考星，再移动追踪叠片间的细微位移',
    ['PALOMAR • 2005', 'ERIS ARC LOCKED'], ['#1a223b', '#6d7599'], '#49536d', '#9dd8f0'),
  '0106': sk('space', 'high', ['阴影沟槽', '沙纹脊顶'], ['首道亮沙纹', '背风影靶', '长条脊顶靶', '俯拍取景框'],
    '走到俯拍框金环还原火星纹理', '火星斑马纹沙丘成像', '登上沙脊射击长影靶加力，沟槽便于安全回收',
    ['MARS • 2021', 'ZEBRA DUNES'], ['#6e3f35', '#e5a373'], '#b56e4d', '#f0c684'),
  '0107': sk('space', 'high', ['低处观测架', '屋顶长视轴'], ['镜筒校光灯', '木卫一视点', '木卫二视点', '观测簿封扣'],
    '走到观测簿金环记录木星卫星', '伽利略观测页印成', '屋顶视轴高处射击加力，避开中央明亮木星盘',
    ['PADUA • 1610', 'JUPITER MOONS'], ['#1d2b45', '#878fa6'], '#656c78', '#f2d079'),
  '0108': sk('space', 'pin', ['内旋臂道', '外旋臂廊'], ['棒心亮结', '内臂星团', '外臂星团', '成像定格环'],
    '走到成像环金环收入完整旋臂', 'NGC 1365 棒旋星系成形', '青环留守分身可同步双臂星结的闪烁节奏',
    ['NGC 1365 • 2021', 'SPIRAL IMAGED'], ['#171f38', '#686b94'], '#4c546e', '#e8a85c'),
  '0109': sk('maritime', 'high', ['放球院低路', '屋顶观风廊'], ['首只风筒', '西侧气流靶', '屋顶回旋靶', '末根系绳桩'],
    '走到风向台金环放开系绳', '布朗夏尔气球越过费城', '登上屋顶高廊顺风射击加力，低路便于逐个校准',
    ['PHILADELPHIA • 1793', 'BALLOON ALOFT'], ['#5a84a3', '#f5d9b5'], '#ad8c6b', '#d9694c'),
  '0110': sk('workshop', 'pin', ['左岔桶道', '右岔账台'], ['铜铃试敲', '西道桶签', '东道转盘', '铁路车厢闩'],
    '走到铁路栈台金环扣上车厢门', '标准石油运单压上日期', '留分身在青环自动拨桶，加快两侧货签校准',
    ['CLEVELAND • 1870', 'WAYBILL STAMPED'], ['#546d7a', '#e6d3b5'], '#8d7a64', '#cf7d46'),
  '0111': sk('maritime', 'high', ['中线夜航道', '高台进近灯'], ['首盏航标灯', '海雾闪灯', '高台进近灯', '奥克兰岸灯'],
    '走到对岸灯列金环点亮终灯', '跨洋单飞抵达奥克兰', '攀上右侧高台可看清雾后双排航灯并获得加力',
    ['HONOLULU • OAKLAND', '1935 SOLO FLIGHT'], ['#1a2b44', '#587899'], '#4d677a', '#f4c86c'),
  '0112': sk('space', 'pin', ['飞掠器轨道', '撞击器平衡架'], ['双舱校准环', '飞掠器测点', '撞击器测点', '发射倒数窗'],
    '走到倒数窗口金环合拢轨迹', '深度撞击号双舱升空', '青环留守分身同步双舱读数，显著提升击破效率',
    ['DEEP IMPACT • 2005', 'LAUNCH WINDOW'], ['#1b2a47', '#7b92b0'], '#58697c', '#74c8e0'),
  '0113': sk('workshop', 'pin', ['个位转轮台', '上层进位桥'], ['个位训练齿', '低位拨杆', '进位弹回珠', '十位闩杆'],
    '走到十位显示窗金环拨下闩杆', '加法机双数轮依次进位', '留分身稳住个位青环，使上层进位珠减速变稳',
    ['SPALDING • 1874', 'CARRY GEAR SET'], ['#536973', '#e8d7b8'], '#8a7b66', '#d89b4c'),
  '0114': sk('sport', 'cross', ['短传边线', '交叉接应区'], ['热身接应手', '边线接应手', '交叉接应手', '端区接应手'],
    '走进端区的金环确认达阵', '终场记分牌 · 14 比 7', '跨边线斜传加力，可在左边线留一名接应手',
    ['MIAMI    •    WASHINGTON', '14   :   7'], ['#6994b5', '#f6e9d5'], '#559372', '#de7653'),
  '0115': sk('space', 'high', ['支架低通道', '上风高沙坡'], ['模拟着陆圈', '左伞绳标', '上风抗跳标', '封存托架锁'],
    '走到封存台金环合上回收托架', '星尘号返回舱稳落盐滩', '走右侧上风坡射击加力，低道可缩小靶标摆幅',
    ['UTAH DESERT • 2006', 'SAMPLE SEALED'], ['#6b889e', '#f2dec0'], '#c4ab88', '#d97648'),
  '0116': sk('court', 'cross', ['蓝线折角道', '门后回传槽'], ['边板反弹标', '左蓝线接应', '门后回传标', '门前空隙靶'],
    '走进门前金环确认冰球破门', '终场记分牌 · 5 比 2', '跨区斜传打门加力，绕后回传拉开防守陪练',
    ['RANGERS  •  KRAKEN', '5   :   2'], ['#4d7999', '#e5eef2'], '#b7d6e0', '#cf564a'),
  '0117': sk('maritime', 'high', ['绳桥低甲板', '浮冰观测台'], ['首块漂冰标', '左舷冰缘标', '六分仪测点', '南极圈纬盘'],
    '走到纬线圆弧金环旋正纬盘', '双桅帆影越过南极圈', '登上右舷观测台射击加力，浮冰低道便于回收',
    ['ANTARCTIC • 1773', '66°33′ S CROSSED'], ['#3e6c8c', '#dcecf2'], '#88a7b5', '#e8b95f'),
  '0118': sk('court', 'cross', ['底角短传线', '斜线空切道'], ['近传练习标', '左底角空位', '右翼空切位', '篮下标靶'],
    '走到篮架下金环完成末次传接', '1896 五人半场收官', '跨半场斜传加力，拉动陪练露出底角与篮下空位',
    ['CHICAGO  •  IOWA', 'FIVE-ON-FIVE 1896'], ['#5d788a', '#f2dfc0'], '#b58a5b', '#cf6544'),
  '0119': sk('workshop', 'pin', ['前层活动窗', '后层重叠廊'], ['图标校准点', '左窗口边角', '右菜单栏靶', '桌面文件井'],
    '走到文件井金环归档找回文件', 'Lisa 图形桌面窗序还原', '青环留守分身锁定窗口层级，方便击中露出的图标角',
    ['LISA GUI • 1983', 'WINDOW ARCHIVED'], ['#5b7285', '#e6e0d2'], '#8d969c', '#4da3c4'),
  '0120': sk('space', 'pin', ['内轨道环', '外侧观察台'], ['静止轨道标', '内环刻线靶', '外环错位靶', '交会对接闩'],
    '走到对接接口金环压下对接闩', '轨道交会双环标心相合', '青环留守分身减缓双环错位速度，精准对准刻线',
    ['RENDEZVOUS • 1930', 'ORBIT ALIGNED'], ['#1a2942', '#7e93b0'], '#58697d', '#f0c46c'),
  '0121': sk('maritime', 'high', ['窄弯内道', '长弯外坡'], ['出发路线牌', '山弯导向标', '计时亭远靶', '港湾终点旗'],
    '走到港湾终点金环翻开路书', '摩纳哥拉力赛三线抵港', '沿外坡高路射击视野开阔并加力，内道便于回收',
    ['MONACO • 1911', 'RALLY ARRIVAL'], ['#4b7e9c', '#f5dfc0'], '#968f84', '#d46148'),
  '0122': sk('maritime', 'high', ['舱内旋梯道', '外侧登机廊'], ['廊桥引导灯', '下层舷窗灯', '上层机首窗', '登机桥总阀'],
    '走到上层舱顶金环合上登机桥', '波音 747 窗带逐层亮起', '外侧高桥俯瞰整排窗灯加力，旋梯便于回收分身',
    ['NEW YORK • LONDON', '747 INAUGURAL'], ['#4b7fa3', '#f2e3cd'], '#8898a3', '#d97a48'),
  '0123': sk('space', 'pin', ['近窗透光道', '双窗交集廊'], ['前景校准星', '左旋臂光斑', '右旋臂光斑', '三窗合成台'],
    '走到总合成台金环合拢三层遮罩', 'Arp 274 三重星系成像', '留分身守近窗青环，同步减缓双窗交集处的光斑移动',
    ['ARP 274 • 2023', 'TRIPLET MERGED'], ['#182038', '#736f96'], '#4a506b', '#88d4e8'),
  '0124': sk('workshop', 'pin', ['逐列描边道', '反色通道廊'], ['首块像素格', '左选区边角', '右反色格标', '软盘保存槽'],
    '走到磁盘出口金环点下保存', 'Macintosh 单色像素印成', '青环留守可锁定像素通道，精准点亮反色方块',
    ['MACINTOSH • 1984', 'BITMAP SAVED'], ['#546878', '#e6e3d8'], '#999b96', '#3d7999'),
  '0125': sk('workshop', 'pin', ['近端接线台', '分段铜线架'], ['纽约近端孔', '中继铜担靶', '西岸回波靶', '旧金山听筒'],
    '走到旧金山听筒金环摇动手柄', '横贯美国大陆通话接通', '在青环留守分身抵消线路回波，加快远端膜片接通',
    ['NY  —  SF • 1915', 'LINE CONNECTED'], ['#546e78', '#ecd7b6'], '#968166', '#d48b48'),
  '0126': sk('maritime', 'high', ['岸边栈板道', '湖船观测台'], ['岸边邮箱标', '西岸靠泊灯', '湖心书船标', '运书木箱扣'],
    '走到运书箱金环收入图书名单', '密歇根湖岸图书箱启程', '登上右侧高台眺望双桥加力，栈板低道便于回收',
    ['MICHIGAN • 1837', 'LAKE BOOKS BOX'], ['#4c7a91', '#e8dec5'], '#8d7d64', '#c96f48'),
  '0127': sk('court', 'cross', ['深底线攻防', '网前反弹区'], ['发球落点标', '左底线斜标', '右网前截标', '决胜空场靶'],
    '走到空场金环打出决胜落点', '2018 澳网第三盘收官', '跨半场斜线回击加力，网前短拍可压缩对手反应',
    ['MELBOURNE • 2018', 'MATCH POINT WON'], ['#396f9c', '#e6eef5'], '#4d82b0', '#e8c456'),
  '0128': sk('workshop', 'pin', ['外圈姓氏廊', '内圈索引台'], ['首枚铜字模', '左抽屉卡签', '右弧墙名牌', '藏书总铭灯'],
    '走到藏书台金环点亮新行名录', '艺文学院名录墙添新名', '青环留守分身定住翻动索引签，精准补齐字模空位',
    ['ACADEMY • 1908', 'NAME INSCRIBED'], ['#5a6c75', '#ead8bc'], '#96826b', '#c9884c'),
  '0129': sk('workshop', 'pin', ['窗棂影廊', '铅字校盘道'], ['黑羽试字靶', '窗格左影标', '反字右铅标', '滚筒压印柄'],
    '走到滚筒印台金环滚出报页', '晚镜报《乌鸦》样张印成', '青环留守分身稳住横移版框，从容辨认反向铅字',
    ['EVENING MIRROR • 1845', 'THE RAVEN PROOF'], ['#2a3547', '#b0a69e'], '#6b6764', '#d47c56'),
  '0130': sk('workshop', 'high', ['音箱近拍道', '楼缘长拍台'], ['节拍试音靶', '左放大器标', '楼缘调音标', '合奏总推子'],
    '走到调音台金环推起合奏推子', '伦敦屋顶合奏点亮屋檐', '登上楼缘高台可看清全排音箱并获加力，低道易回收',
    ['LONDON ROOF • 1969', 'LIVE SESSION ON'], ['#48667d', '#e8d2b5'], '#7c7873', '#de6a4b'),
  '0131': sk('facade', 'pin', ['检修廊', '外侧扶梯'], ['低压接头', '蓝管回路', '红管回路', '立面总阀'],
    '走到上层金环接通整面立面', '四道色管照亮巴黎广场', '在青环留守分身，色管改道后转阀更快',
    ['CENTRE POMPIDOU', '1977 FACADE LIT'], ['#78a5b7', '#f6e9d5'], '#76929d', '#de7653'),
  ...februarySkirmishSpecs,
  ...marchSkirmishSpecs,
  ...aprilSkirmishSpecs,
  ...maySkirmishSpecs,
  ...juneSkirmishSpecs,
  ...octoberSkirmishSpecs,
  ...julySkirmishSpecs,
  ...augustSkirmishSpecs,
  ...septemberSkirmishSpecs,
  ...novemberSkirmishSpecs,
  ...decemberSkirmishSpecs,
};

export const skirmishDays: readonly string[] = Object.keys(skirmishSpecs).sort();

export function floorAt(course: Pick<Course, 'tiles'>, x: number, z: number) {
  const tile = course.tiles.find(t => Math.abs(t.x - x) <= t.width / 2 + 0.00001 && Math.abs(t.z - z) <= t.depth / 2 + 0.00001);
  return tile ? tile.far + (tile.near - tile.far) * (z - tile.z + tile.depth / 2) / tile.depth : null;
}

export function buildCourse(day: SkirmishDay, seed: string): Course {
  const spec = skirmishSpecs[day];
  if (!spec) throw new Error('缺少本日交火地图 ' + day);
  const sport = spec.style === 'sport' || spec.style === 'court';
  const air = spec.style === 'air' || spec.style === 'maritime';
  const random = rng(seed), tiles: FloorTile[] = [];
  const width = sport ? 3.8 : 2.8, depth = sport ? 4.6 : 3.6;
  for (let column = -1; column <= 1; column++) for (let row = 0; row < 4; row++) {
    if (!sport && column === 0 && (row === 1 || row === 2)) continue;
    const rises = sport ? [0, 0, 0, 0, 0] : air ? (column === 1 ? [0, 0, 1.15, 0, 0] : [0, 0, 0, 0, 0]) :
      (column === 1 ? [0, 0, 2.4, 2.4, 2.4] : [0, 0, 0.55, 2.4, 2.4]);
    tiles.push({x: column * width, z: (1.5 - row) * depth, width, depth, near: rises[row], far: rises[row + 1]});
  }
  const point = (x: number, z: number, offset = 0): Vec => [x, (floorAt({tiles}, x, z) ?? 0) + offset, z];
  return {
    day, ...spec, tiles,
    spawn: point(0, depth * 1.75), end: point(0, -depth * 1.55), pad: point(-width, -depth * 0.34),
    anchors: [point(0, depth * 1.18, 0.25), point(-width, -depth * 0.53, 0.3), point(width, -depth * 0.6, 0.3), point(0, -depth * 1.86, 0.3)],
    phases: Array.from({length: 4}, () => random.range(0, 2 * Math.PI)),
  };
}

const passLines: MapStroke[] = [
  {points: [[-1, -0.55], [0.12, -0.35], [1, 0.50]], width: 0.8},
  {points: [[-1, 0.60], [-0.35, -0.4], [1, -0.60]], width: 0.8},
];
export function targetPoint(c: Course, i: number, time: number, pinned: boolean): Vec {
  const [x, y, z] = c.anchors[i];
  const sport = c.style === 'sport' || c.style === 'court';
  const elevated = c.style === 'facade' || c.style === 'space' || c.style === 'workshop';
  const p = time * (sport ? 1.12 : 0.72) + c.phases[i], factor = pinned ? 0.35 : 1;
  if (i === 0) return [x, y, z];
  if (sport) {
    const [dx, dz] = alongStroke(passLines[i % 2], (1 + Math.sin(p)) * 1.24);
    return [x + dx * (i === 3 ? 1.6 : 1) * factor, y, z + dz * factor];
  }
  if (elevated) return pinned ? [x, y + 0.12, z + 0.38 * Math.sin(p)] : [x + 0.55 * Math.sin(p), y + 0.32 * (1 + Math.cos(p)), z];
  return [x + 0.49 * Math.sin(p) * factor, y + 0.10 * Math.cos(p), z + 0.25 * Math.sin(p * 2)];
}
export function laneAt(c: Course, v: Vec): Lane | 0 {
  const tile = c.tiles[0], floor = floorAt(c, v[0], v[2]);
  if (floor === null || Math.abs(v[1] - floor) > 0.95 || Math.abs(v[2]) > tile.depth * 0.94 || Math.abs(v[0]) < tile.width * 0.55) return 0;
  return v[0] < 0 ? -1 : 1;
}
export function openTarget(index: number, cleared: ReadonlySet<number>, lanes: ReadonlySet<Lane>) {
  if (cleared.has(index)) return false;
  if (index === 0) return true;
  if (!cleared.has(0) || !lanes.size) return false;
  return index < 3 || (cleared.has(1) && cleared.has(2));
}
