import {rng} from './random';
import type {Vec} from '../slime/types';
import {buildFebruaryRpgConfigs} from './february-rpg';
import {buildMarchRpgConfigs} from './march-rpg';
import {buildAprilRpgConfigs} from './april-rpg';
import {buildMayRpgConfigs} from './may-rpg';
import {buildJuneRpgConfigs} from './june-rpg';
import {buildOctoberRpgConfigs} from './october-rpg';
import {buildJulyRpgConfigs} from './july-rpg';
import {buildAugustRpgConfigs} from './august-rpg';
import {buildSeptemberRpgConfigs} from './september-rpg';
import {buildNovemberRpgConfigs} from './november-rpg';
import {buildDecemberRpgConfigs} from './december-rpg';

type Side = -1 | 1;
export type Arena = 'ice' | 'stage' | 'field';
export type RpgVisual = 'ice' | 'stage' | 'field' | 'cosmos' | 'atelier' | 'expedition' | 'court';
export type RPGPhase = 'warmup' | 'route' | 'duel' | 'lost' | 'finale' | 'curtain';
export interface ArenaRuleSet {
  readonly routes: readonly [string, string];
  readonly boss: string;
  readonly verb: string;
  readonly ending: string;
  readonly rounds: number;
  readonly period: number;
}
export interface RpgDayConfig extends ArenaRuleSet {
  readonly day: string;
  readonly arena: Arena;
  readonly visual: RpgVisual;
  readonly board: readonly [string, string, string];
  readonly sky: readonly [string, string];
  readonly floor: string;
  readonly coat: string;
  readonly opening?: string;
}

export const arenaRules: Record<Arena, ArenaRuleSet> = {
  ice: {routes: ['风步滑行', '下盘格挡'], boss: '守门史莱姆', verb: '射门', ending: '点亮球灯', rounds: 3, period: 4.0},
  stage: {routes: ['制动配重', '天桥换景'], boss: '配重木偶', verb: '击破关节', ending: '拉开大幕', rounds: 4, period: 4.5},
  field: {routes: ['内线突破', '外侧接应'], boss: '端区队长', verb: '推进', ending: '翻动记分牌', rounds: 4, period: 4.2},
};

function cfg(
  day: string,
  arena: Arena,
  visual: RpgVisual,
  routes: [string, string],
  boss: string,
  verb: string,
  ending: string,
  board: [string, string, string],
  sky: [string, string],
  floor: string,
  coat: string,
  opening?: string,
): RpgDayConfig {
  const base = arenaRules[arena];
  return {day, arena, visual, routes, boss, verb, ending, rounds: base.rounds, period: base.period, board, sky, floor, coat, opening};
}

