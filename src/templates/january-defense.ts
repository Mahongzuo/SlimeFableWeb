import {rng} from './random';
import {alongStroke,type MapStroke} from './january-layout';
import {buildFebruaryDefenseMaps} from './february-defense';
import {buildMarchDefenseMaps} from './march-defense';
import {buildAprilDefenseMaps} from './april-defense';
import {buildMayDefenseMaps} from './may-defense';
import {buildJuneDefenseMaps} from './june-defense';
import {buildOctoberDefenseMaps} from './october-defense';
import {buildJulyDefenseMaps} from './july-defense';
import {buildAugustDefenseMaps} from './august-defense';
import {buildSeptemberDefenseMaps} from './september-defense';
import {buildNovemberDefenseMaps} from './november-defense';
import {buildDecemberDefenseMaps} from './december-defense';

export type Point = [number, number];
export type Installation = 'water' | 'wind';
export type DefensePhase = 'setup' | 'wave' | 'interval' | 'lost' | 'finale' | 'won';
export type DefenseTheme =
  | 'parade' | 'station' | 'eclipse'
  | 'harbor' | 'lunar' | 'workshop' | 'ice' | 'airship' | 'rail' | 'orbital' | 'ocean';
export interface DefenseMap {
  theme: DefenseTheme;
  routes: Point[][];
  pads: Point[];
  sectors: string[];
  subject: string;
  water: string;
  wind: string;
  help: string;
  finale: string;
  clean: string;
  guide?: string;
  incident?: string;
  flow?: 'advance' | 'alternate';
  palette?: [string, string, string, string, string, string];
}

// Reusable geometrically verified route/pad topologies so every day reflects its
// design-card flow while keeping water (3.1 m) and wind (4.4 m) coverage clear.
const layoutBend = {
  routes: [
    [[-8, -3], [-6, -3], [-6, 1], [-3, 1]] as Point[],
    [[-3, -5], [-3, -2], [1, -2], [1, 1]] as Point[],
    [[7, -4], [7, -1], [4, -1], [4, 2]] as Point[],
  ],
  pads: [[-6.9, -1], [-4.6, 0.1], [-2, -3], [0.2, -0.5], [7.8, -2.3], [4.9, 0.8]] as Point[],
};
const layoutAlternate = {
  routes: [
    [[-8, -2], [-5, -2], [-2, 1], [5, 1], [8, -1]] as Point[],
    [[8, 2], [4, 2], [1, -1], [-5, -1], [-8, 1]] as Point[],
    [[-8, 2], [-5, 2], [0, 0], [4, -2], [8, -2]] as Point[],
  ],
  pads: [[-6.2, -3.1], [-2, 2.4], [5.4, 2.9], [2.1, -2.5], [-4, 0], [5, -0.5]] as Point[],
};
const layoutRidge = {
  routes: [
    [[-8, -4], [-5, -3], [-4, -1], [-5, 1]] as Point[],
    [[-3, -5], [-0.8, -3], [1, -2], [0.2, 1]] as Point[],
    [[8, -4], [5, -3], [4, -1], [5, 1]] as Point[],
  ],
  pads: [[-6.6, -2.4], [-3.9, 0.1], [-1.8, -3.5], [1.5, -0.4], [6.7, -2.6], [4, 0.2]] as Point[],
};
const layoutZigzag = {
  routes: [
    [[-8, 2], [-5.2, 2], [-5.2, -2], [-2.4, -2]] as Point[],
    [[-2.2, 3], [-2.2, 0], [1.2, 0], [1.2, -3]] as Point[],
    [[2.4, 2], [5.4, 2], [5.4, -1.6], [8, -1.6]] as Point[],
  ],
  pads: [[-6.6, 0.2], [-3.8, -0.8], [-0.9, 1.4], [0.1, -1.5], [4.1, 0.5], [6.8, -0.2]] as Point[],
};
const layoutConverge = {
  routes: [
    [[-8, -3.2], [-5.2, -2.4], [-3.4, -0.6], [-2, 1.8]] as Point[],
    [[0, -4.6], [-1, -2], [0.8, 0], [0, 2.4]] as Point[],
    [[8, -3.2], [5.2, -2.4], [3.4, -0.6], [2, 1.8]] as Point[],
  ],
  pads: [[-6.2, -1.4], [-3.6, 0.9], [-1.4, -2.6], [1.4, 0.8], [6.2, -1.4], [3.6, 0.9]] as Point[],
};
const layoutWave = {
  routes: [
    [[-8, -1.2], [-6.2, -3.2], [-4.2, -1.2], [-2.4, 1.6]] as Point[],
    [[-2.2, -3.6], [0, -1.6], [1.8, -3.4], [2.4, 0.8]] as Point[],
    [[3.2, -3.2], [5.2, -1], [6.8, -2.8], [8, 1.2]] as Point[],
  ],
  pads: [[-6.2, -1.6], [-3.8, 0.2], [-0.8, -2.4], [1.2, -1.2], [4.6, -2.1], [6.6, -0.6]] as Point[],
};

