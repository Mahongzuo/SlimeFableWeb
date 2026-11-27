import {defenseMaps} from '../src/templates/january-defense';
import {newyearService,isNewyearDay} from '../src/templates/newyear-defense';
import {isMonthendDay,monthendService} from '../src/templates/monthend-defense';
import {exhibits} from '../src/templates/december-chapters';
import {isSecond,secondIds,secondSteps} from '../src/templates/season-second';
import {isWorkshop,workshops} from './turning-season';
import {defenseControls,isSeasonDefense} from '../src/templates/season-defense';
import {matchMachines,isSeasonMatch} from '../src/templates/season-match';
import {relayMaps} from '../src/templates/season-skirmish';
import {decemberRelayMaps} from '../src/templates/december-skirmish';
import {instruments} from '../src/templates/season-instruments';
import {winterHelp} from './winter-help';

export interface GateGuide {title:string;steps:readonly string[];repair:string;optional?:string}
const page=(title:string,steps:string[],repair:string,optional?:string):GateGuide=>({title,steps,repair,optional});
const january:Record<string,GateGuide>={
 '0101-1864':page('印匣里的一尾虾',[
 '先走到废纸旁的印石，爬上印钮压出试印。到翘起的纸角按 F 揭纸，看看缺口在哪一侧。',
 '走到画上两处落款位置中的一处，按 F 选定。靠近翘角按 G，把分身留在纸上压平它。',
 '本体先离开印钮，再爬到钮顶压第二次。回到亮着的纸角，按 F 揭起整张画。'],
 '印痕缺角说明纸边没压实。在揭正式画前按 R 重新蘸印，等分身确实贴住翘角，再从钮外登顶。盖歪也可以揭纸通关。','匣盖附近还有第二种印面。'),
 '0101-1823':page('风把书翻到了哪一页',[
 '朝带针脚的书脊持续向前，让身体贴住立面翻过顶端，踏进本页书签。',
 '第二页可沿背风折痕贴壁爬过；想从另一侧过，就等页角升高再跳出，在空中二段跳后再按跳跃展伞。',
 '抵达末页后站上燕尾形书签，留在上面，让身体的重量把书页带下来。'],
 '掉到书沟会回到本页书签。滑翔没展开时先走背风路线，也能到同一个结尾。','两条折页路线各藏一枚压花。'),
 '0101-defense':page('花车过弯',[
 '在温室前选水雾塔，点 1 号位部署，再开始本轮。水雾照顾贴近车身的花粉。',
 '看缎带和车身的位置。弯道内留水雾、长街放风塔。等车尾离开旧街，用回收工具点后塔，再把它装到前街。',
 '六波结束后在拱门按画面上的绳轮按钮。先让分身扣住一边，再让本体到对侧拉绳，等马车通过后领取纪念品。'],
 '车尾沾粉时先在内弯补水雾；本轮失守可回到这个弯道重新布塔。','花色完好和全程不用主动支援分别记录。'),
 '0101-match':page('新年的第一盘零钱',[
 '点硬币看它正下方的预计落点。把底格附近相邻的两枚凝露交换，让三枚同色成线，消掉第一枚硬币的支撑。',
 '第二枚先向左右与相邻格换位。让硬币与同纹槽口在一列，再消下面的支撑。',
 '第三枚先预览落点。还没对槽时留住脚下那一排，横移对齐后再消。三币入盘即可领取，也可用余步冲分。'],
 '提前落低仍可横移。展开帮助里的「完整走法」查看当前棋盘的一对可交换格。','余步冲分和最高分属于复玩。'),
 '0101-skirmish':page('离水之前',[
 '走到岸边风标。Q 选中，G 投分身。看见风标停住，再按 X 回收一次，等它重新转动。',
 '沿低浮台或高廊进入水道。立柱挡住风标时先横移到看得见它的位置，再向剩下两处投分身。手机也可以直接点目标。',
 '两个风标完成后，对准尽头的放行铃投出分身。沿栈桥向前，看飞机加速离水。'],
 '漏过一枚只需重新瞄准当前航段。想回收时按 X，别在风标还需锁定时提前收走。'),
 '0101-rpg':page('门将先动了',[
 '在蓝线附近摊开滑半个身位，再收身转向。进热身圈按 F，到左右能力圈任选一处按 F。',
 '用风步先向一边带球，引门将转肩、移刃，再用闪避切向空侧。选格挡则等他移刃，摊开接住来球。',
 '等门将朝原来一侧扑出，站在另一侧按 J 射门。进球后滑向门前球灯，在光圈按 F 领取票根。'],
 '射丢会直接回到门前。先等移刃，空侧出现后再按 J，单纯站在门前连射容易被封住。'),
 '0101-shot':page('谷神星观测',[
 '按提示到观测圈。Q 选择瞄点，等移动光点离开遮挡，再按 G 投分身；也可直接点目标。',
 '换到下一处观测位置。依次记下三个不同光点，观测簿满三格后前往终点。',
 '进入终点范围按 F 完成星图。'],'标记没有留下时看看自己是否仍站在对应观测位置，再等光点露出。'),
 '0101-trial':page('印坊借印',[
 '先和出生点的委托人按 F 交谈。去印坊、水院、晾纸阁分别取印，次序自选。',
 '在每处站点贴近印台，根据当前指引抵达高度或地点，再按 F 取印。离开前看进度是否增加。',
 '三枚齐后去终点按 F，让三道印纹按你的取印次序落款。'],'一处没有记入就靠近该印台重试；入口委托要先接下。')
};
const workshopWalk:Record<string,string[]>={
 shadow:['靠近灯座按 G，让分身固定光源。','跟随金色脚印移动操杆。看幕上的马影与浅轮廓重合，再按 F；第二个影样也这样对齐。','到谢幕位置操作，让马偶扬蹄。'],
 spring:['走近闸脚把分身投到压板上。','分别走到蓝色和琥珀色槽柄旁按 F。把读数调成蓝槽 2、琥珀槽 1。','保持分身压闸，到右前方出口按 F 开池闸。'],
 tea:['在竹匾靠自己一端按 F，将茶青拨到中心。','踩下亮起的金色匾缘，看茶叶翻向另一侧，跟过去压住新的边缘。连续完成三次。','到匾后金圈按跳跃，用身体将离匾的叶片收进篓。'],
 dove:['靠近窗绳按 G，让分身守住绳扣。','在亮窗下放慢并停住，等纸鸽跟上。它抵达后再去下一扇窗。','到右前方的天空之窗按 F 开闩。'],
 press:['在纸夹旁投分身，等纸边固定。','走到依次亮起的横、纵铜规旁按 F，逐格微调到两色十字重叠。','到左端按 F 抬辊，沿铜轨连续走到右端滚出桥景，再操作出口。']
};
const workshopRepair:Record<string,string>={shadow:'马影还错位时微移身体再按 F；守灯分身要留在灯座。',spring:'数字调过头可以继续拨回；先看两只槽的各自读数。',tea:'停在亮边等叶片翻过来，最后收青要从金圈跳起。',dove:'回到最近的亮窗下等鸽子，先到出口不会替鸽子完成路程。',press:'滚到中途偏离铜轨时回左端重新走这一段。'};
const chapterRepair:Record<string,string>={
 mail:'信封上是圆戳就投左格，方戳投右格。压不出戳时先查分身是否在袋夹上，再跳起落回信面。',
 archive:'纸卷翘起来时，回左侧金线摊开，从头沿直线走到右端，然后再去两处阅读窗。',
 lens:'第二个轮廓模糊时先在黄铜轮调焦，回玻片上摊开，对准轮廓再收录。',
 message:'看哪个键正在闪。最后一行要摊开再按 F，发送要从铜色发送键上跳起并落回。',
 lantern:'走到未扣的一侧，确认分身守着灯座，本体在圈里摊开，再扣灯骨。',
 rover:'坡道没放平时，先让分身固定支脚，再从坡顶摊开沿金线一直走到坡脚。',
 bridge:'每根弧木要送进同侧合口。托起后先移动到金圈，再摊开按 F，把两岸都接好。',
 drum:'在第一只棘齿上跳起并落回，再依次经过中齿、右齿。到窥影窗前摊开，按 F 看画片。',
 falls:'低处的松枝需要摊开按 F；右岸瀑口要在空中按 F。只要补拍尚未收入画框的景。',
 foil:'摊开后沿三个刻度从左向右走，等第三个声音记下；在右端收身按 F 换轴，再拨回放。'
};
const rpgRoutes:Record<string,[string,string]>={
 '1127':['各轮在亮起的冰水槽、热浴槽或混合槽旁等液柱稳定，按 J 取样。回到中央刻线按 J，稳守路线要先摊开。','液柱未稳时留在槽边；摊开可加快稳定。'],
 '1128':['看风帆与浮标，在亮起的一舷等帆垂下。快舟闪避后按 J，主帆摊开再按 J。','风帆还绷紧时别急着过标，等下一次潮落。'],
 '1129':['跟随雪脊上移动的影尖。快线在影尖处起跳并按 J；稳线摊开站稳后再按 J。','影尖会移动；摊开或起跳前先跟上它，再校准最后一点距离。'],
 '1130':['在任一岸的黑白杆旁按 J 测深。浅水是 2 寻，深水至少 3 寻；换到深水侧再沿浮标按 J 领船。','快舵必须亲自测出深水。听到 2 寻就到对岸再放一次锤。'],
 '1201':['在亮着的拱脚摊开压稳，按 J 扣支撑。移到对侧钻头，快钻用闪避借势再按 J；稳守摊开压住后按 J。','留在底脚直到支护咬合，再离开推钻。'],
 '1202':['在风标边摊开，铜环蓄满时按 J 压住迎风端。到对侧等风带垂下，快线在空中按 J，稳线摊开按 J。','风带仍在扬起时等下一次风歇，三段各须先压住迎风端。'],
 '1203':['在纬带起点按 J 开快门，连续横穿光带。短曝可收身快扫；长曝要摊开走完。到另一头按 J 收片。','底片上有空白，退到最后亮起的一格接着扫，直接跑到终点不会补齐。'],
 '1204':['在手轮旁等白针靠近金刻线，按 J 刹停。再到对侧插座，轻臂路线弹起扣销，稳锁路线摊开压环，按 J 锁合。','针越过刻线会再摆回来，等它再靠近时刹车。'],
 '1205':['到黑白探冰标按 J 敲冰。观察哪一侧裂开蓝缝，到那边的出口。快线闪避借势、稳线摊开压艏，再按 J。','没破开先回标杆敲冰；下一段的裂纹可能朝另一边。'],
 '1206':['离鼓心约一步，同一方向绕半圈，铜环蓄满后按 J 挂绳。到导轮旁，快线弹起扣爪、稳线摊开锁索，再按 J。','在同一只齿上来回蹭会把绳放回去，保持方向沿着鼓绕。']
};
const expeditionTitles:Record<string,string>={
  '1127':'在冷槽和热槽之间校线','1128':'过岬之前读潮','1129':'循影越过冰脊','1130':'测出河轮的深槽','1201':'先支护，再推进',
  '1202':'红砂上的第一声','1203':'木星从镜头下经过','1204':'对接口的白色刻度','1205':'听冰纹的人','1206':'吊索尽头的铝尖'
};
export function guideFor(id:string):GateGuide|undefined{
  if(january[id])return january[id];
  if(isWorkshop(id)){const w=workshops[id];return page(w.name,workshopWalk[w.kind],workshopRepair[w.kind]);}
  if(isSecond(id)){const i=secondIds.indexOf(id);return page(['烛光折页','舷窗寻星','横移接球','边线传球','冰上观测'][i],secondSteps[i].map(s=>s[1]).concat('完成三个阶段后走到金圈按 F，再按收尾面板上的标记完成最后一步。'),['脱离折痕就从金线起点重新摊开。','先摊开压稳，再移动身体对准寻星环。','漏球回到靠自己一边的拍线按 F 重发。','追上皮球，再等接应人入圈。','先将分身放到当前一侧的脚架。'][i]);}
  const c=exhibits[id];
  if(c)return page(c.title,[...c.tasks.map(([,action])=>action),c.story==='message'?'站上铜色发送键，跳起再落回键面。':c.story==='drum'?'回到低矮的窥影窗，摊开身体按 F。':'到最后亮起的金圈，按 F「'+c.last+'」。'],chapterRepair[c.story],c.pin?'分身要留在支点。空中收下的藏签另记成绩。':'藏签和星尘可在空中收集；这些不阻挡结尾。');
  const custom=winterHelp(id);if(custom)return custom;
  const [day,mode]=id.split('-');
  if(mode==='defense'&&isSeasonDefense(day)){
    const c=defenseControls[day];
    if(isNewyearDay(day)){
      const desk=newyearService[day],map=defenseMaps[day];
      const ending=day==='0107'
        ?'六轮结束后，点一次「放下着陆绳」。气球会飞向加来，等吊篮落稳，再点「领取纪念品」。'
        :'完成第六轮后点「'+map.finale+'」，亲手完成展具并领取纪念品。';
      return page(c.name,[desk.guide,'先选「'+map.water+'」点 1 号位，再选「'+map.wind+'」点 2 号位，然后开始本轮。每过两轮回收旧塔，依次移到 3、4 号和 5、6 号。',c.guide,ending],(day>='0106'?'失守后点「在本轮重新布防」，保留已经过关的波次。等待标记或同色目标出现后再用「'+c.name+'」。':'失守可重新布防。')+c.guide);
    }
    if(isMonthendDay(day)){
      const desk=monthendService[day];
      return page(c.name,[
        '在「'+desk.sectors[0]+'」，选「'+desk.water+'」后点 1 号位，再选「'+desk.wind+'」点 2 号位，点「开始第 1 轮」。',
        '到「'+desk.sectors[1]+'」后选「回收塔」，点旧位置收回设备，在 3、4 号位重新布置。末段再移到 5、6 号位。',
        '波次中点「'+c.name+'」。'+c.guide,
        '六轮完成，点「'+desk.finale+'」，按收尾面板的标记完成最后一步。'
      ],'本轮失守时可以重新布防。若设备用完，先选「回收塔」收回旧位置；专属按钮的操作时机看「'+c.name+'」说明。');
    }
    return page(c.name,['先在当前街段布塔。选水塔再点 1 号位，选风塔再点 2 号位，最后点开始本轮。','每两轮向前换一组。选回收、点旧塔，然后在 3、4 号位重新搭水风塔；最后换到 5、6 号位。',c.guide,'六轮通过后，点面板末步并完成收尾机关。等模型停稳再领取。'],'失守可以在本轮重新布防。机关没产生效果时，检查活动目标、当前选位与冷却，再看上一步的触发条件。');
  }
  if(mode==='match'&&isSeasonMatch(day)){const m=matchMachines[day];return page(m.name,['从金框和刻纹找目标。点相邻两格或拖一格，让至少三枚同色穿过目标。',...m.stages.slice(0,3),m.hint,'完成最后一个金框，按收尾面板的指引操作并领取。'],'方向、先后顺序或需求颜色不对，金框会留下。查看「完整走法」里的当前可交换格，耗尽步数可重试本段。','通关后可用余步冲分。');}
  const relay=decemberRelayMaps[day]??relayMaps[day];
  if(mode==='skirmish'&&relay)return page(relay.name,[relay.lesson,'按 Q 切到可用光环，用 G 投分身；手机可点目标或用「选环」和「投分身」。',relay.middle,'在「'+relay.pads[3]+'」投出最后一团分身，再完成末尾机关。'],relay.middle+'　落空可走近一些重投。需要重新布置时点「回到本段」。');
  if(mode==='rpg'&&rpgRoutes[day]){const [operation,repair]=rpgRoutes[day];return page(expeditionTitles[day],['走进前方热身光圈，弹跳或摊开一次，再按 F。','到左右两枚能力圈之一，按 F 选定路线。触屏可点地行走，动作使用底部同名按钮。',operation,'三段完成后，去尽头光圈按 F，再完成最后的展品机关。'],repair+'　体力耗尽可以从本段继续。');}
}
export function endingHelp(id:string){
 const p=instruments[id];if(!p)return '';
 if(p.type==='register'&&p.offset){const [x,y]=p.offset;return p.note+'　从初始位置用方向键或箭头按钮：'+(x<0?'向右':'向左')+Math.abs(x)+' 格，'+(y<0?'向下':'向上')+Math.abs(y)+' 格。两色十字重合后按「'+p.verb+'」。';}
 if(p.type==='catch')return p.note+'　等游标进金色区再按「'+p.verb+'」，错过可等下一次往返。';
 if(p.type==='rally')return p.note+'　看球往哪边落，提前移动球拍。';
 return p.note+'　依序点「'+p.marks.join('」→「')+'」。';
}
