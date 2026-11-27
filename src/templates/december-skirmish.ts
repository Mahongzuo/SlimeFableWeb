import type {SkirmishSpec} from './january-skirmish';
import type {Vec} from '../slime/types';
import {RelayCourse,type Exhibit} from './season-skirmish';

// 微缩展场、时间窗和分身接应流程均为游戏演绎。
export const decemberRelayMaps:Record<string,Exhibit>={
 '1202':{kind:'crossing',name:'陪最后一位行人过街',lesson:'从缘石坡道向黄灯投一团分身，唤醒路口。',middle:'左侧按钮亮起绿灯。留分身压住它，等三位行人通过斑马线，再去对面报平安。',end:'最后一位行人走上了人行道',pads:['路口铃','行人按钮','对岸感应灯','平安回执'],sky:['#699bb3','#f3d5ac'],stone:'#7f8580',trim:'#ffce6f'},
 '1203':{kind:'speedtrap',name:'记录同一趟车',lesson:'先向纸带起点投一团分身，打开两道测速门。',middle:'看车头从左向右掠过。第一道门亮时在西段投分身，随车跑到东段，在第二道门亮起时再投。',end:'两道时线印上了同一张测速纸带',pads:['校时器','西段光门','东段光门','记录笔'],sky:['#729fb7','#e7daba'],stone:'#a5ada2',trim:'#e8b64d'},
 '1204':{kind:'beads',name:'三加二的两声珠响',lesson:'先试投到记数签，三颗下珠会靠梁。',middle:'在第四颗下珠旁投分身，三变四。再加一要换五：收回分身让四颗退开，转到上珠一侧，把抵五的珠拨向横梁。',end:'上珠靠梁，三加二正好是五',pads:['记数签','第四颗下珠','抵五上珠','记账印'],sky:['#887660','#f1d6aa'],stone:'#a98156',trim:'#eeb575'},
 '1205':{kind:'twins',name:'让两副星翼分开',lesson:'从晨光里的发令盘投分身，打开两侧接应架。',middle:'任选一侧投向对面的星托，收回后把分身送到另一颗星上。第二副星翼挡住低处视线，要跳起来再投。',end:'两副太阳翼朝不同方向展开',pads:['发令盘','天雁接应托','星池接应托','晨光接收灯'],sky:['#414965','#f4be8b'],stone:'#a68f72',trim:'#83d5dc'},
 '1206':{kind:'town',name:'沿海湾送出第一束光',lesson:'在展馆门前把分身投进岸灯。',middle:'选择渔港或民居先收灯讯。沿地上的亮点亲自把光带过海湾，再投分身给另一岸。',end:'灯从海湾展馆一直亮进了家窗',pads:['岸灯','渔港收讯窗','民居收讯窗','海湾总灯'],sky:['#558798','#e8d3ac'],stone:'#929e91',trim:'#e7c26e'}
};