function def(
  base: {routes: Point[][]; pads: Point[]},
  theme: DefenseTheme,
  sectors: [string, string, string],
  subject: string,
  water: string,
  wind: string,
  help: string,
  finale: string,
  clean: string,
  incident: string,
  guide: string,
  extra?: Pick<DefenseMap, 'flow' | 'palette'>,
): DefenseMap {
  return {theme, ...base, sectors, subject, water, wind, help, finale, clean, incident, guide, ...extra};
}

// All 31 January days. 0101, 0114 and 0131 preserve their reviewed layouts verbatim.
export const defenseMaps: Record<string, DefenseMap> = {
  '0101': {
    theme: 'parade', routes: layoutBend.routes, pads: layoutBend.pads,
    sectors: ['温室门', '装花棚', '花拱街口'], subject: '花粉团', water: '水雾喷台', wind: '风叶花篮',
    help: '迎风吹散', finale: '拉开花拱门', clean: '花车完好',
  },
  '0102': def(layoutAlternate, 'harbor', ['马祖航道', '金门航道', '双港灯口'], '海雾团', '潮纹水灯', '领航风标',
    '双港鸣笛', '点亮双港灯', '同刻入港', '雾团遮灯',
    '两岸客轮沿双航线对开。水灯移开近港潮纹，风标连成远距导航带。', {flow: 'alternate'}),
  '0103': def(layoutRidge, 'lunar', ['坑缘测区', '悬停中段', '着陆椭圆'], '盲区尘影', '低空回波塔', '高空扇扫塔',
    '中继脉冲', '点下软着陆', '三窗全亮', '地形失扫',
    '着陆器沿冯·卡门坑缘下降。随悬停段迁移信标，守住三处着陆窗口。'),
  '0104': def(layoutZigzag, 'workshop', ['排字台', '六点阵区', '装订压口'], '错位纸页', '点位压台', '送页风轮',
    '齐行校对', '手推压印辊', '无错页', '漏压纸页',
    '按送页先后守住两列三行盲文点阵，让每张触读卡凹凸清晰。', {palette: ['#6d8fa2', '#f1dfc8', '#b8ab92', '#e4d5b9', '#4c756c', '#e6b267']}),
  '0105': def(layoutBend, 'ice', ['采冰口', '锯冰棚', '透光冰门'], '暖风流', '短距结冰塔', '穿巷冷风塔',
    '寒流定形', '点亮透光冰门', '全巷不断光', '冰壁融缺',
    '冷风穿巷可覆盖长段，结冰塔守住近处薄壁；随日照面变化迁移塔位。'),
  '0106': def(layoutAlternate, 'workshop', ['印报房', '双路邮驿', '公告栏'], '散页邮袋', '分拣压台', '送图风槽',
    '快车集袋', '压出第四十七星', '邮袋全对', '错分邮袋',
    '窄道快车与主道慢车交替发邮，切换压台与风槽把地图送入正确邮格。', {flow: 'alternate', palette: ['#8d9c8e', '#f4d9b5', '#c3b290', '#e8d5b0', '#9f5246', '#e4a756']}),
  '0107': def(layoutWave, 'airship', ['多佛白崖', '海峡风带', '加来海岸'], '逆风涡流', '海面稳流台', '高空顺风塔',
    '风袋定向', '放下着陆回绳', '不触海雾', '涡流偏航',
    '热气球跨越英吉利海峡。水塔护住低空海面，风塔托住高空顺风带。'),
  '0108': def(layoutConverge, 'workshop', ['卡片仓', '分流插针台', '计数盘'], '混排卡流', '固定读卡头', '分道脉冲塔',
    '清槽进位', '合下计数总柄', '无积压', '卡槽积压',
    '打孔统计卡自卡仓涌入。在固定读头与远距分道塔间配合，保持计数盘流畅。', {palette: ['#5c7686', '#ead8be', '#a9a291', '#ddd1b4', '#3f6d6c', '#dca458']}),
  '0109': def(layoutConverge, 'orbital', ['音频通道', '通话通道', '合流演示屏'], '失步信号', '接口稳流台', '缓存风塔',
    '三路合流', '滑亮终场屏', '零断流', '信号断流',
    '音频、通话与网页三路信号同台汇聚。及时迁移接口塔，让演示流畅接续。', {palette: ['#283b52', '#8fa5bd', '#4f6375', '#879cb0', '#4ea8c4', '#f2bd6b']}),
  '0110': def(layoutBend, 'rail', ['地面入口', '浅埋砖拱', '站台交换线'], '浓蒸汽团', '冷凝回充井', '接力通风塔',
    '全井抽风', '摇响首班站铃', '全站清晰', '煤烟遮灯',
    '蒸汽列车穿行浅埋砖拱。风塔接力疏散浓雾，水塔在两班车间稳住视线。'),
  '0111': def(layoutZigzag, 'workshop', ['档案箱', '按日分架', '玻璃展柜'], '错序记录页', '日期核签台', '轻推传送风',
    '时间轴校对', '归位十一日页', '全页归位', '页序错落',
    '多伦多病程档案按日整理。平稳核签纸夹并轻推送页，将记录放回时间轴。', {palette: ['#6e8f97', '#ece2d0', '#b7bcaf', '#e5e0cf', '#3d7c74', '#e3b368']}),
  '0112': def(layoutWave, 'ocean', ['谷口木闸', '养护草坡', '林缘出口'], '拥挤足迹', '石阶排水点', '林缘分流风',
    '支径轮休', '开启木栅门', '草坡无踩损', '草坡踩损',
    '守住国民信托的乡间小径。排水点稳固踏步，分流风引导游客绕开养护草地。', {palette: ['#769c87', '#efe0c0', '#8fa87b', '#d9caa2', '#4c8062', '#ebb768']}),
  '0113': def(layoutConverge, 'workshop', ['资料侧门', '圆桌图架', '记录主席'], '卷边图稿', '压图镇尺台', '传阅清风台',
    '齐展底图', '拼成会议展页', '图稿不折', '图稿起皱',
    '学会圆桌上三幅等高线底图轮流传阅。固定常阅底图并平稳送稿至记录席。', {palette: ['#5f7e8a', '#f1dcb9', '#b5a383', '#e5d4b1', '#3b6d6c', '#e6ad5e']}),
  '0114': {
    theme: 'station', routes: layoutAlternate.routes, pads: layoutAlternate.pads,
    sectors: ['南站台', '北站台', '末班接驳'], subject: '换乘小组', water: '接驳服务台', wind: '分流引导台',
    help: '增开引导', finale: '摇响接驳铃', clean: '无人误车', flow: 'alternate',
  },
  '0115': def(layoutAlternate, 'orbital', ['草稿入口', '红链索引环', '发布页面'], '断链请求', '校验稳点台', '索引跳转风',
    '全链刷新', '按下发布键', '无断链', '红链积压',
    '红链请求在索引环中来回穿梭。校验台处理近端词条，跳转风疏导远端流量。', {flow: 'alternate', palette: ['#35516d', '#c5d6e3', '#7a8f9e', '#cbd8e1', '#3e7db0', '#f0b963']}),
  '0116': def(layoutConverge, 'orbital', ['左舱交会弧', '对接中环', '右舱交会弧'], '姿态偏差', '近侧校准台', '远距轨控塔',
    '双舱同步', '扣合两道锁指', '一次锁合', '交会偏离',
    '联盟 4 号与 5 号相向靠拢。在左、中、右三段交会弧及时布防，守住对接窗口。', {palette: ['#1d2c48', '#7d8fa8', '#44556d', '#7b8fa8', '#52a7c7', '#f3c172']}),
  '0117': def(layoutBend, 'workshop', ['活字架', '拼版上墨角', '木制压印床'], '洇墨纸页', '润纸水台', '晾架清风台',
    '齐版校墨', '拉下印床手柄', '全页干净', '版面洇墨',
    '波士顿清晨的印刷铺。水台润湿纸页，风台照管晾架，让每张报头字迹清晰。', {palette: ['#7e8d84', '#f2d9b3', '#bca584', '#e8d5b1', '#8e5144', '#e5ad5d']}),
  '0118': def(layoutWave, 'airship', ['观测哨', '木平台中线', '展模落点'], '偏侧阵风', '中线收带台', '近岸稳风塔',
    '定格快门', '启动展模重演', '三次定格', '阵风偏吹',
    '木质观演台模拟早年甲板降落里程碑。稳住近岸侧风并回收偏出的纸带。'),
  '0119': def(layoutRidge, 'lunar', ['地面接收站', '低空遥测窗', '深空长信线'], '失散遥测包', '起始签收台', '深空远距塔',
    '信号暂存', '排成升空航迹', '全包签收', '遥测漏收',
    '新视野号奔向冥王星。近距塔守住低空密集数据，远距塔覆盖离地后的深空包。', {palette: ['#1b233d', '#847e9e', '#46506b', '#7f88a3', '#d89b56', '#f2c97d']}),
  '0120': def(layoutWave, 'rail', ['月台出发', '主坡低谷', '回程站台'], '加速小车', '低谷缓冲台', '高坡送车风',
    '全轨稳速', '压印轨道蓝图', '无空位浪费', '车距拥堵',
    '木桁架过山车起伏奔行。低谷缓冲接住密集小车，高坡风台平滑返程队列。', {palette: ['#7f9fb0', '#f5dbb5', '#b99c74', '#e4caa0', '#a35641', '#efb663']}),
  '0121': def(layoutAlternate, 'airship', ['巴黎出发口', '达喀尔双台', '里约抵达口'], '中转行李流', '中转分拣台', '直达加速风',
    '双台加开', '压盖三城戳记', '行李全对', '行李回流',
    '协和式客机经达喀尔中转前往里约。分清直达与中转行李，让双台高效衔接。', {flow: 'alternate', palette: ['#5884a8', '#f5dec2', '#90a3ad', '#dde4e2', '#2f6a99', '#f2b862']}),
  '0122': def(layoutZigzag, 'lunar', ['模拟发射台', '下降级测环', '上升级记录柜'], '突发读数', '低速记录头', '高敏扫描塔',
    '全段校验', '拉开舱段剖模', '无掉数', '读数漏记',
    '无人阿波罗 5 号先后测试下降级与上升级。舱段切换后及时将记录头转向新测口。', {palette: ['#24334c', '#9899a6', '#526072', '#8e9ba8', '#c8924f', '#f4c779']}),
  '0123': def(layoutRidge, 'ocean', ['海面浮体', '深海跃层', '挑战者海床'], '悬浮沉粒', '清窗水束台', '近底驱粒风',
    '舷窗强光', '转向观察舷窗', '全深度留影', '沉粒遮窗',
    '的里雅斯特号潜向万米海床。提前清出照明窗口，到近底层再调风塔驱散密集沉粒。', {palette: ['#142842', '#527894', '#264663', '#527991', '#4aa7b5', '#f3c674']}),
  '0124': def(layoutWave, 'ocean', ['锯木水轮', '尾水急槽', '缓流筛床'], '泥沙干叶', '分水筛床台', '吹叶清风台',
    '开渠稳流', '推亮观察盏', '不拦断水流', '筛床积沙',
    '水轮后的尾水渠泛着细光。水台稳住筛床节奏，风台吹离飘落干叶。', {palette: ['#6d958c', '#f3d8ae', '#988867', '#d2be94', '#c9933f', '#f4c36a']}),
  '0125': def(layoutZigzag, 'workshop', ['茅屋小窗', '短长诗行道', '炉边诗页'], '失拍音节', '短行定拍台', '长行送韵风',
    '炉火打拍', '送末句落页尾', '整页合拍', '音节丢拍',
    '苏格兰茅屋灯下吟诗。短行需稳住拍点，长行借清风送韵，让整页诗行齐整。', {palette: ['#5f786b', '#efd6b0', '#9f9476', '#dfd0ab', '#9c5642', '#e8b363']}),
  '0126': def(layoutConverge, 'orbital', ['螺旋扫描盘', '信号稳频台', '氖灯观察孔'], '暗格扫描行', '稳频校准台', '补亮脉冲塔',
    '转盘校时', '转动观察框', '无漏行', '扫描漏行',
    '三十孔螺旋盘旋转送出早期电视轮廓。风塔稳住转速，脉冲塔补亮缺失扫描行。', {palette: ['#323947', '#b59c87', '#67615a', '#a89a87', '#d8764b', '#f2b866']}),
  '0127': def(layoutConverge, 'orbital', ['灯座底座', '并联试灯架', '观察总灯台'], '电流波动', '稳压灯座台', '并联分流塔',
    '全环通电', '点亮最终灯阵', '无暗格', '灯丝暗熄',
    '面对碳丝灯泡剖模。分散稳压承接多盏小灯，集中分流点亮中央大灯。', {palette: ['#2b3146', '#c9a67c', '#5d5a58', '#9e927f', '#e5a74f', '#fae08a']}),
  '0128': def(layoutBend, 'workshop', ['底板插座', '分层搭桥区', '自承屋脊'], '松动砖块', '管柱咬合台', '横梁送砖风',
    '临时稳撑', '拔撑立起屋脊', '全砖自承', '接缝松脱',
    '凸点与底部管柱咬合成稳固街区。低塔缩短运距，风塔跨越缺口，让屋脊自立。', {palette: ['#6794b8', '#f5e1bd', '#b4ba93', '#e5d8b2', '#c84b44', '#f2c155']}),
  '0129': def(layoutZigzag, 'workshop', ['轮组工架', '管状车架台', '飞轮出门道'], '错位零件盒', '轮架定轴台', '送件清风台',
    '飞轮预检', '推出三轮展模', '无错装', '通道堵塞',
    '卡尔·奔驰的工坊正装配三轮汽车。轮组与飞轮有序汇入车架，清出门口跑道。', {palette: ['#58747c', '#ebd3b0', '#9e9582', '#d7cab1', '#8e4f3d', '#e5ae5f']}),
  '0130': def(layoutAlternate, 'rail', ['西岸石塔', '悬链桥面', '东岸石塔'], '对向车队', '桥口分车台', '错峰缓流风',
    '双塔鸣哨', '放行最后一车', '桥心不停驶', '桥面交堵',
    '梅奈悬索桥横跨海峡。安排双向马车错峰通过石塔，让悬链桥心始终畅行。', {flow: 'alternate', palette: ['#5d859c', '#ebd8be', '#8fa198', '#d8d2bc', '#47767b', '#ebb768']}),
  '0131': {
    theme: 'eclipse', routes: layoutRidge.routes, pads: layoutRidge.pads,
    sectors: ['西山曝光台', '中峰曝光台', '东岭曝光台'], subject: '云带', water: '凝云水塔', wind: '拨云风塔',
    help: '短时清窗', finale: '合成曝光底片', clean: '曝光全收',
  },
  ...buildFebruaryDefenseMaps({
    bend: layoutBend, alternate: layoutAlternate, ridge: layoutRidge,
    zigzag: layoutZigzag, converge: layoutConverge, wave: layoutWave,
  }),
  ...buildMarchDefenseMaps({
    bend: layoutBend, alternate: layoutAlternate, ridge: layoutRidge,
    zigzag: layoutZigzag, converge: layoutConverge, wave: layoutWave,
  }),
  ...buildAprilDefenseMaps({
    bend: layoutBend, alternate: layoutAlternate, ridge: layoutRidge,
    zigzag: layoutZigzag, converge: layoutConverge, wave: layoutWave,
  }),
  ...buildMayDefenseMaps({
    bend: layoutBend, alternate: layoutAlternate, ridge: layoutRidge,
    zigzag: layoutZigzag, converge: layoutConverge, wave: layoutWave,
  }),
  ...buildJuneDefenseMaps({
    bend: layoutBend, alternate: layoutAlternate, ridge: layoutRidge,
    zigzag: layoutZigzag, converge: layoutConverge, wave: layoutWave,
  }),
  ...buildOctoberDefenseMaps({
    bend: layoutBend, alternate: layoutAlternate, ridge: layoutRidge,
    zigzag: layoutZigzag, converge: layoutConverge, wave: layoutWave,
  }),
  ...buildJulyDefenseMaps({
    bend: layoutBend, alternate: layoutAlternate, ridge: layoutRidge,
    zigzag: layoutZigzag, converge: layoutConverge, wave: layoutWave,
  }),
  ...buildAugustDefenseMaps({
    bend: layoutBend, alternate: layoutAlternate, ridge: layoutRidge,
    zigzag: layoutZigzag, converge: layoutConverge, wave: layoutWave,
  }),
  ...buildSeptemberDefenseMaps({
    bend: layoutBend, alternate: layoutAlternate, ridge: layoutRidge,
    zigzag: layoutZigzag, converge: layoutConverge, wave: layoutWave,
  }),
  ...buildNovemberDefenseMaps({
    bend: layoutBend, alternate: layoutAlternate, ridge: layoutRidge,
    zigzag: layoutZigzag, converge: layoutConverge, wave: layoutWave,
  }),
  ...buildDecemberDefenseMaps({
    bend: layoutBend, alternate: layoutAlternate, ridge: layoutRidge,
    zigzag: layoutZigzag, converge: layoutConverge, wave: layoutWave,
  }),
};

