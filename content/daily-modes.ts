/** 历史事实附各自来源；人物委托、设备操作和场景是游戏演绎。 */
export const modeKinds = ['match','shot','trial'] as const;
export type ModeKind = typeof modeKinds[number];
export const modeNames:Record<ModeKind,string> = {match:'史莱姆三消',shot:'分身射击',trial:'NPC 试炼'};

interface ModeStory {
 storyId:string; year:number; fact:string; source:string; souvenir:string;
 title:string; goal:string; choice:string; layout:string; memory:string;
}
export interface DailyMode extends ModeStory {
 id:string; day:string; kind:ModeKind; playPath:string; saveId:string; chapterId:string|null;
}
function challenge(day:string,kind:ModeKind,story:ModeStory,existingChapter?:string):DailyMode {
 const id=day+'-'+kind;
 return {...story,day,kind,id,playPath:'level.html?id='+id,chapterId:existingChapter??null,
   saveId:existingChapter?id:id+'-'+story.storyId};
}

export const dailyModes = [
 challenge('1123','match',{
   storyId:'doctor-who',year:1963,fact:'1963 年 11 月 23 日，英国广播公司播出《神秘博士》第一集。',
   source:'https://www.doctorwho.tv/stories/an-unearthly-child',souvenir:'首播场记板',title:'雪花里的第一帧',
   goal:'让三段黑白画面接入对应的监视器',choice:'决定先接通哪侧信号，保留横纹凝露，等到中间接点开启再触发横扫',
   layout:'断带演播盘',memory:'你接通最后一段信号。三台电视里，雪花变成了首播片名。'
 },'1123-1963'),
 challenge('1123','shot',{
   storyId:'tiros-2',year:1960,fact:'1960 年 11 月 23 日，气象卫星 TIROS-2 发射。',
   source:'https://science.nasa.gov/mission/tiros/',souvenir:'拼合的卫星云图',title:'从轨道看云',
   goal:'捕捉三片云区的观测数据，显出一幅气象云图',choice:'把分身留在遥测板供电，或登上侧翼高台寻找视线',
   layout:'遥测站与高架观测台',memory:'你把三片观测区拼在同一张气象图上，看到了卫星视角下的云。'
 }),
 challenge('1123','trial',{
   storyId:'life-weekly',year:1936,fact:'美国摄影周刊《生活》的创刊号刊期是 1936 年 11 月 23 日，封面照片拍的是佩克堡水坝。',
   source:'https://time.com/archive/6790431/the-press-the-span-of-life/',souvenir:'水坝封面校样',title:'把水坝印上封面',
   goal:'替图片编辑完成创刊号的封面校样',choice:'上高架取景，或从检修道钻入，用连击松开印刷机滚轴',
   layout:'高处取景台与低处印刷道',memory:'你压下印机，佩克堡水坝的照片出现在《生活》创刊号封面上。'
 }),
 challenge('0101','match',{
   storyId:'euro-cash',year:2002,fact:'2002 年 1 月 1 日，欧元纸币和硬币在欧元区十二个国家投入流通。',
   source:'https://www.ecb.europa.eu/press/pr/date/2002/html/pr020102.en.html',souvenir:'首日零钱盘',title:'新年的第一盘欧元',
   goal:'把三枚硬币送进各自的零钱槽',choice:'横移硬币对准槽口，再消去下方承托的凝露',
   layout:'有三个出币槽的零钱柜台',memory:'你接住最后一枚欧元，把满盘新币推到了柜台前。'
 }),
 challenge('0101','shot',{
   storyId:'ceres',year:1801,fact:'1801 年 1 月 1 日，天文学家朱塞佩·皮亚齐在巴勒莫发现了谷神星。',
   source:'https://www.jpl.nasa.gov/news/ceres-keeping-well-guarded-secrets-for-215-years/',souvenir:'谷神星观测星图',title:'星图上多了一点',
   goal:'在三个观测位置用分身标记移动光点，描出星图',choice:'移到正确的观测圈，等光点越过遮挡再投射',
   layout:'三座观测位与可遮挡视线的仪器',memory:'你把三次观测落在同一张星图上，那个移动的光点有了名字：谷神星。'
 }),
 challenge('0101','trial',{
   storyId:'qi-baishi',year:1864,fact:'1864 年 1 月 1 日，画家、篆刻家齐白石出生。',
   source:'https://www.capitalmuseum.org.cn/exhibition/604e72abc3d3455da15369e587c3d7e6',souvenir:'落了朱印的画签',title:'印坊借印',
   goal:'在印坊、水院和晾纸阁取印，最后亲手落款',choice:'自己决定三处取印顺序',
   layout:'多桥印坊水院',memory:'三处取得的印汇在纸角，这张画签有了你的落款。'
 },'0101-1864'),
 challenge('0815','match',{
   storyId:'panama-canal',year:1914,fact:'1914 年 8 月 15 日，巴拿马运河正式开通，安康号轮船从大西洋一侧驶向太平洋。',
   source:'https://pancanal.com/en/history-in-pictures-107-years-of-the-panama-canal/',souvenir:'安康号通航票',title:'让安康号过闸',
   goal:'逐段清除闸口水标，让安康号通过船闸',choice:'在有限步数内选择先疏通哪个闸口',
   layout:'逐段展开的船闸棋盘',memory:'最后一道闸门打开，安康号沿你疏通的水道驶了出去。'
 }),
 challenge('0815','shot',{
   storyId:'wow-signal',year:1977,fact:'1977 年 8 月 15 日，俄亥俄州立大学的射电观测记录到后来被称为“Wow!”的信号。',
   source:'https://www.bigear.org/Gray-Marvel.pdf',souvenir:'射电信号记录纸',title:'把信号留在纸上',
   goal:'让两个接收点同时接通，到记录台拉出信号纸带',choice:'在两座馈源都收到分身后保持连接，决定何时收回',
   layout:'分置馈源、巡检通道与记录台',memory:'你留住两处连接，打印机在纸带上留下了一段突出的信号。'
 }),
 challenge('0815','trial',{
   storyId:'nanjing-memorial',year:1985,fact:'1985 年 8 月 15 日，侵华日军南京大屠杀遇难同胞纪念馆建成开放。',
   source:'https://www.19371213.com.cn/about/history/',souvenir:'庭院中的一束白花',title:'沿灯献花',
   goal:'跟随讲解员，在会合处献花',choice:'走缓坡护灯，或登高点亮远灯',
   layout:'庭院双径会合',memory:'两条路在庭院会合，你在灯前留下一束白花。'
 },'0815-1985')
];
export const modesFor=(day:string)=>dailyModes.filter(spec=>spec.day===day);
export const modeById=(id:string)=>dailyModes.find(spec=>spec.id===id);
export const progressId=(id:string)=>modeById(id)?.saveId??id;

