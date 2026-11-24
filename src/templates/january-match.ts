/** Authored match tableaux. Each dot is a playable cell; spaces divide gravity lanes. */
import {buildFebruaryMatches} from './february-match';
import {buildMarchMatches} from './march-match';
import {buildAprilMatches} from './april-match';
import {buildMayMatches} from './may-match';
import {buildJuneMatches} from './june-match';
import {buildOctoberMatches} from './october-match';
import {buildJulyMatches} from './july-match';
import {buildAugustMatches} from './august-match';
import {buildSeptemberMatches} from './september-match';
import {buildNovemberMatches} from './november-match';
import {buildDecemberMatches} from './december-match';
export type JanuaryBoardTheme = 'titan' | 'press' | 'stage' | 'aurora' | 'print' | 'coast' | 'music' | 'craft';
export type JanuaryMatchMechanic = 'clear' | 'press';
interface Tableau {
  mask: string[];
  targets: number[];
}
export interface JanuaryMatch {
  theme: JanuaryBoardTheme;
  mechanic?: JanuaryMatchMechanic;
  moves: number;
  rules: string;
  zone: string;
  action: string;
  marks: [string, string];
  stages: [string, string, string, string];
  tableaux: [Tableau, Tableau, Tableau];
  labels?: [string, string, string];
  pressLabels?: [string, string];
  sky?: [string, string];
  baseColor?: string;
  symbol?: string;
}