interface Packet {
  id: number; route: number; distance: number; x: number; z: number; speed: number;
  work: number; max: number; slow: number; connected: boolean;
}
interface Tower {kind: Installation; cooldown: number; flash: number; aim: Point}
export interface Track extends MapStroke {total: number}
export function measure(points: Point[]): Track {
  const lengths = points.slice(1).map(([x, z], i) => Math.hypot(x - points[i][0], z - points[i][1]));
  return {points, width: 0.8, total: lengths.reduce((a, b) => a + b, 0)};
}
export function sample(track: Track, distance: number, out: Point): Point {
  return alongStroke(track, distance, out);
}

export class JanuaryDefense {
  readonly map: DefenseMap;
  readonly tracks: Track[];
  readonly towers: (Tower | null)[] = Array(6).fill(null);
  readonly packets: Packet[] = [];
  readonly plates: boolean[] = [];
  readonly random: ReturnType<typeof rng>;
  phase: DefensePhase = 'setup';
  wave = 0; released = 0; clock = 0; errors = 0; served = 0; assists = 0; activeTime = 0;
  private startErrors = 0;
  private next = 0;
  private recovery = 0;
  private serial = 0;
  private probe: Point = [0, 0];
  constructor(day: string, seed: string) {
    this.map = defenseMaps[day];
    if (!this.map) throw new Error('缺少本日塔防地图 ' + day);
    this.tracks = this.map.routes.map(measure);
    this.random = rng(seed);
  }
  get sector() {return Math.min(2, Math.floor(this.wave / 2));}
  get size() {return 7 + this.wave;}
  get charges() {return 3 - this.towers.filter(Boolean).length;}
  get canAssist() {return this.phase === 'wave' && this.recovery === 0 && this.packets.some(p => !p.connected);}
  get steps() {return this.plates.length;}
  deploy(index: number, kind: Installation | 'remove') {
    if (!['setup', 'interval', 'wave'].includes(this.phase) || !Number.isInteger(index) || index < 0 || index >= 6) return false;
    const current = this.towers[index];
    if (kind === 'remove') {if (!current) return false; this.towers[index] = null; return true;}
    if ((!current && this.charges === 0) || current?.kind === kind) return false;
    this.towers[index] = {kind, cooldown: 0.28, flash: 0, aim: [...this.map.pads[index]]};
    return true;
  }
  start() {
    if (this.phase !== 'setup' && this.phase !== 'interval') return false;
    if (this.phase === 'interval') this.wave++;
    this.phase = 'wave'; this.clock = 0; this.startErrors = this.errors; this.next = 0; this.released = 0;
    return true;
  }
  routeFor(serial: number) {
    if (this.map.theme === 'station' || this.map.flow === 'alternate') {
      return this.wave >= 4 ? (serial % 3 === 0 ? 1 : 2) : (this.wave % 2 && serial % 3 === 0 ? 1 - this.sector : this.sector);
    }
    return this.sector;
  }
  assist() {
    if (!this.canAssist) return false;
    this.assists++; this.recovery = 10;
    for (const p of this.packets) {if (!p.connected) {p.work -= 2; p.slow = 2.5;}}
    return true;
  }
  private release() {
    const route = this.routeFor(this.released), track = this.tracks[route];
    const work = 2 + (this.wave >= 2 ? 1 : 0) + (this.released % 4 === 3 ? 1 : 0);
    this.packets.push({
      id: this.serial++, route, distance: 0, x: track.points[0][0], z: track.points[0][1],
      speed: track.total / (8.7 + this.random.range(-0.55, 0.55)), max: work, work, slow: 0, connected: false,
    });
    this.released++; this.next += 1.8 + this.random.range(-0.22, 0.22);
  }
  tick(dt: number) {
    if (this.phase !== 'wave' || !Number.isFinite(dt) || dt <= 0) return;
    this.clock += dt; this.activeTime += dt; this.recovery = Math.max(0, this.recovery - dt);
    if (this.released < this.size && this.clock >= this.next) this.release();
    for (let i = 0; i < this.towers.length; i++) {
      const tower = this.towers[i]; if (!tower) continue;
      tower.flash = Math.max(0, tower.flash - dt); tower.cooldown -= dt; if (tower.cooldown > 0) continue;
      const [x, z] = this.map.pads[i], water = tower.kind === 'water', range = water ? 3.1 : 4.4;
      const p = this.packets.find(v => !v.connected && v.work > 0 && Math.hypot(v.x - x, v.z - z) <= range);
      if (!p) continue;
      p.work -= water ? 2 : 1; if (!water) p.slow = 1.5;
      tower.aim[0] = p.x; tower.aim[1] = p.z; tower.flash = 0.27; tower.cooldown = water ? 0.83 : 1;
    }
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i], track = this.tracks[p.route];
      if (p.work <= 0 && !p.connected) {
        p.connected = true; this.served++;
        if (this.map.theme !== 'station' && this.map.flow !== 'alternate') {this.packets.splice(i, 1); continue;}
      }
      p.slow = Math.max(0, p.slow - dt);
      p.distance += p.speed * dt * (p.connected ? 1.65 : p.slow > 0 ? 0.67 : 1);
      sample(track, p.distance, this.probe); p.x = this.probe[0]; p.z = this.probe[1];
      if (p.distance >= track.total) {if (!p.connected) this.errors++; this.packets.splice(i, 1);}
    }
    if (this.errors >= 5) {this.phase = 'lost'; return;}
    if (this.released === this.size && this.packets.length === 0) {
      this.plates.push(this.startErrors === this.errors);
      this.phase = this.wave === 5 ? 'finale' : 'interval';
    }
  }
  finish() {if (this.phase !== 'finale') return false; this.phase = 'won'; return true;}
}