// Former pilot souvenirs still belong to their original historical event.
const pastNotes:Record<string,string>={
 '1123-shot':'你扫清布景间的干扰，把首播信号送进了电视。',
 '1123-trial':'场记板合上，你推下导播台的推杆。红灯亮起，节目开播。',
 '0101-match':'你为三枚印腾出了位置，在画纸上留下朱红落款。',
 '0101-shot':'水巷重新安静下来，你把一枚朱印按在画签上。',
 '0815-match':'最后一瓣舒展开来，你把白花聚成了一束。',
 '0815-shot':'你把光从一岸送到另一岸，庭院留下两盏安静的灯。'
};
export function collectedMemories(keys:readonly string[]){
 const groups=new Map<string,DailyMode[]>();
 function add(entry:DailyMode){
   const list=groups.get(entry.storyId)??[];
   list.push(entry);groups.set(entry.storyId,list);
 }
 for(const mode of dailyModes){
   if(keys.includes(mode.saveId))add(mode);
   if(mode.saveId===mode.id||!keys.includes(mode.id))continue;
   const previous=dailyModes.find(item=>item.day===mode.day&&item.chapterId);
   if(previous&&pastNotes[mode.id])add({...previous,id:mode.id,kind:mode.kind,memory:pastNotes[mode.id]});
 }
 return [...groups.values()];
}
export function imprintShapes(order:number|undefined){
 const marks=['方','圆','长'];
 const digits=String(order??'').split('');
 return digits.length===3&&[...digits].sort().join('')==='123'
   ?digits.map(d=>marks[Number(d)-1]):[];
}
