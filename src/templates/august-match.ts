import type {JanuaryBoardTheme, JanuaryMatch} from './january-match';

type Preset = 'fan' | 'wings' | 'vine' | 'step' | 'coast' | 'strings' | 'pressA' | 'pressB' | 'cup' | 'bridge' | 'ring' | 'slope';
export function buildAugustMatches(presets: Record<Preset, JanuaryMatch['tableaux']>): Record<string, JanuaryMatch> {
  function board(theme: JanuaryBoardTheme, tableaux: JanuaryMatch['tableaux'], zone: string, labels: [string, string, string],
    ending: string, rules: string, sky: [string, string], baseColor: string, symbol: string, press: boolean): JanuaryMatch {
    return {theme, tableaux, zone, labels, stages: [...labels, ending], rules, sky, baseColor, symbol,
      moves: 16, marks: ['余十步收尾', '双格同时完成'], action: '拼图', mechanic: press ? 'press' : 'clear',
      ...(press ? {pressLabels: [labels[0], labels[1]] as [string, string]} : {})};
  }
  return {
    '0801': board('coast', [presets.vine[0], presets.coast[1], presets.vine[2]], "把五座公园装进镜头", ["林冠", "镜框", "播出灯"], "放映国家公园片头", "沿金框依次拼出林冠、镜框和播出灯。双目标时留一枚条纹，等两格同线再交换。", ["#547b79", "#f0e7bc"], "#8d9f75", "叶", false),
    '0802': board('print', [presets.fan[0], presets.strings[1], presets.fan[2]], "宋画走进荧屏", ["画卷", "片头", "播映表"], "排好展播片单", "沿金框依次拼出画卷、片头和播映表。双目标时留一枚条纹，等两格同线再交换。", ["#695968", "#efdfbc"], "#ad977e", "印", false),
    '0803': board('print', [presets.pressA[0], presets.pressB[1], presets.pressA[2]], "洞窟里的套色纸样", ["线稿", "壁画", "票边"], "压下莫高窟首日戳", "纵消穿过「线稿」，横消穿过「壁画」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '0804': board('craft', [presets.cup[0], presets.wings[1], presets.cup[2]], "温哥华的入场券", ["票面", "入场线", "看台"], "拼好开幕入场图", "沿金框依次拼出票面、入场线和看台。双目标时留一枚条纹，等两格同线再交换。", ["#458496", "#eee1b3"], "#82a695", "●", false),
    '0805': board('print', [presets.pressB[0], presets.pressA[1], presets.pressB[2]], "石上反字纸上正", ["印床", "朱文", "钤印纸"], "合成一方印蜕", "纵消穿过「印床」，横消穿过「朱文」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '0806': board('aurora', [presets.step[0], presets.ring[1], presets.slope[2]], "第一次按下超链接", ["地址", "链接", "网页"], "连起第一组超链接", "沿金框依次拼出地址、链接和网页。双目标时留一枚条纹，等两格同线再交换。", ["#364d72", "#b7d0d2"], "#6b8590", "◎", false),
    '0807': board('print', [presets.fan[0], presets.step[1], presets.fan[2]], "剪进胶片里的工厂", ["机床", "剪辑线", "放映窗"], "放映工厂片头", "沿金框依次拼出机床、剪辑线和放映窗。双目标时留一枚条纹，等两格同线再交换。", ["#695968", "#efdfbc"], "#ad977e", "印", false),
    '0808': board('craft', [presets.cup[0], presets.fan[1], presets.wings[2]], "方寸之间的起势收势", ["起势", "云手", "收势"], "拼合太极拳票面", "沿金框依次拼出起势、云手和收势。双目标时留一枚条纹，等两格同线再交换。", ["#547181", "#efddbe"], "#9b8973", "◇", false),
    '0809': board('print', [presets.fan[0], presets.strings[1], presets.step[2]], "画框缩进了齿孔", ["色样", "画框", "票边"], "合上当代美术邮册", "沿金框依次拼出色样、画框和票边。双目标时留一枚条纹，等两格同线再交换。", ["#695968", "#efdfbc"], "#ad977e", "印", false),
    '0810': board('print', [presets.bridge[0], presets.slope[1], presets.bridge[2]], "两条天路一页邮册", ["高原弯道", "山口", "票齿"], "拼出两条公路", "沿金框依次拼出高原弯道、山口和票齿。双目标时留一枚条纹，等两格同线再交换。", ["#695968", "#efdfbc"], "#ad977e", "印", false),
    '0811': board('print', [presets.pressA[0], presets.pressB[1], presets.pressB[2]], "上海书桌上的新信笺", ["字盘", "信头", "收件簿"], "装订首册信笺", "纵消穿过「字盘」，横消穿过「信头」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '0812': board('print', [presets.fan[0], presets.bridge[1], presets.step[2]], "把两份文本对齐", ["页码", "签字栏", "封面"], "合上条约文本", "沿金框依次拼出页码、签字栏和封面。双目标时留一枚条纹，等两格同线再交换。", ["#695968", "#efdfbc"], "#ad977e", "印", false),
    '0813': board('music', [presets.strings[0], presets.wings[1], presets.strings[2]], "一尺票幅唱秦腔", ["脸谱", "锣点", "戏台"], "合上秦腔戏票", "沿金框依次拼出脸谱、锣点和戏台。双目标时留一枚条纹，等两格同线再交换。", ["#594264", "#f0d0a9"], "#93786c", "♫", false),
    '0814': board('print', [presets.pressB[0], presets.pressB[1], presets.pressA[2]], "沿书脊找到会场", ["书架", "折页", "书展章"], "盖上上海书展章", "纵消穿过「书架」，横消穿过「折页」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '0816': board('craft', [presets.step[0], presets.fan[1], presets.bridge[2]], "会场里的南亚展柜", ["展签", "展柜", "会徽"], "打开昆明展馆", "沿金框依次拼出展签、展柜和会徽。双目标时留一枚条纹，等两格同线再交换。", ["#547181", "#efddbe"], "#9b8973", "◇", false),
    '0817': board('print', [presets.pressA[0], presets.pressA[1], presets.pressB[2]], "排字盘里的农场", ["字粒", "书脊", "书封"], "印出首版书封", "纵消穿过「字粒」，横消穿过「书脊」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '0818': board('aurora', [presets.ring[0], presets.slope[1], presets.ring[2]], "棱镜里的一道黄线", ["镜筒", "棱镜", "光谱纸"], "标上日光谱线", "沿金框依次拼出镜筒、棱镜和光谱纸。双目标时留一枚条纹，等两格同线再交换。", ["#182d54", "#8498bc"], "#596d8a", "✦", false),
    '0819': board('print', [presets.fan[0], presets.slope[1], presets.fan[2]], "一页医史装进方寸", ["人物线稿", "色版", "齿孔"], "盖上华佗首日戳", "沿金框依次拼出人物线稿、色版和齿孔。双目标时留一枚条纹，等两格同线再交换。", ["#695968", "#efdfbc"], "#ad977e", "印", false),
    '0820': board('coast', [presets.vine[0], presets.wings[1], presets.coast[2]], "四季收进一页分镜", ["春山", "秋水", "直播框"], "剪出山水开场", "沿金框依次拼出春山、秋水和直播框。双目标时留一枚条纹，等两格同线再交换。", ["#547b79", "#f0e7bc"], "#8d9f75", "叶", false),
    '0821': board('coast', [presets.coast[0], presets.ring[1], presets.coast[2]], "群岛之间的第五十颗星", ["群岛", "海图", "星位"], "拼出群岛星图", "沿金框依次拼出群岛、海图和星位。双目标时留一枚条纹，等两格同线再交换。", ["#547b79", "#f0e7bc"], "#8d9f75", "叶", false),
    '0822': board('print', [presets.pressB[0], presets.pressA[1], presets.pressA[2]], "百年前的中文书脊", ["铅字", "书脊", "邮资框"], "印成百年纪念封", "纵消穿过「铅字」，横消穿过「书脊」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '0823': board('coast', [presets.wings[0], presets.vine[1], presets.wings[2]], "放大镜下的翅脉", ["触角", "翅脉", "票框"], "合上昆虫图鉴", "沿金框依次拼出触角、翅脉和票框。双目标时留一枚条纹，等两格同线再交换。", ["#547b79", "#f0e7bc"], "#8d9f75", "叶", false),
    '0824': board('craft', [presets.step[0], presets.bridge[1], presets.step[2]], "把墨斗线印进票面", ["墨斗", "曲尺", "木作"], "印好木工工具图", "沿金框依次拼出墨斗、曲尺和木作。双目标时留一枚条纹，等两格同线再交换。", ["#547181", "#efddbe"], "#9b8973", "◇", false),
    '0825': board('craft', [presets.bridge[0], presets.step[1], presets.fan[2]], "把扶手装在合适的高度", ["坐面", "扶手", "边角"], "拼出适老座椅", "沿金框依次拼出坐面、扶手和边角。双目标时留一枚条纹，等两格同线再交换。", ["#547181", "#efddbe"], "#9b8973", "◇", false),
    '0826': board('coast', [presets.coast[0], presets.vine[1], presets.slope[2]], "沙地里的方格绿洲", ["沙丘", "草方格", "苗圃"], "拼出防风带", "沿金框依次拼出沙丘、草方格和苗圃。双目标时留一枚条纹，等两格同线再交换。", ["#547b79", "#f0e7bc"], "#8d9f75", "叶", false),
    '0827': board('print', [presets.pressA[0], presets.pressA[1], presets.pressA[2]], "一本书装下许多第一", ["数字栏", "索引", "封面"], "印出纪录书书脊", "纵消穿过「数字栏」，横消穿过「索引」。十字特效可以同时完成两项。", ["#695968", "#efdfbc"], "#ad977e", "印", true),
    '0828': board('print', [presets.wings[0], presets.coast[1], presets.fan[2]], "把水波套进动画票框", ["线描", "水波", "套色框"], "印出哪吒动画票", "沿金框依次拼出线描、水波和套色框。双目标时留一枚条纹，等两格同线再交换。", ["#695968", "#efdfbc"], "#ad977e", "印", false),
    '0829': board('aurora', [presets.ring[0], presets.step[1], presets.ring[2]], "统计图中的一格光", ["坐标轴", "数据列", "图例"], "排好网络统计图", "沿金框依次拼出坐标轴、数据列和图例。双目标时留一枚条纹，等两格同线再交换。", ["#364d72", "#b7d0d2"], "#6b8590", "◎", false),
    '0830': board('print', [presets.fan[0], presets.wings[1], presets.strings[2]], "两国图案共用一条齿线", ["左图", "齿线", "右图"], "拼合建交纪念票", "沿金框依次拼出左图、齿线和右图。双目标时留一枚条纹，等两格同线再交换。", ["#695968", "#efdfbc"], "#ad977e", "印", false),
    '0831': board('aurora', [presets.ring[0], presets.wings[1], presets.slope[2]], "给未来的月船留一格名字", ["征名页", "信封", "投递栏"], "投递月船命名卡", "沿金框依次拼出征名页、信封和投递栏。双目标时留一枚条纹，等两格同线再交换。", ["#182d54", "#8498bc"], "#596d8a", "✦", false),
  };
}
