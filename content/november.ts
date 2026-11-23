import type {DayMeta} from './types';
import type {AlmanacSpec} from './levels/types';
// 事实来源与日期见 tasks/cards/1122-november.md。路线、场景布局、道具及剧情互动为虚构。
export const novemberLevels: AlmanacSpec[] = [
  {id:'1101-1512', template:'almanac', title:'穹顶上的最后一束光', fact:'西斯廷礼拜堂的天顶画向公众展出。', theme:'chapel', activity:'align', stops:['天窗','拱券','壁龛'], souvenir:'金箔色样', finale:'穹顶亮起'},
  {id:'1102-2000', template:'almanac', title:'第一盏舱灯', fact:'远征一号乘组抵达国际空间站。', theme:'station', activity:'dock', stops:['太阳翼','气闸','生活舱'], souvenir:'对接徽章', finale:'全站通电'},
  {id:'1103-1957', template:'almanac', title:'留给莱卡的星光', fact:'斯普特尼克二号载着莱卡进入轨道。', theme:'probe', activity:'observe', stops:['地面站','接收器','星图台'], souvenir:'星图底片', finale:'记录轨迹'},
  {id:'1104-1922', template:'almanac', title:'石阶尽头的门', fact:'卡特一行在帝王谷发现图坦卡蒙墓入口。', theme:'tomb', activity:'align', stops:['石阶','砂岩廊','封门'], souvenir:'砂岩拓印', finale:'照亮入口'},
  {id:'1105-2007', template:'almanac', title:'月背的银弧', fact:'嫦娥一号进入环月轨道。', theme:'moon', activity:'dock', stops:['近月点','月缘','轨道窗'], souvenir:'月面影印', finale:'合拢月轨'},
  {id:'1106-1217', template:'almanac', title:'林间的蜡印', fact:'英格兰在伦敦为《森林宪章》加盖印章。', theme:'forest', activity:'align', stops:['林径','木桥','印台'], souvenir:'橡叶蜡印', finale:'落下印章'},
  {id:'1107-1867', template:'almanac', title:'一间未来的实验室', fact:'玛丽·居里出生。', theme:'lab', activity:'align', stops:['试剂架','天平','实验桌'], souvenir:'天平游码', finale:'显现谱线'},
  {id:'1108-1895', template:'almanac', title:'暗室里的光', fact:'伦琴发现 X 射线。', theme:'lab', activity:'observe', stops:['遮光罩','荧光屏','底片架'], souvenir:'显影底片', finale:'底片显影'},
  {id:'1109-2005', template:'almanac', title:'驶向晨星', fact:'欧洲空间局的金星快车发射升空。', theme:'venus', activity:'dock', stops:['发射架','转移窗','金色云顶'], souvenir:'晨星航图', finale:'展开太阳翼'},
  {id:'1110-1969', template:'almanac', title:'街角开播了', fact:'《芝麻街》在美国首播。', theme:'street', activity:'beat', stops:['门廊','窗台','演播灯'], souvenir:'开播场记板', finale:'亮起播出灯'},
  {id:'1111-1572', template:'almanac', title:'星图上多了一点', fact:'第谷·布拉赫观测到一颗超新星。', theme:'observatory', activity:'observe', stops:['象限仪','观星台','星图桌'], souvenir:'银色星针', finale:'标记新星'},
  {id:'1113-1907', template:'almanac', title:'离地三十厘米', fact:'科尔尼在法国进行双旋翼直升机试飞。', theme:'rotor', activity:'hover', stops:['皮带架','油罐','旋翼帆布'], souvenir:'旋翼草图', finale:'旋翼起飞'},
  {id:'1114-1969', template:'almanac', title:'云层之上的 AUX', fact:'阿波罗 12 号发射后两次遭遇雷击，切换 SCE 开关后仪表数据恢复。', theme:'rocket', activity:'aux', stops:['一级舱','配电舱','指令舱'], souvenir:'控制台拨片', finale:'SCE 转至 AUX'},
  {id:'1115-1971', template:'almanac', title:'四位数的金色城市', fact:'英特尔推出 4004 微处理器。', theme:'chip', activity:'logic', stops:['输入端','逻辑门','寄存器'], souvenir:'陶瓷芯片', finale:'点亮四位寄存器'},
  {id:'1117-1970', template:'almanac', title:'隔着月光开车', fact:'月球 17 号把月球车 1 号送上月球。', theme:'rover', activity:'drive', stops:['坡道','陨坑','采样台'], souvenir:'月面全景片', finale:'拍摄月面全景'},
  {id:'1118-1928', template:'almanac', title:'汽笛和第一拍', fact:'有声动画短片《汽船威利》上映。', theme:'steamer', activity:'beat', stops:['桨轮','汽笛','放映窗'], souvenir:'音画同步片', finale:'声画合拍'},
  {id:'1119-1969', template:'almanac', title:'第一千球', fact:'贝利打入其个人第 1000 个进球。', theme:'stadium', activity:'kick', stops:['近门柱','远门柱','球门中央'], souvenir:'纪念球票', finale:'点亮记分牌'},
  {id:'1120-1998', template:'almanac', title:'曙光的第一翼', fact:'国际空间站的曙光号功能货舱发射升空。', theme:'station', activity:'dock', stops:['折叠翼','舱段','信号窗'], souvenir:'舱段铭牌', finale:'唤醒曙光号'},
  {id:'1121-1783', template:'almanac', title:'风越过巴黎屋顶', fact:'巴黎举行了载人的无系绳热气球飞行。', theme:'balloon', activity:'hover', stops:['炉口','吊篮','屋脊风标'], souvenir:'织锦布片', finale:'热气球升空'},
  {id:'1122-1869', template:'almanac', title:'潮水托起卡蒂萨克', fact:'卡蒂萨克号在苏格兰邓巴顿下水。', theme:'clipper', activity:'tide', stops:['船台','缆桩','下水滑道'], souvenir:'黄铜船名牌', finale:'放船入水'},
  {id:'1123-1963', template:'almanac', title:'蓝色演播夜', fact:'英国广播公司播出《神秘博士》第一集。', theme:'studio', activity:'beat', stops:['摄像机','场记板','发射塔'], souvenir:'试播带', finale:'送出首播信号'},
  {id:'1124-1859', template:'almanac', title:'让这一页见光', fact:'达尔文的《物种起源》出版。', theme:'press', activity:'align', stops:['字盘','墨辊','校样台'], souvenir:'初版书签', finale:'印出扉页'},
  {id:'1125-1915', template:'almanac', title:'星光弯过网格', fact:'爱因斯坦向普鲁士科学院报告广义相对论场方程。', theme:'observatory', activity:'align', stops:['标尺','曲面网','观测屏'], souvenir:'曲线描图', finale:'汇合光束'},
  {id:'1126-2011', template:'almanac', title:'红沙的来信', fact:'搭载好奇号火星车的火星科学实验室发射升空。', theme:'mars', activity:'drive', stops:['发射台','沙丘','遥测台'], souvenir:'红沙试车章', finale:'接通遥测'},
  {id:'1127-1895', template:'almanac', title:'烛光下的签名', fact:'阿尔弗雷德·诺贝尔在巴黎签署遗嘱，为设立诺贝尔奖留下资金。', theme:'library', activity:'align', stops:['长桌','笔架','落款处'], souvenir:'封缄压印', finale:'封好手稿'},
  {id:'1128-1964', template:'almanac', title:'水手驶向火星', fact:'水手四号探测器启程飞向火星。', theme:'probe', activity:'dock', stops:['展开翼','导航星','火星窗'], souvenir:'航行邮戳', finale:'穿越转移窗'},
  {id:'1129-1972', template:'almanac', title:'荧屏上的来回球', fact:'雅达利推出电子游戏《Pong》。', theme:'arcade', activity:'pong', stops:['发球台','反弹区','终局线'], souvenir:'像素代币', finale:'点亮街机'},
  {id:'1130-1872', template:'almanac', title:'格拉斯哥的开球', fact:'苏格兰与英格兰在格拉斯哥举行国际足球比赛。', theme:'stadium', activity:'kick', stops:['边线','禁区角','球门线'], souvenir:'条纹围巾', finale:'终场致意'},
];
export const novemberDays: DayMeta[] = novemberLevels.map(s=>{
  const [day, year]=s.id.split('-');
  return {day,theme:s.title,chapters:[{id:s.id,day,year:Number(year),event:s.fact.replace(/。$/,''),quest:s.title,
    steps:[...s.stops,s.finale],souvenir:s.souvenir,template:s.template,era:s.theme,tone:day==='1103'?'solemn':'bright',
    status:'web',palette:['#206a75','#f6bc68']}]};
});