export const rpgConfigs: Readonly<Record<string, RpgDayConfig>> = {
  '0101': cfg('0101', 'ice', 'ice', ['风步滑行', '下盘格挡'], '守门史莱姆', '射门', '点亮球灯',
    ['露天冰场', '冬季经典赛 · 决胜射门', '2 — 1'], ['#607ca9', '#edcfc2'], '#c9ebee', '#bf574d',
    '2008 年 1 月 1 日，匹兹堡与布法罗在露天冰场相遇。'),
  '0102': cfg('0102', 'field', 'court', ['传接推进', '长踢远射'], '双叉门守卫', '远踢', '踢过横梁',
    ['玫瑰碗球场', '玫瑰碗 · 终场三分', '52 — 49'], ['#426e94', '#f7d8b5'], '#457e52', '#a83c3c'),
  '0103': cfg('0103', 'stage', 'atelier', ['内线穿轴', '外线拉张'], '卷纸机关', '压合', '压合成品管',
    ['纸带工场', '人造吸管专利', 'US 375962'], ['#4b5f70', '#e6cfa9'], '#b8946e', '#c9884c'),
  '0104': cfg('0104', 'ice', 'cosmos', ['贴壁绕波', '亮边护盾'], '弓形波光核', '破弧', '闭合弧浪',
    ['红外星图', '蛇夫座ζ星弧浪', 'BOW SHOCK'], ['#181f3b', '#874c5e'], '#343c59', '#e57b5c'),
  '0105': cfg('0105', 'stage', 'expedition', ['雪槽修舱', '屋顶校风'], '旋风机关', '定轴', '升起寻星罩',
    ['昆仑观测站', '南极冰穹 A', 'KUNLUN'], ['#3a648a', '#dceaf2'], '#c9e0ea', '#4f7fa3'),
  '0106': cfg('0106', 'ice', 'cosmos', ['阴影标点', '低重脊闪'], '彗核粒子灵', '定格', '接回放映轮',
    ['67P 彗核', '彗核雪影序列', '67P / C-G'], ['#161e33', '#66718a'], '#5a6375', '#88b4cc'),
  '0107': cfg('0107', 'stage', 'cosmos', ['外圈绕行', '内壳双波'], '双色滤镜核', '配准', '点亮双波猫眼',
    ['双波段星云', '猫眼星云成像', 'NGC 6543'], ['#1a213d', '#58828c'], '#32485c', '#5bc4b8'),
  '0108': cfg('0108', 'field', 'atelier', ['中心漏斗', '外圈书阶'], '引力粉笔球', '引回', '补完黑板弧',
    ['牛津讲台', '边界曲线讲义', '1942 · I · 8'], ['#324757', '#d8cdb8'], '#4c5f58', '#d9b56c'),
  '0109': cfg('0109', 'stage', 'cosmos', ['单塔减风', '双塔共鸣'], '头盔中央风灵', '共鸣', '撑开云壳',
    ['星风星云', 'NGC 2359 云壳', 'NGC 2359'], ['#172540', '#5a8ea3'], '#364f69', '#6ac7d8'),
  '0110': cfg('0110', 'field', 'atelier', ['纸背抄近', '格框连跳'], '墨渍格守卫', '越栏', '折出完整周刊',
    ['连载报摊', '周刊冒险首刊', '1929 · I · 10'], ['#4e6a7d', '#f0dec2'], '#c9bb9e', '#b55644'),
  '0111': cfg('0111', 'stage', 'expedition', ['层岩洞线', '观景山脊'], '峡谷回声浪', '测绘', '展开地形图',
    ['大峡谷崖缘', '国家纪念地测绘', '1908 · I · 11'], ['#6b5a69', '#ebb78d'], '#b57b58', '#9e5340'),
  '0112': cfg('0112', 'ice', 'expedition', ['护盾牵稿', '轻装越脊'], '字行风精', '压脊', '压合雪橇书脊',
    ['冻河雪辙', '杰克·伦敦书页', '1876 · I · 12'], ['#496f8f', '#e5e9ed'], '#c4d8e3', '#52778c'),
  '0113': cfg('0113', 'field', 'atelier', ['格间定身', '上栏冲刺'], '反转墨辊灵', '过辊', '印出四格报样',
    ['报纸排字盘', '连环漫画首刊', '1930 · I · 13'], ['#475c6b', '#ead8b8'], '#c7ba9c', '#3c4854'),
  '0114': cfg('0114', 'stage', 'stage', ['制动配重', '天桥换景'], '配重木偶', '击破关节', '拉开大幕',
    ['科斯坦齐剧院', '科斯坦齐剧院', '大幕开启'], ['#30213b', '#a87856'], '#ac7453', '#ce9d4e'),
  '0115': cfg('0115', 'stage', 'court', ['地面传接', '回廊高投'], '高臂守篮手', '入篮', '敲响篮下绳铃',
    ['斯普林菲尔德', '最初篮球规则', '1892 RULES'], ['#5d6f7d', '#edd2ad'], '#b88c5c', '#c76142'),
  '0116': cfg('0116', 'field', 'expedition', ['草缝低踪', '树台辨影'], '林间雾团', '引开', '拼成足迹笔记',
    ['山地雾林', '戴安·弗西笔记', 'FIELD NOTES'], ['#355c52', '#c8d6be'], '#5c7f62', '#829980'),
  '0117': cfg('0117', 'stage', 'atelier', ['仓门配重', '桅杆吊具'], '拳套木偶', '推门', '摇起下期布牌',
    ['顶针剧场船坞', '连环画船坞登场', '1929 · I · 17'], ['#4a748c', '#ebd8b8'], '#8f7d65', '#426b8c'),
  '0118': cfg('0118', 'ice', 'cosmos', ['球囊锁轴', '镜廊迎波'], '光幕回波灵', '曝光', '展开全景照片',
    ['平流层吊篮', '高空北极光', 'STRATOSPHERE'], ['#142640', '#4f9c8c'], '#325263', '#6be0b0'),
  '0119': cfg('0119', 'ice', 'atelier', ['布角定斜', '登瓶跃笔'], '摆动画笔灵', '定格', '收进静物画框',
    ['艾克斯画室', '塞尚静物构图', '1839 · I · 19'], ['#5c7682', '#f0d8b2'], '#ba9e78', '#c45b43'),
  '0120': cfg('0120', 'field', 'cosmos', ['近弧风步', '远弧留标'], '双弧光迹核', '捕光', '叠出双弧长曝',
    ['延时取景框', '返程点火双弧', '2024 · I · 20'], ['#192138', '#96766d'], '#3b4359', '#eb9c5c'),
  '0121': cfg('0121', 'stage', 'atelier', ['卷尺近捏', '褶裥高观'], '回转木人台', '捏褶', '合成衣廓小样',
    ['格朗维尔工坊', '迪奥立裁小样', '1905 · I · 21'], ['#5c6678', '#f0dfd0'], '#c4b49c', '#a36775'),
  '0122': cfg('0122', 'ice', 'atelier', ['内旋静拍', '外跳追拍'], '镜像舞者', '合拍', '与倒影同谢幕',
    ['圣彼得堡镜厅', '巴兰钦排练拍', '1904 · I · 22'], ['#4b5870', '#ead8c4'], '#b59d84', '#7a688c'),
  '0123': cfg('0123', 'field', 'atelier', ['画箱掩体', '阳棚改影'], '街角颜料灵', '取景', '放下街角画框',
    ['巴黎街角', '马奈露台画架', '1832 · I · 23'], ['#53728c', '#f2dbb8'], '#aba08e', '#4c708a'),
  '0124': cfg('0124', 'ice', 'cosmos', ['卫星蓄能', '磁场内线'], '倾轴守卫', '回传', '接收蓝色圆盘',
    ['天王星飞掠', '旅行者 2 号回传', 'URANUS 1986'], ['#162947', '#68a4bd'], '#3c6e85', '#7ad3e6'),
  '0125': cfg('0125', 'ice', 'court', ['底线蓄势', '网前抢拍'], '硬地陪练手', '回拍', '打出制胜赛点',
    ['墨尔本蓝场', '2014 澳网女单', 'CHAMPION'], ['#3c719e', '#e5eef5'], '#3e7db0', '#e0b84c'),
  '0126': cfg('0126', 'stage', 'cosmos', ['遮光调码', '亮缘抢圈'], '轨道仪守卫', '锁定', '锁入近星轨迹',
    ['金牛座ε星盘', '红巨星伴星轨道', 'ε TAURI'], ['#241c38', '#a66b5b'], '#4a3d52', '#e88a54'),
  '0127': cfg('0127', 'field', 'atelier', ['正盘直线', '倒盘斜格'], '镜面棋守卫', '对锁', '重合双面锁眼',
    ['达斯伯里棋盘', '镜中双面棋谱', '1832 · I · 27'], ['#3d4a66', '#e0d3be'], '#8f887d', '#5d5370'),
  '0128': cfg('0128', 'stage', 'expedition', ['临水栈廊', '城墙俯看'], '夯土守盘偶', '拓纹', '显出山水城址',
    ['衣锦城遗址', '夯土层位沙盘', '2026 · I · 28'], ['#4b6d68', '#e6d6b5'], '#9e8b6b', '#7d5f47'),
  '0129': cfg('0129', 'ice', 'atelier', ['快板压制', '休止延音'], '书房回声灵', '停顿', '合上朗读稿页',
    ['梅利霍沃读台', '契诃夫朗诵台', '1860 · I · 29'], ['#445463', '#e8d4b5'], '#a68768', '#7d524c'),
  '0130': cfg('0130', 'stage', 'expedition', ['下廊应答', '上廊长音'], '编钟节奏偶', '合奏', '敲出收束和弦',
    ['湖北省博夜场', '初二夜场编钟', 'CHIME NIGHT'], ['#26233b', '#b8875b'], '#785a48', '#d4a34c'),
  '0131': cfg('0131', 'field', 'field', ['内线突破', '外侧接应'], '端区队长', '推进', '翻动记分牌',
    ['推进线', '第二节得分 · 华盛顿', '35'], ['#416f96', '#ffdcba'], '#40794e', '#705d8b',
    '1988 年 1 月 31 日，华盛顿与丹佛在第二十二届超级碗相遇。'),
  ...buildFebruaryRpgConfigs(arenaRules),
  ...buildMarchRpgConfigs(arenaRules),
  ...buildAprilRpgConfigs(arenaRules),
  ...buildMayRpgConfigs(arenaRules),
  ...buildJuneRpgConfigs(arenaRules),
  ...buildOctoberRpgConfigs(arenaRules),
  ...buildJulyRpgConfigs(arenaRules),
  ...buildAugustRpgConfigs(arenaRules),
  ...buildSeptemberRpgConfigs(arenaRules),
  ...buildNovemberRpgConfigs(arenaRules),
  ...buildDecemberRpgConfigs(arenaRules),
};