// Geometrically verified 8x8 masks tailored to design-card board silhouettes.
// Every target cell (x,y) keeps its vertical/horizontal match motif inside '.' cells.
const T_FAN: [Tableau, Tableau, Tableau] = [
  {mask: ['   ..   ', '  ....  ', ' ...... ', '........', '........', '........', ' ...... ', '  ....  '], targets: [27]},
  {mask: ['  ....  ', ' ...... ', '........', '........', '........', '........', ' ...... ', '  ....  '], targets: [26, 29]},
  {mask: [' ...... ', '........', '........', '........', ' ...... ', ' ...... ', '  ....  ', '  ....  '], targets: [19, 36]},
];
const T_WINGS: [Tableau, Tableau, Tableau] = [
  {mask: ['..    ..', '...  ...', '........', '........', '........', ' ...... ', '  ....  ', '   ..   '], targets: [27]},
  {mask: ['...  ...', '........', '........', '........', '........', '...  ...', '..    ..', '        '], targets: [18, 21]},
  {mask: ['  ....  ', '........', '........', '........', '........', '........', ' ...... ', '  ....  '], targets: [26, 29]},
];
const T_VINE: [Tableau, Tableau, Tableau] = [
  {mask: ['  ....  ', '  ....  ', ' ...... ', '........', '........', ' ...... ', '  ....  ', '  ....  '], targets: [35]},
  {mask: [' ...... ', '........', '........', ' ...... ', ' ...... ', '........', ' ...... ', '  ....  '], targets: [18, 21]},
  {mask: ['  ....  ', ' ...... ', '........', '........', '........', ' ...... ', '  ....  ', '   ..   '], targets: [19, 44]},
];
const T_STEP: [Tableau, Tableau, Tableau] = [
  {mask: ['.....   ', '......  ', '....... ', '........', '........', ' .......','  ......', '   .....'], targets: [26]},
  {mask: ['......  ', '....... ', '........', '........', '........', '........', ' .......','  ......'], targets: [18, 45]},
  {mask: ['  ......', ' .......', '........', '........', '........', '....... ', '......  ', '.....   '], targets: [29, 42]},
];
const T_COAST: [Tableau, Tableau, Tableau] = [
  {mask: ['...  ...', '...  ...', '........', '........', '........', '........', '...  ...', '...  ...'], targets: [25, 30]},
  {mask: ['.... ...', '........', '........', '........', '........', '........', '.... ...', '... ....'], targets: [18, 45]},
  {mask: [' ...... ', '........', '........', '........', '........', '........', ' ...... ', '  ....  '], targets: [27, 36]},
];
const T_STRINGS: [Tableau, Tableau, Tableau] = [
  {mask: [' ...... ', ' ...... ', ' ...... ', '........', '........', ' ...... ', ' ...... ', ' ...... '], targets: [26]},
  {mask: [' ...... ', '........', '........', '........', '........', '........', ' ...... ', ' ...... '], targets: [18, 21]},
  {mask: ['........', '........', '........', '........', '........', '........', ' ...... ', '  ....  '], targets: [26, 37]},
];
const T_PRESS_A: [Tableau, Tableau, Tableau] = [
  {mask: ['  ....  ', ' ...... ', ' ...... ', '........', '........', ' ...... ', ' ...... ', '  ....  '], targets: [18, 37]},
  {mask: [' .....  ', ' ...... ', ' ...... ', '........', '........', ' ...... ', ' ...... ', '  ..... '], targets: [34, 21]},
  {mask: ['  ....  ', '....... ', '........', '........', '........', '........', ' .......', '  ....  '], targets: [26, 45]},
];
const T_PRESS_B: [Tableau, Tableau, Tableau] = [
  {mask: [' ...... ', '........', '........', '........', '........', ' ...... ', ' ...... ', '  ....  '], targets: [17, 37]},
  {mask: ['  ....  ', ' ...... ', '........', '........', '........', '........', ' ...... ', '  ....  '], targets: [26, 44]},
  {mask: [' ...... ', '........', '........', '........', '........', '........', ' ...... ', ' ...... '], targets: [19, 45]},
];
const T_CUP: [Tableau, Tableau, Tableau] = [
  {mask: ['........', '........', '........', ' ...... ', ' ...... ', ' ...... ', '  ....  ', '  ....  '], targets: [18, 21]},
  {mask: ['........', '........', ' ...... ', ' ...... ', ' ...... ', ' ...... ', '  ....  ', '  ....  '], targets: [26, 29]},
  {mask: [' ...... ', ' ...... ', '........', '........', ' ...... ', ' ...... ', '  ....  ', '  ....  '], targets: [35]},
];
const T_BRIDGE: [Tableau, Tableau, Tableau] = [
  {mask: ['  ....  ', ' ...... ', '........', '........', '........', ' ...... ', '  ....  ', '        '], targets: [25]},
  {mask: [' ...... ', '........', '........', '........', '........', '........', ' ...... ', '        '], targets: [26, 29]},
  {mask: ['........', '........', '........', '........', '........', '........', ' ...... ', '  ....  '], targets: [25, 30]},
];
const T_RING: [Tableau, Tableau, Tableau] = [
  {mask: ['  ....  ', ' ...... ', '........', '...  ...', '...  ...', '........', ' ...... ', '  ....  '], targets: [18]},
  {mask: ['  ....  ', ' ...... ', '........', '........', '........', '........', ' ...... ', '  ....  '], targets: [18, 45]},
  {mask: [' ...... ', '........', '........', '........', '........', '........', ' ...... ', '  ....  '], targets: [27, 36]},
];
const T_SLOPE: [Tableau, Tableau, Tableau] = [
  {mask: [' ...... ', ' ...... ', '........', '........', '........', ' ...... ', '  ....  ', '   ..   '], targets: [18]},
  {mask: ['  ....  ', ' ...... ', '........', '........', '........', '........', ' ...... ', '  ....  '], targets: [26, 37]},
  {mask: ['   ..   ', '  ....  ', ' ...... ', '........', '........', '........', ' ...... ', ' ...... '], targets: [44]},
];

function mk(
  theme: JanuaryBoardTheme,
  moves: number,
  zone: string,
  action: string,
  marks: [string, string],
  rules: string,
  stages: [string, string, string, string],
  tableaux: [Tableau, Tableau, Tableau],
  labels: [string, string, string],
  extra?: Partial<Pick<JanuaryMatch, 'mechanic' | 'pressLabels' | 'sky' | 'baseColor' | 'symbol'>>,
): JanuaryMatch {
  return {theme, moves, zone, action, marks, rules, stages, tableaux, labels, ...extra};
}

