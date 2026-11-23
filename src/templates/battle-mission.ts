export type Step='orders'|'firstDeck'|'winch'|'crossing'|'search'|'guardian'|'return'|'mist'|'fork'|'pair'|'reward'|'gate'|'captain'|'complete';
export type Route='upper'|'lower';
export type Reward='heal'|'power';
export interface MissionProgress {step:Step;route:Route|null;journal:boolean;reward:Reward|null}
export function newMission(ship:boolean):MissionProgress{
 return {step:ship?'orders':'mist',route:null,journal:false,reward:null};
}
export const objective:Record<Step,string>={
 orders:'在本船海图桌接取委托',firstDeck:'击退打断交接的帆布偶兵',winch:'登艉楼，转动信号绞盘',
 crossing:'登上蓝旗记录船 · 艉楼跳板或下舱舷门',search:'进入记录室，取回航迹图匣',
 guardian:'击退封锁归路的船首像守卫',return:'返回本船海图桌，展开两列航迹',
 mist:'读出横扫，击退雾口旗甲兵',fork:'沿山道前进 · 低路或坡上',pair:'击退轻旗兵与护旗手',
 reward:'整备后再进入守将阵地',gate:'前往北侧阵旗，进入守将阵地',captain:'击败阵旗守将',complete:'任务完成'
};
export type Trigger='table'|'firstDown'|'winch'|'upper'|'lower'|'chart'|'log'|'guardianDown'|'fork'|'pairDown'|Reward|'gate'|'captainDown';
// Return a new state only for a legal event. The level maps spatial contacts, hits and UI choices to events.
export function advanceMission(p:MissionProgress,event:Trigger):MissionProgress {
 if(event==='log'&&!p.journal&&['search','guardian','return'].includes(p.step))return {...p,journal:true};
 if(p.step==='crossing'&&(event==='upper'||event==='lower'))return {...p,route:event,step:'search'};
 if(p.step==='reward'&&(event==='heal'||event==='power'))return {...p,reward:event,step:'gate'};
 const transitions:Partial<Record<Step,[Trigger,Step]>>={
  orders:['table','firstDeck'],firstDeck:['firstDown','winch'],winch:['winch','crossing'],search:['chart','guardian'],
  guardian:['guardianDown','return'],return:['table','complete'],mist:['firstDown','fork'],fork:['fork','pair'],
  pair:['pairDown','reward'],gate:['gate','captain'],captain:['captainDown','complete']
 };
 const transition=transitions[p.step];
 return transition&&transition[0]===event?{...p,step:transition[1]}:p;
}