export const rpgDays: readonly string[] = Object.keys(rpgConfigs).sort();

export function rpgConfigFor(day: string): RpgDayConfig {
  const c = rpgConfigs[day];
  if (!c) throw Error('未知一月试炼 ' + day);
  return c;
}

export function arenaFor(day: string): Arena {
  return rpgConfigFor(day).arena;
}

export function arenaLayout(arena: Arena) {
  const spawn: Vec = [0, 0, 8], warm: Vec = [0, 0, 5.6];
  const branches: Vec[] = [[-3.45, 0, 1.5], [3.45, arena === 'stage' ? 1.16 : 0, 1.5]];
  const end: Vec = [0, 0, -9.4];
  return {spawn, warm, branches, end};
}

export class ArenaEncounter {
  phase: RPGPhase = 'warmup';
  route: Side = 1;
  round = 0;
  health = 3;
  errors = 0;
  clock = 0;
  turn = 0;
  lastContact = -1;
  message = '';
  readonly initialSide: Side;
  readonly layout;
  readonly config?: RpgDayConfig;
  constructor(readonly arena: Arena, seed: string, config?: RpgDayConfig) {
    this.initialSide = rng(seed).chance(0.5) ? 1 : -1;
    this.layout = arenaLayout(arena);
    this.config = config;
  }
  get rules(): ArenaRuleSet {return this.config ?? arenaRules[this.arena];}
  get blocked(): Side {
    const invert = this.arena === 'field' && this.round >= 2 ? 1 : 0;
    return ((this.round + this.turn + invert) % 2 ? -this.initialSide : this.initialSide) as Side;
  }
  get z() {return this.arena === 'field' ? 1 - this.round * 2.4 : this.arena === 'ice' ? -3.0 - this.round * 0.8 : -5;}
  get cue() {return this.clock < 0.46 ? 'read' : this.clock < 0.63 ? 'strike' : 'open';}
  get duration() {return this.rules.period + (this.arena === 'stage' && this.route === -1 ? 0.8 : 0);}
  get safeSpot(): Vec {return [-this.blocked * 2.35, 0, this.z];}
  get finaleSpot(): Vec {return this.layout.end;}
  near(p: Vec, q: Vec, r = 1.45) {return Math.hypot(p[0] - q[0], p[2] - q[2]) <= r && Math.abs(p[1] - q[1]) < 0.95;}
  interact(p: Vec) {
    if (this.phase === 'warmup' && this.near(p, this.layout.warm)) {
      this.phase = 'route'; this.message = '左右两处发光印记代表两种能力，到达后确认。'; return true;
    }
    if (this.phase === 'route') {
      const branch = this.layout.branches.findIndex(q => this.near(p, q));
      if (branch < 0) return false;
      this.route = branch === 0 ? -1 : 1; this.phase = 'duel'; this.clock = 0;
      this.message = this.rules.routes[branch] + '已装备'; return true;
    }
    if (this.phase === 'finale' && this.near(p, this.finaleSpot)) {
      this.phase = 'curtain'; return true;
    }
    return false;
  }
  advance(dt: number, p: Vec, guard: boolean, evading: boolean) {
    if (this.phase !== 'duel') return;
    this.clock += dt / this.duration;
    if (this.clock >= 1) {this.clock %= 1; this.turn++;}
    if (this.cue !== 'strike' || this.lastContact === this.turn || Math.abs(p[2] - this.z) > 2.6) return;
    if (this.blocked * p[0] < -0.35) return;
    this.lastContact = this.turn;
    if (evading || guard && (this.route === 1 && this.arena === 'ice' || this.route === -1 && this.arena === 'stage')) {
      this.message = '避开了这次压迫！'; return;
    }
    this.errors++; this.health--; this.message = '站在了封锁侧，下一次观察对手的预备动作。';
    if (!this.health) this.phase = 'lost';
  }
  strike(p: Vec, body: {guard: boolean; airborne: boolean; dashing: boolean}) {
    if (this.phase !== 'duel') return false;
    const reach = this.arena === 'field' && this.route === 1 ? 2.1 : 1.55;
    if (!this.near(p, this.safeSpot, reach)) {this.message = '移到亮起的空侧落点再出手。'; return false;}
    if (this.cue !== 'open') {this.message = '等对手扑出、落下或交叉封锁后出手。'; return false;}
    if (this.arena === 'stage' && (this.route === -1 ? !body.guard : !body.airborne)) {
      this.message = this.route === -1 ? '摊开身体压住制动踏板，再击破低处的关节。' : '弹跳离地，击中吊线升起时的关节。'; return false;
    }
    if (this.arena === 'field' && this.route === -1 && !body.dashing) {
      this.message = '空侧出现后，用闪避加速穿过推进线。'; return false;
    }
    this.round += this.arena === 'stage' && this.route === 1 ? 2 : 1;
    this.clock = 0; this.turn++; this.lastContact = -1;
    this.message = this.arena === 'stage' ? '破绽已击中。' : this.arena === 'field' ? '推进成功，下一条线亮了。' : '出手命中空侧！';
    if (this.round >= this.rules.rounds) this.phase = 'finale';
    return true;
  }
  retry() {
    if (this.phase !== 'lost') return;
    this.health = 3; this.clock = 0; this.lastContact = -1; this.turn++;
    this.phase = 'duel'; this.message = '从本轮继续。';
  }
}