export const januaryMatches: Readonly<Record<string, JanuaryMatch | undefined>> = {
  '0102': mk('stage', 16, '海地展馆 · 讲台', '传声', ['全排收到', '三步越空席'],
    '消除讲台与扇形座区上的金框字粒，让演讲回声依次传遍首排、中席与远廊。',
    ['首排泛起波纹', '越过空席传声', '回声抵至远廊', '讲台与听众席相连'], T_FAN, ['讲台', '座区', '远廊'],
    {sky: ['#4d677b', '#e5cba4'], baseColor: '#997c60', symbol: '♪'}),
  '0103': mk('aurora', 16, '冰岛湖岸 · 极光幕', '接光', ['双翼同亮', '保留一道虹彩'],
    '消除中央轴与双翼金框凝露，让冰岛上空的凤凰极光与湖面光帘首尾相接。',
    ['中央光轴显现', '双翼光帘延展', '湖面映出凤凰影', '双翼极光定格'], T_WINGS, ['中轴', '光翼', '倒影'],
    {sky: ['#182942', '#528d88'], baseColor: '#4e6770', symbol: '✦'}),
  '0104': mk('print', 16, '版画架 · 藤尖工坊', '压印', ['双枝抵顶', '四步接短叉'],
    '从根座向上消除金框格，引导藤尖缠过横杆并抵达上棚，揭开枝纹版画。',
    ['根座抽出新芽', '双枝缠绕横杆', '藤尖触及上棚', '压毡揭出枝纹'], T_VINE, ['根座', '枝叉', '上棚'],
    {sky: ['#4a6357', '#dec7a2'], baseColor: '#8d745c', symbol: '❦'}),
  '0105': mk('craft', 16, '转角厂房 · 暗房台', '显影', ['完整四层', '一次跨面'],
    '逐层消除阶梯转角处的亮窗金框，把建筑两面立面的横向长窗接成一线。',
    ['底片推进首层', '跨过转角窗带', '四层长窗贯通', '接触印相定影'], T_STEP, ['亮窗', '转角', '窗带'],
    {sky: ['#3e5668', '#d8cab8'], baseColor: '#7f7f7a', symbol: '▤'}),
  '0106': mk('coast', 16, '地质讲台 · 拼图盘', '拼岸', ['全海湾吻合', '留一条水槽'],
    '消除西岸与东岸间的金框水带，让分离的大陆海岸轮廓步步靠拢并吻合。',
    ['西岸轮廓浮现', '两岸海湾靠拢', '最后缺口对齐', '海岸拼图合拢'], T_COAST, ['西岸', '海槽', '拼口'],
    {sky: ['#446c85', '#e4d5b6'], baseColor: '#9d8a6f', symbol: '≈'}),
  '0107': mk('print', 16, '河岸取景台 · 暗箱', '取景', ['三柱入框', '逆流取景'],
    '消除河心浮位与岸边柱影的金框格，让尼罗河倒影与卢克索柱头同入方框。',
    ['首根柱影入框', '越过河心浮位', '三柱与倒影齐平', '方底片快门定格'], T_BRIDGE, ['南岸', '河心', '柱影'],
    {sky: ['#637c8b', '#edd1a0'], baseColor: '#b0916b', symbol: '◈'}),
  '0108': mk('music', 16, '图珀洛 · 木吉他台', '调弦', ['一次齐鸣', '无重排调弦'],
    '沿六弦棋盘消除金框音格，逐弦校音归位，亲手拨响第一记清晰和弦。',
    ['首弦定音起鸣', '双弦共鸣校准', '六弦齐整归位', '和弦回荡木箱'], T_STRINGS, ['弦钮', '琴弦', '音孔'],
    {sky: ['#5c4e5a', '#e8c298'], baseColor: '#9c7153', symbol: '♫'}),
  '0109': mk('print', 16, '套色印台 · 丝带结', '套色', ['完整长环', '三色套准'],
    '纵向连消穿过「纵带」格，横向连消穿过「横带」格，让两条丝带于交点套准显色。',
    ['首处交叉显色', '解开中段丝结', '末端搭进晾夹', '三色套印完成'], T_PRESS_B, ['纵带', '横带', '交点'],
    {mechanic: 'press', pressLabels: ['纵带', '横带'], sky: ['#46556b', '#e2ccb4'], baseColor: '#957a65', symbol: '✦'}),
  '0110': mk('craft', 16, '折叠街景 · 版画桌', '折城', ['全屋立起', '保住中心路'],
    '消除两道折线旁的金框格，让平面街区随连消层层立起，化作立体街口透视。',
    ['掀起外街屋面', '撑起中心折线', '两侧街面立起', '立体街景展开'], T_STEP, ['折线', '屋面', '街口'],
    {sky: ['#4d6770', '#e3d0b3'], baseColor: '#9b8770', symbol: '⌂'}),
  '0111': mk('music', 16, '口袋曲库 · 播放器', '编曲', ['无重复曲序', '收满六音'],
    '消除窄队列中的金框乐点，把六色旋律顺次填入播放队列，按下队头播放键。',
    ['首轨填入队尾', '双段曲序衔接', '曲库编排就绪', '原声短句奏响'], T_CUP, ['曲库', '队列', '播放'],
    {sky: ['#3d5c78', '#dce6ee'], baseColor: '#8d9ca6', symbol: '▷'}),
  '0112': mk('coast', 16, '五十八号码头 · 取景框', '望北', ['前中远齐全', '一次水平贯通'],
    '从近处木桩逐层消除至河面与远岸，抬高取景框定格向北望去的清晰地平线。',
    ['近景木桩清晰', '河面水光展开', '远岸地平对齐', '北望底片定格'], T_SLOPE, ['木桩', '河面', '地平'],
    {sky: ['#4a687d', '#ded6c5'], baseColor: '#8d877a', symbol: '▭'}),
  '0113': mk('music', 16, '歌剧院屋顶 · 发射架', '调谐', ['无杂音段', '单回合跨两站'],
    '从台口传声口向屋顶天线推进消除，避开杂音接通远端无线收听器。',
    ['台口三音入麦', '屋顶天线起振', '远端耳机接通', '歌剧歌声传出'], T_FAN, ['传声', '天线', '收听'],
    {sky: ['#2b3c54', '#caa68c'], baseColor: '#776862', symbol: '♪'}),
  '0114': {
    theme: 'titan', moves: 15, zone: '惠更斯号 · 下降舱', action: '下降', marks: ['余十步着陆', '一次解双索'],
    rules: '消除金框内的凝露，穿过云窗、解开双伞索，再清出地表落点。未引爆的特效可带往下一层。',
    stages: ['琥珀色的云窗', '两束降落伞索', '穿过近地薄雾', '确认着陆信号'],
    tableaux: [
      {mask: ['  ....  ', ' ...... ', '........', '........', '........', ' ...... ', '  ....  ', '   ..   '], targets: [26]},
      {mask: [' ...... ', '........', '........', ' ...... ', ' ...... ', ' ...... ', '  ....  ', '   ..   '], targets: [26, 29]},
      {mask: ['   ..   ', '  ....  ', ' ...... ', '........', '........', '........', ' ...... ', '  ....  '], targets: [44]},
    ],
  },
  '0115': mk('craft', 16, '玻璃工坊 · 透明量规', '塑杯', ['零溢流', '双色夹层'],
    '沿上宽下窄的杯形棋盘消除两侧金框，让水色齐平上升，抽去模芯显出折光杯影。',
    ['杯口水色初平', '杯壁两侧齐升', '厚底定形凝光', '抽芯展现杯影'], T_CUP, ['杯沿', '杯壁', '厚底'],
    {sky: ['#4d7b8c', '#e6ece8'], baseColor: '#98adb0', symbol: '▽'}),
  '0116': mk('stage', 16, '圣詹姆斯剧院 · 大阶梯', '开演', ['两翼同到', '全脚灯亮起'],
    '从两翼对称阶梯消除拍点金框，逐级点亮脚灯并在台口配齐合拍终音。',
    ['首盏脚灯亮起', '两翼同步下阶', '台口终拍汇合', '大幕重开谢幕'], T_WINGS, ['侧幕', '阶梯', '台口'],
    {sky: ['#452d43', '#dfaa79'], baseColor: '#8d5b54', symbol: '★'}),
  '0117': mk('aurora', 16, '射电台 · 双束观测盘', '对焦', ['两端同步', '长束无断点'],
    '纵向连消穿过「核心」格，横向连消穿过「喷流」格，把半人马座 A 的双向喷流同步接通。',
    ['核心暗格开启', '长短双束延伸', '等值线两端同步', '星系全貌收束'], T_PRESS_B, ['核心', '喷流', '末端'],
    {mechanic: 'press', pressLabels: ['核心', '喷流'], sky: ['#1a213d', '#866b8c'], baseColor: '#565068', symbol: '✦'}),
  '0118': mk('print', 16, '林间书桌 · 立体折页', '翻页', ['双径读完', '带三步合书'],
    '从树洞起点沿岔路消除字粒金框，将纸星送入书脊，让两页林景一同立起。',
    ['掀起首张折页', '岔路林景展开', '纸星落入书脊', '双页林景立起'], T_VINE, ['树洞', '岔路', '书脊'],
    {sky: ['#517665', '#e9d8b3'], baseColor: '#928061', symbol: '❀'}),
  '0119': mk('print', 16, '水纹印台 · 透明水槽', '浸润', ['全槽浸润', '干边清晰'],
    '消除浅槽与引水渠上的金框格，将水流引入深槽并揭去吸水毡显出双层水纹。',
    ['打开首条水渠', '浅深双槽蓄水', '出水口清晰成纹', '吸水毡揭出压纹'], T_COAST, ['浅槽', '水渠', '深槽'],
    {sky: ['#35677a', '#cde2e0'], baseColor: '#6d949b', symbol: '≈'}),
  '0120': mk('aurora', 16, '月面斜坡 · SLIM 舱', '着陆', ['正中触地', '保留双缓冲'],
    '消除高位象限与断阶上的金框，校正横向偏移，让小型着陆器稳落坡面目标区。',
    ['高位象限校正', '跨过月面断阶', '坡面目标区触地', '着陆通信灯亮起'], T_SLOPE, ['高位', '断阶', '坡点'],
    {sky: ['#1b2338', '#7c8194'], baseColor: '#767a85', symbol: '◈'}),
  '0121': mk('print', 16, '机械打字台 · 滑架', '排字', ['页边齐整', '两行同列对印'],
    '纵向连消校准「同列」字锤，横向连消推动「滑架」行进，敲出齐整的白行成稿。',
    ['首行字码右移', '多行同列对印', '页末铃声清响', '转动纸辊取稿'], T_PRESS_A, ['同列', '滑架', '行尾'],
    {mechanic: 'press', pressLabels: ['同列', '滑架'], sky: ['#495863', '#e6dac4'], baseColor: '#8d8578', symbol: '▤'}),
  '0122': mk('coast', 16, '跨海铁路 · 桁架桥', '接轨', ['三桥连落', '长跨一次到位'],
    '在大陆轨端、海面长跨与岛台桥墩上消除金框，依次落下轨梁直抵基韦斯特终点。',
    ['首段桥墩落梁', '横跨海面长桥', '扣上终点钢轨', '列车驶过海面'], T_BRIDGE, ['大陆', '长跨', '岛台'],
    {sky: ['#3e7794', '#e8dec5'], baseColor: '#789fa8', symbol: '━'}),
  '0123': mk('stage', 16, '日内瓦医学院 · 装裱桌', '落章', ['四角平整', '无重排落章'],
    '消除页眉、姓名行与落款处金框，展平纸角并完成压印，将毕业证送入展框。',
    ['展平页角纸边', '对齐姓名主行', '落款压印清晰', '毕业页入展框'], T_FAN, ['页眉', '姓名', '落款'],
    {sky: ['#495d6e', '#e7d5b5'], baseColor: '#967c62', symbol: '❖'}),
  '0124': mk('print', 16, '暗房灯箱 · 洞口狭缝', '透光', ['只用窄束', '双侧合光'],
    '消除洞外亮场与狭缝处的金框，让光线穿透遮光板，在背光壁显出清晰正像。',
    ['狭缝透出首束光', '背墙光斑延展', '完整轮廓显影', '转过底片现正像'], T_RING, ['亮场', '狭缝', '背壁'],
    {sky: ['#26303d', '#9e9a92'], baseColor: '#696662', symbol: '◐'}),
  '0125': mk('coast', 16, '旅行报刊亭 · 环航图', '归程', ['全站戳记', '一次换乘归来'],
    '沿环形航线与换乘口消除金框，把七十二天环球旅行的归来日票送入印机头条。',
    ['首站船票打孔', '切入换乘捷径', '抵达新泽西终点', '印机压出头条'], T_RING, ['航线', '换乘', '归站'],
    {sky: ['#4b6e7d', '#ead3ae'], baseColor: '#9b8368', symbol: '↻'}),
  '0126': mk('print', 16, '双开装订台 · 针眼线', '穿线', ['页序齐全', '一线穿三帖'],
    '纵向连消穿过「穿线」针眼，横向连消对齐「对页」折口，把装订展本严密合册。',
    ['首帖针眼对齐', '双页折口穿线', '书背末线收结', '宪法展本合册'], T_PRESS_A, ['穿线', '对页', '书背'],
    {mechanic: 'press', pressLabels: ['穿线', '对页'], sky: ['#495e5c', '#ead6b2'], baseColor: '#998063', symbol: '✦'}),
  '0127': mk('print', 16, '国家地理 · 测绘桌', '签绘', ['四角均测', '三线一交'],
    '纵向连消校准「经线」格，横向连消连起「纬线」格，于图桌中心落下学会签章。',
    ['首段纬线定标', '经纬格中心相交', '署名墨槽落印', '注册证书成卷'], T_PRESS_B, ['经线', '纬线', '中心'],
    {mechanic: 'press', pressLabels: ['经线', '纬线'], sky: ['#385866', '#e6cfa3'], baseColor: '#917b5f', symbol: '◎'}),
  '0128': mk('craft', 16, '微缩厨房 · 灯箱台', '开门', ['各层均亮', '无重排开门'],
    '消除门轴与层架上的金框格，逐档旋开冰箱门扇，点亮箱内微缩厨房的光影。',
    ['门扇旋开一档', '箱内层架透亮', '全层灯光贯通', '微缩光影定格'], T_STEP, ['门轴', '层架', '箱灯'],
    {sky: ['#3e5c6b', '#e7dfcf'], baseColor: '#8d9699', symbol: '☀'}),
  '0129': mk('aurora', 16, '北美夜空 · 拼接台', '拼夜', ['地平线零错位', '天空三连'],
    '消除左右景框与天地接缝上的金框，令地平线零错齿并向两侧展开完整夜景。',
    ['地平线初对齐', '星幕景框相接', '闭合最后接缝', '完整夜景展开'], T_WINGS, ['左框', '接缝', '右框'],
    {sky: ['#16243d', '#5c7c99'], baseColor: '#4c5f73', symbol: '★'}),
  '0130': mk('stage', 16, '国会图书馆 · 入藏架', '上架', ['全类齐架', '高架优先'],
    '沿三列书车与木梯消除金框，将杰斐逊藏书按类推入书架并拉开目录抽屉。',
    ['首车藏书分类', '跨过过道上高架', '末册归入空隙', '目录屉现馆藏号'], T_STRINGS, ['书车', '过道', '书架'],
    {sky: ['#4f4842', '#e4cca8'], baseColor: '#8d6c53', symbol: '▤'}),
  '0131': {
    theme: 'press', mechanic: 'press', moves: 16, zone: '登记处 · 印样台', action: '压印', marks: ['余十步交样', '单次交换完成一笔'],
    rules: '让纵向同色连线穿过「给墨」格，让横向连线穿过「压辊」格。对应方向的条纹扫过也有效，两格就绪便印下一笔。',
    stages: ['给弧线着墨', '印出第二道折线', '对上最后一笔', '印样登记完成'],
    tableaux: T_PRESS_A,
  },
  ...buildFebruaryMatches({
    fan: T_FAN, wings: T_WINGS, vine: T_VINE, step: T_STEP, coast: T_COAST, strings: T_STRINGS,
    pressA: T_PRESS_A, pressB: T_PRESS_B, cup: T_CUP, bridge: T_BRIDGE, ring: T_RING, slope: T_SLOPE,
  }),
  ...buildMarchMatches({
    fan: T_FAN, wings: T_WINGS, vine: T_VINE, step: T_STEP, coast: T_COAST, strings: T_STRINGS,
    pressA: T_PRESS_A, pressB: T_PRESS_B, cup: T_CUP, bridge: T_BRIDGE, ring: T_RING, slope: T_SLOPE,
  }),
  ...buildAprilMatches({
    fan: T_FAN, wings: T_WINGS, vine: T_VINE, step: T_STEP, coast: T_COAST, strings: T_STRINGS,
    pressA: T_PRESS_A, pressB: T_PRESS_B, cup: T_CUP, bridge: T_BRIDGE, ring: T_RING, slope: T_SLOPE,
  }),
  ...buildMayMatches({
    fan: T_FAN, wings: T_WINGS, vine: T_VINE, step: T_STEP, coast: T_COAST, strings: T_STRINGS,
    pressA: T_PRESS_A, pressB: T_PRESS_B, cup: T_CUP, bridge: T_BRIDGE, ring: T_RING, slope: T_SLOPE,
  }),
  ...buildJuneMatches({
    fan: T_FAN, wings: T_WINGS, vine: T_VINE, step: T_STEP, coast: T_COAST, strings: T_STRINGS,
    pressA: T_PRESS_A, pressB: T_PRESS_B, cup: T_CUP, bridge: T_BRIDGE, ring: T_RING, slope: T_SLOPE,
  }),
  ...buildOctoberMatches({
    fan: T_FAN, wings: T_WINGS, vine: T_VINE, step: T_STEP, coast: T_COAST, strings: T_STRINGS,
    pressA: T_PRESS_A, pressB: T_PRESS_B, cup: T_CUP, bridge: T_BRIDGE, ring: T_RING, slope: T_SLOPE,
  }),
  ...buildJulyMatches({
    fan: T_FAN, wings: T_WINGS, vine: T_VINE, step: T_STEP, coast: T_COAST, strings: T_STRINGS,
    pressA: T_PRESS_A, pressB: T_PRESS_B, cup: T_CUP, bridge: T_BRIDGE, ring: T_RING, slope: T_SLOPE,
  }),
  ...buildAugustMatches({
    fan: T_FAN, wings: T_WINGS, vine: T_VINE, step: T_STEP, coast: T_COAST, strings: T_STRINGS,
    pressA: T_PRESS_A, pressB: T_PRESS_B, cup: T_CUP, bridge: T_BRIDGE, ring: T_RING, slope: T_SLOPE,
  }),
  ...buildSeptemberMatches({
    fan: T_FAN, wings: T_WINGS, vine: T_VINE, step: T_STEP, coast: T_COAST, strings: T_STRINGS,
    pressA: T_PRESS_A, pressB: T_PRESS_B, cup: T_CUP, bridge: T_BRIDGE, ring: T_RING, slope: T_SLOPE,
  }),
  ...buildNovemberMatches({
    fan: T_FAN, wings: T_WINGS, vine: T_VINE, step: T_STEP, coast: T_COAST, strings: T_STRINGS,
    pressA: T_PRESS_A, pressB: T_PRESS_B, cup: T_CUP, bridge: T_BRIDGE, ring: T_RING, slope: T_SLOPE,
  }),
  ...buildDecemberMatches({
    fan: T_FAN, wings: T_WINGS, vine: T_VINE, step: T_STEP, coast: T_COAST, strings: T_STRINGS,
    pressA: T_PRESS_A, pressB: T_PRESS_B, cup: T_CUP, bridge: T_BRIDGE, ring: T_RING, slope: T_SLOPE,
  }),
};

export function isPressMatch(config: JanuaryMatch | undefined) {
  return !!config && (config.mechanic === 'press' || config.theme === 'press');
}

export function targetLabel(config: JanuaryMatch, stage: number, index: number) {
  if (isPressMatch(config)) {
    const pair = config.pressLabels ?? ['给墨', '压辊'];
    return config.tableaux[stage].targets[0] === index ? pair[0] : pair[1];
  }
  const labels = config.labels ?? ['云窗', '伞索', '落点'];
  return labels[stage] ?? labels[0];
}

export function pressContact(
  target: number, vertical: boolean, runs: number[][], rows: number[], columns: number[],
) {
  return (vertical ? columns.includes(target % 8) : rows.includes(target >> 3)) ||
    runs.some(run => run.includes(target) && run[1] - run[0] === (vertical ? 8 : 1));
}