export class DecemberReception extends RelayCourse{
  crossing=0;
  pass=-1;
  swept=false;
  nextLamp=0;
  launches=0;
  constructor(day:string,seed:string){
    super(day,seed,decemberRelayMaps[day]);
    if(this.spec.kind==='speedtrap'){this.pads[1]=[-3.2,.04,.8];this.pads[2]=[3.3,.04,-2];}
    if(this.spec.kind==='town'){this.pads[1]=[-3.3,.04,.25];this.pads[2]=[3.15,.04,-1.32];}
  }
  get trainTime(){return this.elapsed+this.phaseOffset;}
  get trainX(){
    const t=this.trainTime%12;
    // The little train spends its readable four seconds between instruments.
    // Clear the visible viaduct at both ends before the following pass enters.
    if(t<2)return -24+8*t;
    if(t>10)return 8+12*(t-10);
    return -8+2*(t-2);
  }
  get trip(){return Math.floor(this.trainTime/12);}
  windowAt(i:number){return Math.abs(this.trainX-(i===1?-3.7:4.1))<1.65;}
  get lamp():Vec{
    const side=this.order===1?-1:1;
    return this.nextLamp===0?[side*1.52,.06,.7]:this.nextLamp===1?[0,.06,-1.52]:[-side*1.98,.06,-1.02];
  }
  override available(i:number){
    if((this.spec.kind==='twins'||this.spec.kind==='town')&&(i===1||i===2))return this.done.has(0)&&!this.done.has(i);
    return super.available(i);
  }
  override cast(i:number,p:Vec){
    if(!this.available(i)||this.pending||this.returning)return false;
    const kind=this.spec.kind;
    if(i===1&&kind==='crossing'&&p[0]>-.65)return this.reject('沿左边缘石坡道靠近过街按钮。');
    if(i===2&&kind==='crossing'&&(!this.westHeld||this.crossing<1||p[0]<1.15))
      return this.reject('让分身保持绿灯，等最后一位行人上岸，再从对岸接应。');
    if((i===1||i===2)&&kind==='speedtrap'){
      if((i===1?p[0]>-.8:p[0]<.8)||!this.windowAt(i))return this.reject('站到对应站台，等车头经过亮起的光门再投。');
      if(i===2&&this.trip!==this.pass)return this.reject('两处要记同一趟车，从西段重新计时。');
    }
    if(i===2&&kind==='beads'&&(!this.swept||p[0]<.8))return this.reject('先收回下珠分身，再去上珠一边拨五。');
    if((i===1||i===2)&&kind==='twins'){
      if(i===1?p[0]<.85:p[0]>-.85)return this.reject('从另一侧星托向它投射，让两副星翼错开。');
      if(this.order&&!this.swept)return this.reject('收回第一枚分身，腾出星翼之间的通道。');
      if(this.order&&p[1]<.18)return this.reject('第二道展开翼缘挡住了视线，跳起再投。');
    }
    if((i===1||i===2)&&kind==='town'&&this.order&&this.nextLamp<3)return this.reject('跟着发光的路标，让灯讯先走到对岸窗边。');
    const ok=super.cast(i,p);
    if(ok)this.launches++;
    if(ok&&kind==='speedtrap'&&i===1)this.pass=this.trip;
    return ok;
  }
  override update(dt:number,p:Vec,shots:readonly {phase:string;center:Vec}[]){
    const landed=super.update(dt,p,shots);
    if(this.order&&!shots.length&&!this.pending&&(this.spec.kind==='twins'||this.spec.kind==='beads'))this.swept=true;
    if(this.spec.kind==='crossing'&&this.westHeld&&!this.done.has(2)){
      const t=this.pads[1],held=shots.some(s=>s.phase==='active'&&Math.hypot(s.center[0]-t[0],s.center[2]-t[2])<.79);
      if(held)this.crossing=Math.min(1,this.crossing+dt*.40);
      else{this.done.delete(1);this.westHeld=false;this.hint='行人已在安全处等候，重新留守绿灯即可继续。';}
    }
    if(this.spec.kind==='speedtrap'&&this.done.has(1)&&!this.done.has(2)&&this.pending?.i!==2&&this.trip>this.pass){
      this.done.delete(1);this.retries++;this.hint='这趟车已经过去，下一趟会重新经过西门。';
    }
    if(this.spec.kind==='town'&&this.order&&this.nextLamp<3){
      const l=this.lamp;
      if(Math.hypot(p[0]-l[0],p[2]-l[2])<.81)this.nextLamp++;
    }
    return landed;
  }
  override recall(){
    if(this.spec.kind==='crossing'&&this.westHeld&&!this.done.has(2))this.done.delete(1);
    if(this.order&&(this.spec.kind==='beads'||this.spec.kind==='twins'))this.swept=true;
    super.recall();
  }
  override retry(){
    if(this.spec.kind==='crossing'&&this.westHeld&&!this.done.has(2))this.done.delete(1);
    if(this.spec.kind==='speedtrap'&&!this.done.has(2)){this.done.delete(1);this.pass=-1;}
    super.retry();
  }
  override get instruction(){
    if(this.spec.kind==='crossing'&&this.westHeld&&!this.done.has(2))return this.crossing<1?'绿灯亮着，三位行人正在过街。留住分身，走向对岸。':'三人都到岸了，从右边接应灯投出下一团。';
    if(this.spec.kind==='town'&&this.order&&!this.done.has(this.order===1?2:1))return this.nextLamp<3?'走到亮着的岸灯，把灯讯引过弯。　'+this.nextLamp+' / 3':'灯讯到岸，可以投向另一扇窗口了。';
    return super.instruction;
  }
}

