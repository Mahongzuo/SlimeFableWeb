import {RelayCourse,type Exhibit} from './season-skirmish';
import type {Vec} from '../slime/types';

export const midwinterRelayMaps:Record<string,Exhibit&{repair:string}>={
 '1212':{repair:'工牌早收会落回原架。在先投的工位补投，等牌子抬起再按 X。',kind:'cartworks',name:'椰风工棚的交接牌',lesson:'把分身投进近处的工牌架。',middle:'先投任意一边的工位，等交接牌抬起再按 X 回收。带工牌到另一工位近旁投递。',end:'工棚的门抬起，模型运输车出场',pads:['领牌架','蓝帽工位','铜帽工位','放车铃'],stone:'#879e91',trim:'#ffd082',sky:['#648f9f','#f4cba0']},
 '1213':{repair:'风太强时绕到路标朝向来路的一侧，离路标一步内再投。',kind:'dunes',name:'从流沙里找路',lesson:'试投在近处里程桩，点亮公路起点。',middle:'看风带落下时投第一块路标，再等风带扬起投另一侧。贴近路标半步处的背风弧，可以随时投。两边均可起步。',end:'沙丘退入暮色，沿途路灯依次点亮',pads:['里程桩','西向路标','东向路标','公路灯闸'],stone:'#bc9d76',trim:'#ffcb74',sky:['#7b92a3','#ffcea3']},
 '1214':{repair:'早收会让展件回起点。站在左看台补投，等金色弧段亮起再收。',kind:'returnmark',name:'展馆里的返程滑轨',lesson:'投在起点，让悬轨上的展件开始滑行。',middle:'分身投进左侧回程标，观察模型滑近金色弧段。此时按 X，带回返程标记。到右侧展台重新投出。站在左看台时滑轨会减速。',end:'返场展件滑入停放架，馆门亮起',pads:['展件轨首','返程标','接回台','入馆铃'],stone:'#73869c',trim:'#ffbf79',sky:['#314059','#abb7c1']},
 '1215':{repair:'先收分身会松开半壳。重新投第一侧，保持它留守，合好两侧再踩中缝。',kind:'halves',name:'合拢长壳的展柜',lesson:'试投在近侧工作灯，打开两侧分合线。',middle:'先投任意半壳的托座，让分身留守，再投另一半。两侧到位后，本体踩到中央金色接缝，再投远端揭幕扣。',end:'展柜半壳翻开，托盘升起内藏的载荷',pads:['工作灯','西半壳','东半壳','揭幕扣'],stone:'#7a9097',trim:'#eacf89',sky:['#526e81','#cad7ce']},
 '1216':{repair:'另一侧拒收时看金环。先走过近侧空槽，再走过斜对面的槽位。',kind:'nest',name:'母星架上少了哪盏灯',lesson:'把分身投给母星架下的灯盘。',middle:'任选侧架投分身，依金环走过两处空槽给它们供光。两槽满后投另一侧架，最后让中央母星接通全网。',end:'两翼展开，分出的星灯连成网络',pads:['母架灯盘','西翼分配架','东翼分配架','联网扣'],stone:'#65758f',trim:'#ffcc80',sky:['#152b48','#839cb3']}
};
export class MidwinterReception extends RelayCourse{
 launches=0;first=0;held=0;charge=0;paired=false;ticket=false;seam=false;socket=0;
 constructor(readonly day:string,seed:string){super(day,seed,midwinterRelayMaps[day]);}
 get sockets():Vec[]{const s=this.first===2?-1:1;return [[s*-.92,0,1.1],[s*1.63,0,-2.08]];}
 get checkpoint():Vec{return this.sockets[Math.min(1,this.socket)];}
 get markerSweep(){return this.day==='1214'?(1-Math.cos(this.charge*1.65))*.5:this.sweep;}
 get readyToRecall(){return this.day==='1214'?this.markerSweep>.63:this.charge>.82;}
 override available(i:number){
   if(this.day==='1214')return super.available(i);
   return !this.done.has(i)&&(i===0||this.done.has(0)&&(i===1||i===2||i===3&&this.done.has(1)&&this.done.has(2)));
 }
 override cast(i:number,p:Vec){
   const other=i===1||i===2;
   if(other&&this.first&&i!==this.first){
     if(this.day==='1212'&&(!this.ticket||Math.hypot(p[0]-this.pads[i][0],p[2]-this.pads[i][2])>2.45))return this.reject('等工牌抬起，带回工牌后到另一工位的铜边内交接。');
     if(this.day==='1214'&&!this.ticket)return this.reject('等展件进入金弧再回收返程标。');
     if(this.day==='1215'&&!this.held)return this.reject('第一半壳需要分身继续留守。');
     if(this.day==='1216'&&this.socket<2)return this.reject('沿金环走过两处空灯槽，再投对侧星架。');
   }
   if(this.day==='1213'&&other){
     const t=this.pads[i],shelter=Math.hypot(p[0]-t[0],p[2]-(t[2]+.83))<.98;
     if(!shelter&&(this.first?this.sweep<.53:this.sweep>.47))return this.reject(this.first?'等风带扬起，或贴近路标的背风弧。':'等风带落下，或贴近路标的背风弧。');
   }
   if(i===3&&this.day==='1215'&&!this.seam)return this.reject('先在两半壳之间的金色接缝踩合一次。');
   const accepted=super.cast(i,p);if(accepted)this.launches++;return accepted;
 }
 override update(dt:number,p:Vec,shots:readonly {phase:string;center:Vec}[]){
   const hit=super.update(dt,p,shots);
   if(hit===1||hit===2){if(!this.first){this.first=hit;this.held=hit;this.charge=0;}else if(hit!==this.first)this.paired=true;}
   if(this.held&&!this.paired){
     const anchor=this.pads[this.held],still=shots.some(s=>s.phase==='active'&&Math.hypot(s.center[0]-anchor[0],s.center[2]-anchor[2])<.79);
     if(!still&&['1212','1214','1215'].includes(this.day))this.release();
     if(still)this.charge+=dt*(this.day==='1214'&&p[0]<-1?.57:1);
   }
   if(this.day==='1216'&&this.first&&this.socket<2&&Math.hypot(p[0]-this.checkpoint[0],p[2]-this.checkpoint[2])<.9)this.socket++;
   if(this.paired&&this.day==='1215'&&Math.abs(p[0])<.95&&Math.abs(p[2]+2.10)<1.25)this.seam=true;
   return hit;
 }
 private release(){this.done.delete(this.first);this.first=0;this.held=0;this.charge=0;this.order=0;this.hint='机关松开了，可以在这一边重新投射。';}
 override recall(){
   if(this.held&&!this.paired&&['1212','1214','1215'].includes(this.day)){
     if(this.day!=='1215'&&this.readyToRecall){this.held=0;this.ticket=true;this.hint='交接物已随分身回来。';}
     else{this.release();this.retries++;}
   }
   super.recall();
 }
 override retry(){if(this.held&&!this.paired&&['1212','1214','1215'].includes(this.day))this.release();super.retry();}
 override get instruction(){
   if(this.paired&&this.day==='1215'&&!this.seam)return '两半到位。走到两条托轨中间、靠远端的金色接缝。';
   if(this.held&&!this.paired){
     if(this.day==='1212')return this.readyToRecall?'交接牌已抬起。按 X 收牌，靠近对面再投。':'工位正在交接，留住分身直到工牌抬起。';
     if(this.day==='1214')return this.readyToRecall?'展件已在金弧，按 X 回收返程标。':'等模型滑入金弧。站在左侧可慢速观察。';
     if(this.day==='1216'&&this.socket<2)return '母架已分光。沿金环走到第 '+(this.socket+1)+' 个空槽。';
   }
   return super.instruction;
 }
}
