import type {JanuaryBoardTheme, JanuaryMatch} from './january-match';

type Preset = 'fan' | 'wings' | 'vine' | 'step' | 'coast' | 'strings' | 'pressA' | 'pressB' | 'cup' | 'bridge' | 'ring' | 'slope';
export function buildOctoberMatches(presets: Record<Preset, JanuaryMatch['tableaux']>): Record<string, JanuaryMatch> {
  function board(theme: JanuaryBoardTheme, tableaux: JanuaryMatch['tableaux'], zone: string, labels: [string, string, string],
    ending: string, rules: string, sky: [string, string], baseColor: string, symbol: string, press: boolean): JanuaryMatch {
    return {theme, tableaux, zone, labels, stages: [...labels, ending], rules, sky, baseColor, symbol,
      moves: 16, marks: ['余十步收尾', '双格同时完成'], action: '拼图', mechanic: press ? 'press' : 'clear',
      ...(press ? {pressLabels: [labels[0], labels[1]] as [string, string]} : {})};
  }
  return {
    '1001': board('coast', [presets.bridge[0], presets.coast[1], presets.bridge[2]], "澳门海面上的第四道弧", ["桥塔", "风障", "桥面"], "连起跨海车道", "沿金框依次拼出桥塔、风障和桥面。双目标时留一枚条纹，等两格同线再交换。", ["#376e8f", "#d4e9dc"], "#67919a", "≈", false),
    '1002': board('print', [presets.pressA[0], presets.pressB[1], presets.pressA[2]], "一封信上的两国图案", ["左图", "中缝", "右图"], "盖好联票纪念戳", "纵消穿过「左图」，横消穿过「中缝」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '1003': board('craft', [presets.step[0], presets.fan[1], presets.bridge[2]], "亭角伸出票框", ["亭柱", "飞檐", "齿孔"], "拼出亭子的飞檐", "沿金框依次拼出亭柱、飞檐和齿孔。双目标时留一枚条纹，等两格同线再交换。", ["#547181", "#efddbe"], "#9b8973", "◇", false),
    '1004': board('print', [presets.fan[0], presets.wings[1], presets.strings[2]], "最后一张动画原画", ["草稿", "透明片", "片尾"], "合成动漫节片尾", "沿金框依次拼出草稿、透明片和片尾。双目标时留一枚条纹，等两格同线再交换。", ["#695968", "#efdfbc"], "#ad977e", "印", false),
    '1005': board('print', [presets.pressB[0], presets.pressA[1], presets.pressB[2]], "奖讯传到实验笔记旁", ["记录页", "资料栏", "奖讯"], "收好获奖消息", "纵消穿过「记录页」，横消穿过「资料栏」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '1006': board('print', [presets.pressB[0], presets.pressB[1], presets.pressA[2]], "两枚邮票一条白边", ["左版", "票边", "印章"], "拼好纪念联票", "纵消穿过「左版」，横消穿过「票边」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '1007': board('print', [presets.pressA[0], presets.pressA[1], presets.pressB[2]], "古人的侧影进入票框", ["画像", "名签", "边纸"], "压印思想家邮页", "纵消穿过「画像」，横消穿过「名签」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '1008': board('music', [presets.strings[0], presets.wings[1], presets.fan[2]], "巴比肯的提词本", ["乐谱", "提词页", "追光灯"], "对齐伦敦首场乐句", "沿金框依次拼出乐谱、提词页和追光灯。双目标时留一枚条纹，等两格同线再交换。", ["#594264", "#f0d0a9"], "#93786c", "♫", false),
    '1009': board('craft', [presets.bridge[0], presets.step[1], presets.slope[2]], "拼上横跨黄河的一跨", ["河岸", "主跨", "梁端"], "合上主跨最后一格", "沿金框依次拼出河岸、主跨和梁端。双目标时留一枚条纹，等两格同线再交换。", ["#547181", "#efddbe"], "#9b8973", "◇", false),
    '1010': board('print', [presets.fan[0], presets.step[1], presets.fan[2]], "百年故宫的方寸门扇", ["门钉", "斗拱", "票齿"], "盖下故宫纪念戳", "沿金框依次拼出门钉、斗拱和票齿。双目标时留一枚条纹，等两格同线再交换。", ["#695968", "#efdfbc"], "#ad977e", "印", false),
    '1011': board('coast', [presets.vine[0], presets.coast[1], presets.vine[2]], "把叶脉印进齿孔", ["叶尖", "脉纹", "票框"], "集齐植物票样", "沿金框依次拼出叶尖、脉纹和票框。双目标时留一枚条纹，等两格同线再交换。", ["#547b79", "#f0e7bc"], "#8d9f75", "叶", false),
    '1012': board('craft', [presets.step[0], presets.ring[1], presets.slope[2]], "在展柜里拼回呼吸节律", ["气室", "压力表", "节律线"], "拼好铁肺工作示意图", "沿金框依次拼出气室、压力表和节律线。双目标时留一枚条纹，等两格同线再交换。", ["#547181", "#efddbe"], "#9b8973", "◇", false),
    '1013': board('print', [presets.pressA[0], presets.pressB[1], presets.pressB[2]], "方寸中的峰会徽记", ["票幅", "徽记", "齿孔"], "套准峰会纪念票", "纵消穿过「票幅」，横消穿过「徽记」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '1014': board('print', [presets.vine[0], presets.fan[1], presets.coast[2]], "翻到百亩森林的第一页", ["扉页", "蜂蜜罐", "林间小径"], "装订森林故事册", "沿金框依次拼出扉页、蜂蜜罐和林间小径。双目标时留一枚条纹，等两格同线再交换。", ["#695968", "#efdfbc"], "#ad977e", "印", false),
    '1015': board('print', [presets.pressB[0], presets.pressA[1], presets.pressA[2]], "作家的名字落在票角", ["肖像", "署名", "底纹"], "装成作家票册", "纵消穿过「肖像」，横消穿过「署名」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '1016': board('coast', [presets.vine[0], presets.cup[1], presets.fan[2]], "麦穗绕过校名", ["麦芒", "校徽", "票框"], "印出校庆纪念图", "沿金框依次拼出麦芒、校徽和票框。双目标时留一枚条纹，等两格同线再交换。", ["#547b79", "#f0e7bc"], "#8d9f75", "叶", false),
    '1017': board('print', [presets.ring[0], presets.strings[1], presets.step[2]], "校钟旁的一枚邮戳", ["钟楼", "百年字样", "戳面"], "拼合南开纪念戳", "沿金框依次拼出钟楼、百年字样和戳面。双目标时留一枚条纹，等两格同线再交换。", ["#695968", "#efdfbc"], "#ad977e", "印", false),
    '1018': board('print', [presets.pressA[0], presets.pressA[1], presets.pressA[2]], "伦敦书坊里的白鲸", ["封面", "书脊", "鲸尾"], "装订英国版书样", "纵消穿过「封面」，横消穿过「书脊」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '1019': board('aurora', [presets.ring[0], presets.step[1], presets.ring[2]], "东湖边的展板接上电", ["湖畔", "展板", "会场"], "拼亮论坛展台", "沿金框依次拼出湖畔、展板和会场。双目标时留一枚条纹，等两格同线再交换。", ["#364d72", "#b7d0d2"], "#6b8590", "◎", false),
    '1020': board('craft', [presets.bridge[0], presets.slope[1], presets.step[2]], "给进博展品排好站台", ["货箱", "站台", "展馆"], "拼好展品运单", "沿金框依次拼出货箱、站台和展馆。双目标时留一枚条纹，等两格同线再交换。", ["#506f86", "#edd9b1"], "#899391", "轨", false),
    '1021': board('craft', [presets.step[0], presets.fan[1], presets.step[2]], "义乌货架上的三行样品", ["货架", "样品册", "订单"], "拼好商品订货单", "沿金框依次拼出货架、样品册和订单。双目标时留一枚条纹，等两格同线再交换。", ["#547181", "#efddbe"], "#9b8973", "◇", false),
    '1022': board('print', [presets.fan[0], presets.ring[1], presets.fan[2]], "处方笺旁的邮票", ["画像", "署名", "邮戳"], "印好医家纪念票", "沿金框依次拼出画像、署名和邮戳。双目标时留一枚条纹，等两格同线再交换。", ["#695968", "#efdfbc"], "#ad977e", "印", false),
    '1023': board('craft', [presets.bridge[0], presets.fan[1], presets.step[2]], "广交会展位的陈列图", ["货架", "展样", "展位号"], "拼齐二期展位图", "沿金框依次拼出货架、展样和展位号。双目标时留一枚条纹，等两格同线再交换。", ["#547181", "#efddbe"], "#9b8973", "◇", false),
    '1024': board('aurora', [presets.ring[0], presets.slope[1], presets.ring[2]], "巨行星两旁的小光点", ["天王星", "内侧光点", "外侧光点"], "标出两颗卫星", "沿金框依次拼出天王星、内侧光点和外侧光点。双目标时留一枚条纹，等两格同线再交换。", ["#182d54", "#8498bc"], "#596d8a", "✦", false),
    '1025': board('coast', [presets.coast[0], presets.vine[1], presets.slope[2]], "两行稻穗围住纪念票", ["穗轴", "谷粒", "齿孔"], "印下稻穗票样", "沿金框依次拼出穗轴、谷粒和齿孔。双目标时留一枚条纹，等两格同线再交换。", ["#547b79", "#f0e7bc"], "#8d9f75", "叶", false),
    '1026': board('craft', [presets.slope[0], presets.bridge[1], presets.step[2]], "车轮从瓷都驶过", ["里程牌", "会车线", "试运终点"], "盖好试运记录", "沿金框依次拼出里程牌、会车线和试运终点。双目标时留一枚条纹，等两格同线再交换。", ["#506f86", "#edd9b1"], "#899391", "轨", false),
    '1027': board('coast', [presets.vine[0], presets.fan[1], presets.vine[2]], "长沙展棚里的果蔬篮", ["种子", "果篮", "展架"], "拼成农博会展篮", "沿金框依次拼出种子、果篮和展架。双目标时留一枚条纹，等两格同线再交换。", ["#547b79", "#f0e7bc"], "#8d9f75", "叶", false),
    '1028': board('coast', [presets.coast[0], presets.vine[1], presets.coast[2]], "把园艺展留在相册里", ["花坛", "温室", "相册"], "拼好园艺展末页", "沿金框依次拼出花坛、温室和相册。双目标时留一枚条纹，等两格同线再交换。", ["#547b79", "#f0e7bc"], "#8d9f75", "叶", false),
    '1029': board('coast', [presets.coast[0], presets.bridge[1], presets.coast[2]], "把水纹拼进地下长廊", ["进水口", "隧洞", "出水口"], "接通珠三角输水图", "沿金框依次拼出进水口、隧洞和出水口。双目标时留一枚条纹，等两格同线再交换。", ["#376e8f", "#d4e9dc"], "#67919a", "≈", false),
    '1030': board('print', [presets.pressB[0], presets.pressB[1], presets.pressB[2]], "日内瓦桌上的签字页", ["封面", "条款", "签字页"], "装订协定文本", "纵消穿过「封面」，横消穿过「条款」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '1031': board('craft', [presets.ring[0], presets.step[1], presets.fan[2]], "刀盘在工厂里合圆", ["刀齿", "轮辐", "盘心"], "合拢盾构机刀盘", "沿金框依次拼出刀齿、轮辐和盘心。双目标时留一枚条纹，等两格同线再交换。", ["#547181", "#efddbe"], "#9b8973", "◇", false),
  };
}