export const decemberSkirmishSpecs: Readonly<Record<string, SkirmishSpec>> = {
  '1201': {"style":"court","bonus":"cross","routes":["左粉笔行情板","右电脑撮合台"],"names":["红岭试业标","电子托管标","电脑撮合标","特区腾飞灯"],"prompt":"走进大厅金环点亮深交所试营业灯","finale":"深圳证券交易所集中试营业启航","tactic":"跨半场斜射享加力，快捷点亮无纸化撮合核心节点","banner":["SHENZHEN SZSE • 1990","ELECTRONIC FIRST"],"sky":["#326996","#f5dca8"],"floor":"#7d9299","accent":"#e67842"},
  '1202': {"style":"court","bonus":"cross","routes":["左礼让斑马道","右非机动绿廊"],"names":["斑马礼让标","安全带扣标","头盔守护标","平安绿灯台"],"prompt":"走进路口金环点亮平安文明交通灯","finale":"全国交通安全日礼让成风","tactic":"跨半场斜射享加力，流畅点亮四向文明交通标","banner":["SAFETY DAY • 122","SAFE JOURNEY HOME"],"sky":["#3876a8","#f5e8cc"],"floor":"#698578","accent":"#48b878"},
  '1203': {"style":"sport","bonus":"cross","routes":["左气动低阻道","右受电弓高台"],"names":["火箭车头标","受电弓稳流标","转向架静稳标","486.1 纪录灯"],"prompt":"冲过测速金环刷新世界铁路试验纪录","finale":"CRH380A 跑出 486.1 公里世界纪录","tactic":"跨半场斜射享加力，畅快点亮四处高速试验关键标","banner":["CRH380A • 2010","486.1 KM/H RECORD"],"sky":["#2e6ea8","#f5e8ce"],"floor":"#658fa3","accent":"#3d98e0"},
  '1204': {"style":"workshop","bonus":"pin","routes":["左上珠挡位","右下珠连拨"],"names":["定位横梁标","上珠以五标","下珠进十标","珠算非遗灯"],"prompt":"走进横梁金环拨响清脆清盘尾音","finale":"中国珠算荣登人类非遗名录","tactic":"青环留守稳住进位档位，灵巧加速四档算珠合拍点亮","banner":["CHINESE ABACUS • 2013","UNESCO HERITAGE"],"sky":["#594336","#f2d9b1"],"floor":"#9c7d5c","accent":"#d9783e"},
  '1205': {"style":"space","bonus":"high","routes":["左气象微星道","右遥感星池台"],"names":["晨曦点火标","天雁气象标","星池遥感标","双星入轨灯"],"prompt":"走进测控金环迎接冬晨双星报捷","finale":"谷神星一号遥九冬晨圆满入轨","tactic":"登上高台射击享加力，低道便于快速回收分身","banner":["CERES-1 Y9 • 2023","DAWN DUAL ORBIT"],"sky":["#263e63","#f5c282"],"floor":"#7d786b","accent":"#62c9e8"},
  '1206': {"style":"workshop","bonus":"pin","routes":["左网球燃料球道","右氦气冷却廊"],"names":["陶瓷燃料标","氦气循环标","固有安全标","四代商运灯"],"prompt":"走进主控金环点亮全球首座四代核电屏","finale":"石岛湾高温气冷堆正式商运领跑全球","tactic":"青环留守稳控氦气循环节拍，高效点亮四代核电突破标","banner":["SHIDAOWAN • 2023","WORLD FIRST GEN-IV"],"sky":["#245478","#d8f0ec"],"floor":"#5e7d8a","accent":"#62e0b8"},
  '1207': {"style":"maritime","bonus":"high","routes":["左远洋航运道","右星地 VDES 廊"],"names":["快舟十一标","船舶识别标","双向电文标","远洋护航灯"],"prompt":"走进海事金环连通远洋星地安全网","finale":"行云交通 VDES 试验星入轨护航","tactic":"登上高廊射击享加力，低道便于快速回收分身","banner":["KUAIZHOU-11 • 2022","OCEAN SATCOM LINK"],"sky":["#1c4269","#a6d8eb"],"floor":"#517891","accent":"#62e0d8"},
  '1208': {"style":"facade","bonus":"pin","routes":["左直流融冰线","右智慧调度廊"],"names":["直流融冰标","换流阀厅标","抽蓄稳峰标","暖冬满电灯"],"prompt":"走进调度大厅金环点亮迎峰度冬绿电图","finale":"特高压绿电跨越寒潮温暖万家","tactic":"青环留守稳控融冰电流，高效守护寒潮中的千里电网","banner":["WINTER GRID • UHV","GREEN POWER WARMTH"],"sky":["#264e78","#e6f0f7"],"floor":"#7c92a3","accent":"#f2b84b"},
  '1209': {"style":"maritime","bonus":"high","routes":["左热发射导流槽","右十四星整流罩"],"names":["海船热发标","大罩分离标","十四星释标","首飞全胜灯"],"prompt":"走进海射指挥金环确认十四星全入轨","finale":"捷龙三号海上热发射首飞告捷","tactic":"登上高台射击享加力，低道便于快速回收分身","banner":["SMART DRAGON-3 • 2022","14 SATS SEA LAUNCH"],"sky":["#1f4e78","#f5c278"],"floor":"#588299","accent":"#f29446"},
  '1210': {"style":"space","bonus":"cross","routes":["左东方红一号碑","右四百次火箭林"],"names":["百发启程标","两百跨越标","三百提速标","四百丰碑灯"],"prompt":"走进功勋塔金环点亮长征 400 次金碑","finale":"长征运载火箭迈过第 400 次发射里程碑","tactic":"跨半场斜射享加力，畅快点亮四座跨越半世纪的航天丰碑","banner":["LONG MARCH • 400TH","SPACE MILESTONE"],"sky":["#14284a","#f2b863"],"floor":"#58697d","accent":"#f2a44c"},
  '1211': {"style":"maritime","bonus":"high","routes":["左北锚碇巨石","右千米悬索主缆"],"names":["巨型沉井标","千米主缆标","公铁双层标","高铁过江灯"],"prompt":"走进桥塔金环放行首班过江高铁","finale":"世界首座高铁悬索桥全线贯通","tactic":"登上主缆高台射击享加力，低道便于快速回收分身","banner":["WUFENGSHAN • 2020","WORLD 1ST HSR SUSPENSION"],"sky":["#326ea3","#f2e6cf"],"floor":"#6d8e9e","accent":"#d97842"},
  '1212': {"style":"space","bonus":"high","routes":["左快速恢复坪","右垂直转运道"],"names":["三平转运标","一键加注标","快响点火标","低轨入网灯"],"prompt":"走进商发金环刷新发射场快响纪录","finale":"商业航天高频快响流程全线跑通","tactic":"登上高台射击享加力，低道便于快速回收分身","banner":["HAINAN RAPID • LEO","HIGH-CADENCE LAUNCH"],"sky":["#1c3a63","#f2bd78"],"floor":"#587082","accent":"#6be0f0"},
  '1213': {"style":"facade","bonus":"high","routes":["左金色沙丘道","右星夜服务区"],"names":["防沙草栅标","胡杨绿洲标","光伏驿站标","天山贯通灯"],"prompt":"走进胡杨金环点亮万里京新高速灯","finale":"世界最长沙漠高速贯通大漠丝路","tactic":"登上高台射击享加力，低道便于快速回收分身","banner":["G7 HIGHWAY • DESERT","SILK ROAD EXPRESS"],"sky":["#386694","#f5cf96"],"floor":"#bfa06b","accent":"#e0883b"},
  '1214': {"style":"space","bonus":"pin","routes":["左空间科学舱","右隔热复用翼"],"names":["三度启航标","长期在轨标","空间实验标","复用校验灯"],"prompt":"走进测控金环确认第三次试验圆满入轨","finale":"中国可重复使用航天器三赴星海","tactic":"青环留守同步在轨试验参数，高效点亮四处复飞测标","banner":["REUSABLE • FLIGHT 3","2023 ORBIT TEST"],"sky":["#142442","#6fa8d9"],"floor":"#4f657a","accent":"#75e3f0"},
  '1215': {"style":"space","bonus":"high","routes":["左十八米加长罩","右胖五助推廊"],"names":["加长整流标","十机点火标","高轨滑行标","精准入轨灯"],"prompt":"走进文昌测控金环确认长五遥六告捷","finale":"长征五号加长新构型首秀全胜","tactic":"登上高廊射击享加力，低道便于快速回收分身","banner":["LM-5 Y6 • 2023","EXTENDED FAIRING"],"sky":["#122240","#f0a256"],"floor":"#58697d","accent":"#f5b852"},
  '1216': {"style":"space","bonus":"pin","routes":["左五米超大整流罩","右远征二号摆渡车"],"names":["大力士起飞标","远征二号标","多星展开标","首组入网灯"],"prompt":"走进测控金环激活低轨 01 组卫星群","finale":"卫星互联网低轨 01 组圆满入轨","tactic":"青环留守稳控远征二号多次点火，精准释放低轨星群","banner":["SATNET 01 • 2024","LM-5B + YZ-2"],"sky":["#122445","#68b8e0"],"floor":"#4c657d","accent":"#6be3f5"},
  '1217': {"style":"maritime","bonus":"high","routes":["左优化舰岛台","右宽阔飞行甲板"],"names":["自主舰岛标","飞行甲板标","舷号十七标","蓝海和平灯"],"prompt":"走进舰桥金环鸣响入列启航汽笛","finale":"首艘国产航母山东舰正式入列","tactic":"登上舰岛高台射击享加力，低道便于快速回收分身","banner":["CV-17 SHANDONG • 2019","HOMEGROWN GIANT"],"sky":["#245c8a","#f2e4c4"],"floor":"#658091","accent":"#3d94d4"},
  '1218': {"style":"court","bonus":"cross","routes":["左稻穗天眼展廊","右敦煌青蒿星台"],"names":["杂交稻穗标","天眼巨碗标","莫高飞天标","先锋礼赞灯"],"prompt":"走进大厅金环点亮百位先锋致敬屏","finale":"改革先锋精神照耀新征程","tactic":"跨半场斜射享加力，畅快点亮四座榜样精神灯标","banner":["40 YEARS REFORM • 2018","100 PIONEERS"],"sky":["#385885","#f7dfb3"],"floor":"#8c7e6b","accent":"#e08b3e"},
  '1219': {"style":"space","bonus":"pin","routes":["左毫秒脉冲星道","右纳赫兹引力波廊"],"names":["毫秒脉冲标","星团奇星标","纳赫兹波标","八百星库灯"],"prompt":"走进总控金环点亮八百新脉冲星星图","finale":"中国天眼深空发现持续领跑全球","tactic":"青环留守锁紧脉冲计时阵，精准捕捉深空微弱引力波鼓点","banner":["FAST CHINA • 800+","PULSAR LEADER"],"sky":["#122240","#5eb8c9"],"floor":"#486878","accent":"#6be8d8"},
  '1220': {"style":"workshop","bonus":"pin","routes":["左氮气手套箱","右电子天平称重台"],"names":["真空启封标","纯氮手套标","精准称重标","共享科研灯"],"prompt":"走进超洁净室金环启封珍贵月壤样本","finale":"嫦娥五号月壤正式开启全球科学研究","tactic":"青环留守稳控纯氮手套箱，精准完成月壤启封与称重","banner":["LUNAR LAB • 2020","1731G UNSEALED"],"sky":["#243a59","#e3edf5"],"floor":"#728496","accent":"#75d8f0"},
  '1221': {"style":"court","bonus":"cross","routes":["左四丈高表道","右三十米量天尺"],"names":["高表立影标","景符针孔标","量天石尺标","授时历成灯"],"prompt":"走进量天尺金环定格冬至最长日影","finale":"东方古观象台精准测出回归年","tactic":"跨半场斜射享加力，循正午阳光精准点亮量天尺刻度","banner":["WINTER SOLSTICE • GNOMON","365.2425 DAYS"],"sky":["#385c85","#f5dca8"],"floor":"#9c8c75","accent":"#e69b42"},
  '1222': {"style":"workshop","bonus":"pin","routes":["左向量流水线","右石油气象算廊"],"names":["向量主机标","并行流水标","气象算力标","亿次鉴定灯"],"prompt":"走进长沙机房金环点亮亿次巨型机灯","finale":"中国首台亿次巨型机“银河-Ⅰ”通过鉴定","tactic":"青环留守稳控并行向量流水线，畅快点亮四处算力标","banner":["YINHE-I • 1983","100M OPS SUPERCOMP"],"sky":["#1c3354","#c9e0ed"],"floor":"#586d80","accent":"#62d4e8"},
  '1223': {"style":"court","bonus":"cross","routes":["左太湖绿廊","右南浔古镇台"],"names":["虹桥出发标","苏州南枢纽标","南浔古镇标","湖州衔接灯"],"prompt":"走进湖州金环签发全线验收合格令","finale":"沪苏湖高铁全线验收就绪待发","tactic":"跨半场斜射享加力，畅快点亮苏浙沪三地水乡站标","banner":["SHANGHAI-HUZHOU • 2024","JIANGNAN HSR READY"],"sky":["#387696","#eef2e4"],"floor":"#699482","accent":"#48a894"},
  '1224': {"style":"facade","bonus":"high","routes":["左极昼光伏阵","右抗寒风机台"],"names":["极昼光伏标","抗风叶轮标","氢能储能标","秦岭绿灯台"],"prompt":"走进南十字主楼金环点亮极地绿网","finale":"南极秦岭站绿色微网稳定供能","tactic":"登上高台射击享加力，低道便于快速回收分身","banner":["QINLING STATION • POLAR","GREEN MICROGRID"],"sky":["#2e6899","#eef8fc"],"floor":"#b8d4e3","accent":"#58c996"},
  '1225': {"style":"space","bonus":"pin","routes":["左全球风场道","右掩星探测廊"],"names":["快舟岁末标","掩星折射标","海风监测标","四星并网灯"],"prompt":"走进气象金环汇聚四星全球探测数据","finale":"天目一号气象四星精准入网","tactic":"青环留守锁定掩星信号折射，高效点亮四处气象观测标","banner":["TIANMU-1 • 2023","4 WEATHER SATS"],"sky":["#1b3357","#7bc4e0"],"floor":"#587085","accent":"#75e3f0"},
  '1226': {"style":"sport","bonus":"cross","routes":["左元荡生态桥","右盛泽湖州廊"],"names":["松江枢纽标","练塘水乡标","丝绸盛泽标","湖州新篇灯"],"prompt":"走进湖州东金环点亮沪苏湖通车大屏","finale":"沪苏湖高铁正式开通运营","tactic":"跨半场斜射享加力，快捷点亮长三角崭新高铁站标","banner":["HUSUHU HSR • 2024","350 KM/H JIANGNAN"],"sky":["#32739e","#f2ecd8"],"floor":"#5c9482","accent":"#e08b42"},
  '1227': {"style":"workshop","bonus":"pin","routes":["左探空火箭道","右 651 规划台"],"names":["探空火箭标","高空数据标","六五一蓝图标","卫星启航灯"],"prompt":"走进书斋金环封发人造卫星建议书","finale":"中国第一颗人造卫星工程序幕拉开","tactic":"青环留守同步高空探测数据，精准点亮四处拓荒蓝图标","banner":["ZHAO JIUZHANG • 1964","SAT DREAM PROPOSAL"],"sky":["#243b59","#ebd5b0"],"floor":"#7d786b","accent":"#e08846"},
  '1228': {"style":"court","bonus":"cross","routes":["左单层马鞍索网","右二氧化碳制冰坪"],"names":["马鞍索网标","零碳制冰标","丝带幕墙标","冬奥完工灯"],"prompt":"走进速滑馆金环点亮 22 条璀璨冰丝带","finale":"国家速滑馆“冰丝带”惊艳完工","tactic":"跨半场斜射享加力，畅快点亮冬奥零碳冰馆地标","banner":["ICE RIBBON • 2020","FASTEST GREEN ICE"],"sky":["#1f4678","#d8f2fc"],"floor":"#b8dce8","accent":"#58c4f5"},
  '1229': {"style":"sport","bonus":"cross","routes":["左 CR450AF 飞箭道","右 CR450BF 金凤凰台"],"names":["超低风阻标","轻量车体标","永磁牵引标","四百极速灯"],"prompt":"走进铁科院金环点亮 CR450 全球首发屏","finale":"全球最快 CR450 动车组样车惊艳亮相","tactic":"跨半场斜射享加力，畅快点亮红金双样车核心突破标","banner":["CR450 • 2024","450 KM/H WORLD LEADER"],"sky":["#265c94","#f7e4c4"],"floor":"#658094","accent":"#e65242"},
  '1230': {"style":"space","bonus":"pin","routes":["左中欧联合载荷","右磁暴监测轨"],"names":["西昌夜发标","联合载荷标","六星联测标","磁层揭秘灯"],"prompt":"走进测控金环接通中欧六星联测网","finale":"中国主导“地球空间双星计划”启航","tactic":"青环留守同步中欧六星联测相位，精准点亮空间探测标","banner":["DOUBLE STAR • 2003","CHINA-ESA SCIENCE"],"sky":["#122242","#6ca4d9"],"floor":"#4f657d","accent":"#75e0f0"},
  '1231': {"style":"sport","bonus":"cross","routes":["左八纵银龙道","右八横花海台"],"names":["北国雪原标","雪域高原标","江南水乡标","新年团圆灯"],"prompt":"走进岁末金环点亮 4.8 万公里神州路网","finale":"中国高铁里程领跑全球喜迎新年","tactic":"跨半场斜射享加力，畅快点亮神州四极高速路网标","banner":["CHINA HSR • 48,000KM","HAPPY NEW YEAR!"],"sky":["#1f3a66","#f7cf86"],"floor":"#5c8596","accent":"#f2a442"},
};
