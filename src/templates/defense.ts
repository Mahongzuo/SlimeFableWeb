import {rng} from './random';

export const ELEMENT_KINDS=['water','wind','fire','thunder','dark','physical'] as const;
export type ElementKind=typeof ELEMENT_KINDS[number];
export type TowerKind=ElementKind|'dew';
export const TOWER_KINDS:readonly TowerKind[]=[...ELEMENT_KINDS,'dew'];
export type EnemyKind='noise'|'echo'|'detune'|'shield'|'boss';
export const ENEMY_NAMES:Record<EnemyKind,string>={
  noise:'杂讯粒',echo:'回声团',detune:'失谐团',shield:'谐振盾体',boss:'失谐母体'
};
export const LANES=5, COLS=8, WAVES=8;
export const DEFENSE_CARDS:Record<TowerKind,{name:string;role:string;lv3:string;cost:number;hp:number;period:number;damage:number}>={
  dew:{name:'凝露塔',role:'每 13 秒凝成 11 点凝露',lv3:'产露大幅提升，并为十字邻格提供 +20% 攻速光环',cost:35,hp:86,period:13,damage:0},
  water:{name:'水滴塔',role:'水珠使敌人减速并附水',lv3:'发射分裂大水泡，同时减速并附水前方两名目标',cost:35,hp:100,period:2.15,damage:11},
  wind:{name:'风旋塔',role:'推迟轻敌推进，并扩散元素附着',lv3:'强力双倍飓风推力，并将附着元素大范围扩散',cost:40,hp:95,period:2.65,damage:10},
  fire:{name:'火绒塔',role:'炸开同路敌群，附水蒸发 / 附雷超载',lv3:'命中后留下 3 秒灼烧熔岩带，持续炙烤过路敌人',cost:55,hp:105,period:3.1,damage:20},
  thunder:{name:'雷弧塔',role:'跳向相邻行，附水感电麻痹 / 附火超载',lv3:'高压三路连锁电弧，并延长麻痹停顿',cost:65,hp:95,period:2.65,damage:16},
  dark:{name:'暗瞳塔',role:'持续照射逐次增强，与水雷触发侵蚀易伤',lv3:'暗束直接穿透同路最多 3 个目标并无视半数护盾',cost:45,hp:100,period:1.55,damage:7},
  physical:{name:'岩盾塔',role:'厚实前排拦阻敌人，破甲重击附着目标',lv3:'近战反伤荆棘 + 自动缓慢修复耐久，破盾倍率翻倍',cost:35,hp:310,period:1.4,damage:14}
};
export const SUPPORT_INFO:Record<ElementKind,{name:string;desc:string}>={
  water:{name:'沧澜水幕炮',desc:'3×3 冰封减速 4.5 秒并强力挂水'},
  wind:{name:'飓风回卷弹',desc:'3×3 击退 2.4 格救线并扩散全场附着'},
  fire:{name:'炽焰流星坠',desc:'3×3 高额爆破，引爆蒸发与超载'},
  thunder:{name:'全域天雷诏',desc:'精准雷劈 3 名高威胁目标并解除全场干扰'},
  dark:{name:'深渊引力球',desc:'3×3 破盾暗爆并挂 7 秒全伤易伤'},
  physical:{name:'磐岩修复锤',desc:'3×3 震击破盾并修复周围塔 55% 耐久'}
};
export type TileKind='amp'|'chill'|'spring';
export interface TileMod {lane:number;col:number;kind:TileKind}
export const TILE_LABELS:Record<TileKind,{name:string;desc:string}>={
  amp:{name:'信号增幅格',desc:'塔伤害 +20%，攻速 +15%'},
  chill:{name:'液冷散热槽',desc:'经过敌人减速 25% 且自动附水'},
  spring:{name:'聚露泉眼',desc:'凝露塔产露 +40%，其余塔建造成本 -10'}
};
export interface DewDrop {id:number;lane:number;x:number;amount:number;life:number;maxLife:number}
export interface BurnZone {lane:number;x:number;life:number;dps:number}
export interface DefenseOptions {enhanced?:boolean}
type Phase='setup'|'wave'|'interval'|'transmit'|'won'|'lost';
export interface DefenseTower {
  id:number;kind:TowerKind;lane:number;col:number;hp:number;maxHp:number;
  readyAt:number;jammedUntil:number;targetId:number|null;focus:number;
  level:1|2|3;invested:number;totalDamage:number;
}
export interface DefenseEnemy {
  id:number;kind:EnemyKind;lane:number;x:number;hp:number;maxHp:number;speed:number;
  shadow:boolean;split:boolean;slowUntil:number;wetUntil:number;jamAt:number;strikeAt:number;
  aura:ElementKind|null;auraUntil:number;stunUntil:number;vulnUntil:number;
  shield:number;maxShield:number;summonAt:number;
}
type FxKind='shot'|'hit'|'dew'|'leak'|'tape'|'jam'|'split'|'support'|'upgrade'|'shieldBreak'|'bossPulse';
export type ReactionTag='vaporize'|'chain'|'push'|'focus'|'swirl'|'overload'|'corrode'|'shatter';
export interface DefenseEffect {
  id:number;kind:FxKind;element:TowerKind|null;lane:number;x:number;fromX:number;fromLane:number;
  life:number;maxLife:number;reaction?:ReactionTag;amount?:number;targetId?:number;
}
interface Spawn {at:number;lane:number;kind:EnemyKind}
interface Packet {at:number; kinds:EnemyKind[]; shift:number}
const N:EnemyKind='noise',E:EnemyKind='echo',J:EnemyKind='detune',S:EnemyKind='shield',B:EnemyKind='boss';
// Time and packet composition are authored. A seed permutes lanes as a group
// so paired and clustered enemies retain their intended arrival pattern.
const WAVES_PLAN:Packet[][]=[
  [{at:5,kinds:[N],shift:0},{at:13,kinds:[N],shift:1},{at:22,kinds:[N],shift:-1},{at:31,kinds:[N,N],shift:2}],
  [{at:2,kinds:[N,N],shift:0},{at:11,kinds:[N,N],shift:1},{at:21,kinds:[N,N],shift:-1},{at:30,kinds:[N,N],shift:3}],
  [{at:2,kinds:[N,E],shift:0},{at:11,kinds:[E],shift:1},{at:22,kinds:[N,N],shift:-2},{at:31,kinds:[E,N],shift:-1}],
  [{at:2,kinds:[E,E],shift:0},{at:10,kinds:[N,N,N],shift:1},{at:21,kinds:[N,E],shift:-1},{at:31,kinds:[N,E,N],shift:2}],
  [{at:2,kinds:[E,N],shift:0},{at:10,kinds:[E,E,N],shift:-1},{at:20,kinds:[N,E],shift:1},{at:32,kinds:[E,N,N],shift:2}],
  [{at:2,kinds:[N,E,N],shift:0},{at:11,kinds:[J,E,N],shift:1},{at:22,kinds:[N,E,J],shift:-2},{at:32,kinds:[E,E,N],shift:2}],
  [{at:2,kinds:[J,E,N],shift:0},{at:10,kinds:[E,N,J],shift:1},{at:20,kinds:[N,J,E,N],shift:2},{at:33,kinds:[J,E,N],shift:-1}],
  [{at:2,kinds:[J,E,N],shift:0},{at:10,kinds:[J,N,E,N],shift:-1},{at:21,kinds:[E,J,N,E],shift:2},{at:34,kinds:[J,E,J,N],shift:1}]
];
const ENHANCED_EXTRA:Partial<Record<number,Packet[]>>={
  4:[{at:16,kinds:[S],shift:0}],
  5:[{at:15,kinds:[S,N],shift:1}],
  6:[{at:17,kinds:[S],shift:-1}],
  7:[{at:14,kinds:[S,E],shift:0},{at:27,kinds:[S],shift:2}],
  8:[{at:15,kinds:[S,J],shift:1},{at:26,kinds:[B],shift:0}]
};
const STEP=.1, spawnX=8.18;
function validLane(lane:number){return Number.isInteger(lane)&&lane>=0&&lane<LANES;}
function validCol(col:number){return Number.isInteger(col)&&col>=0&&col<COLS;}

export class DefenseGame {
  readonly enhanced:boolean;
  phase:Phase='setup';wave=0;elapsed=0;waveTime=0;nextWaveIn=0;
  dew=150;integrity=3;leaks=0;tapes=2;kills=0;
  resonance=0;reactions=0;earlyCalls=0;
  loadout:ElementKind[]=[];towers:DefenseTower[]=[];enemies:DefenseEnemy[]=[];effects:DefenseEffect[]=[];
  tiles:TileMod[]=[];drops:DewDrop[]=[];burns:BurnZone[]=[];
  private schedules:Spawn[][];private cursor=0;private carry=0;private serial=0;private incomeAt=6;
  constructor(readonly seed:string, options?:DefenseOptions){
    this.enhanced=options?.enhanced===true;
    const random=rng(seed);
    this.schedules=WAVES_PLAN.map((basePackets,w)=>{
      const packets=this.enhanced&&ENHANCED_EXTRA[w+1]?[...basePackets,...ENHANCED_EXTRA[w+1]!]:basePackets;
      const anchor=w===0?2:random.int(0,4),direction=random.chance(.5)?1:-1;
      const entries:Spawn[]=[];
      for(const p of packets){
        for(let i=0;i<p.kinds.length;i++){
          const offset=p.shift+(i>1?0:i);
          const lane=(anchor+10+direction*offset)%LANES;
          entries.push({at:p.at+i*(i===2?1.1:.8),lane,kind:p.kinds[i]});
        }
      }
      return entries.sort((a,b)=>a.at-b.at);
    });
    if(this.enhanced){
      const tileRand=rng(seed+'-tiles');
      const used=new Set<string>();
      const pick=(kind:TileKind,cols:number[])=>{
        for(let tries=0;tries<24;tries++){
          const lane=tileRand.int(0,LANES-1),col=cols[tileRand.int(0,cols.length-1)];
          const key=lane+','+col;
          if(used.has(key))continue;
          used.add(key);this.tiles.push({lane,col,kind});return;
        }
      };
      pick('spring',[0,1]);
      pick('amp',[2,3,4]);
      pick('amp',[3,4,5]);
      pick('chill',[4,5,6]);
      pick('chill',[5,6]);
      this.resonance=45;
    }
  }
  tileAt(lane:number,col:number):TileMod|undefined{
    return this.tiles.find(t=>t.lane===lane&&t.col===col);
  }
  plantCost(lane:number,col:number,kind:TowerKind):number{
    const base=DEFENSE_CARDS[kind].cost;
    if(!this.enhanced)return base;
    const mod=this.tileAt(lane,col);
    return mod?.kind==='spring'&&kind!=='dew'?Math.max(15,base-10):base;
  }
  upgradeCost(t:DefenseTower):number{
    if(t.level>=3)return 0;
    const base=DEFENSE_CARDS[t.kind].cost;
    return Math.round(base*(t.level===1?1.1:1.6));
  }
  salvageValue(t:DefenseTower):number{
    return Math.round(t.invested*.6);
  }
  repairCost(t:DefenseTower):number{
    return t.hp<t.maxHp?15:0;
  }
  get boss():DefenseEnemy|null{
    return this.enemies.find(e=>e.kind==='boss'&&e.hp>0)??null;
  }
  get mvpTower():DefenseTower|null{
    let best:DefenseTower|null=null;
    for(const t of this.towers)if(t.totalDamage>(best?.totalDamage??0))best=t;
    return best;
  }
  start(elements:readonly ElementKind[]){
    if(this.phase!=='setup'||elements.length!==4||new Set(elements).size!==4||!elements.every(k=>ELEMENT_KINDS.includes(k)))return false;
    this.loadout=[...elements];this.beginWave();return true;
  }
  private beginWave(){this.wave++;this.cursor=0;this.waveTime=0;this.nextWaveIn=0;this.phase='wave';}
  callNextWaveEarly():number{
    if(!this.enhanced||this.phase!=='interval'||this.nextWaveIn<=.1)return 0;
    const bonus=Math.max(12,Math.min(25,Math.round(this.nextWaveIn*4.2)));
    this.dew+=bonus;this.earlyCalls++;this.resonance=Math.min(100,this.resonance+10);
    this.fx('dew',null,-1,-.15,-.15,-1,.6).amount=bonus;
    this.beginWave();
    return bonus;
  }
  get incoming():Readonly<Spawn>|null{
    if(this.phase==='interval')return this.schedules[this.wave]?.[0]??null;
    return this.phase==='wave'?this.schedules[this.wave-1][this.cursor]??null:null;
  }
  get upcoming():{lane:number;kind:EnemyKind;inSeconds:number}|null{
    const spawn=this.phase==='setup'?this.schedules[0][0]:this.incoming;
    if(!spawn)return null;
    const wait=this.phase==='interval'?this.nextWaveIn:0,elapsed=this.phase==='wave'?this.waveTime:0;
    return {lane:spawn.lane,kind:spawn.kind,inSeconds:Math.max(0,wait+spawn.at-elapsed)};
  }
  get upcomingLanes():{lane:number;kind:EnemyKind;inSeconds:number}[]{
    const list=this.phase==='interval'?this.schedules[this.wave]??[]:this.phase==='wave'?this.schedules[this.wave-1].slice(this.cursor):this.schedules[0];
    const wait=this.phase==='interval'?this.nextWaveIn:0,elapsed=this.phase==='wave'?this.waveTime:0;
    const seen=new Map<number,{lane:number;kind:EnemyKind;inSeconds:number}>();
    for(const s of list){
      const dt=Math.max(0,wait+s.at-elapsed);
      if(dt>4.5)break;
      if(!seen.has(s.lane))seen.set(s.lane,{lane:s.lane,kind:s.kind,inSeconds:dt});
    }
    return [...seen.values()];
  }
  get clearedWaves(){return this.phase==='transmit'||this.phase==='won'?WAVES:this.phase==='interval'?this.wave:Math.max(0,this.wave-1);}
  get decodedBits(){return Math.floor(1679*this.clearedWaves/WAVES);}
  get decodedRows(){return Math.floor(this.decodedBits/23);}
  private canPlant(){return this.phase==='wave'||this.phase==='interval';}
  plant(lane:number,col:number,kind:TowerKind){
    if(!this.canPlant()||!validLane(lane)||!validCol(col)||!TOWER_KINDS.includes(kind))return false;
    const card=DEFENSE_CARDS[kind],cost=this.plantCost(lane,col,kind);
    if((kind!=='dew'&&!this.loadout.includes(kind))||this.dew<cost||this.towers.some(t=>t.lane===lane&&t.col===col))return false;
    if(this.enemies.some(e=>e.lane===lane&&Math.abs(e.x-(col+.5))<.48))return false;
    this.dew-=cost;this.towers.push({id:++this.serial,kind,lane,col,hp:card.hp,maxHp:card.hp,
      readyAt:this.elapsed+(kind==='dew'?card.period:.55),jammedUntil:0,targetId:null,focus:0,
      level:1,invested:cost,totalDamage:0});
    return true;
  }
  upgrade(lane:number,col:number):boolean{
    if(!this.enhanced||!this.canPlant())return false;
    const t=this.towers.find(x=>x.lane===lane&&x.col===col);
    if(!t||t.level>=3)return false;
    const cost=this.upgradeCost(t);
    if(this.dew<cost)return false;
    this.dew-=cost;t.invested+=cost;
    t.level=(t.level+1) as 2|3;
    const hpScale=t.level===2?1.35:1.85;
    t.maxHp=Math.round(DEFENSE_CARDS[t.kind].hp*hpScale);
    t.hp=t.maxHp;
    t.jammedUntil=0;
    this.fx('upgrade',t.kind,t.lane,t.col+.5,t.col+.5,t.lane,.65).amount=t.level;
    return true;
  }
  repair(lane:number,col:number):boolean{
    if(!this.enhanced||!this.canPlant())return false;
    const t=this.towers.find(x=>x.lane===lane&&x.col===col);
    const cost=t?this.repairCost(t):0;
    if(!t||cost<=0||this.dew<cost)return false;
    this.dew-=cost;
    t.hp=Math.min(t.maxHp,t.hp+Math.round(t.maxHp*.6));
    this.fx('upgrade',t.kind,t.lane,t.col+.5,t.col+.5,t.lane,.45);
    return true;
  }
  salvage(lane:number,col:number):number{
    if(!this.enhanced||!this.canPlant())return 0;
    const index=this.towers.findIndex(t=>t.lane===lane&&t.col===col);
    if(index<0)return 0;
    const refund=this.salvageValue(this.towers[index]);
    this.towers.splice(index,1);
    this.dew+=refund;
    return refund;
  }
  remove(lane:number,col:number){
    if(!this.canPlant())return false;
    const index=this.towers.findIndex(t=>t.lane===lane&&t.col===col);
    if(index<0)return false;
    this.towers.splice(index,1);return true;
  }
  collectDrop(id:number):number{
    const idx=this.drops.findIndex(d=>d.id===id);
    if(idx<0)return 0;
    const d=this.drops[idx];
    this.drops.splice(idx,1);
    this.dew+=d.amount;
    this.fx('dew','dew',d.lane,d.x,d.x,d.lane,.5).amount=d.amount;
    return d.amount;
  }
  castSupport(lane:number,col:number,element:ElementKind):boolean{
    if(!this.enhanced||!this.canPlant()||!validLane(lane)||!validCol(col)||this.resonance<100)return false;
    if(!this.loadout.includes(element))return false;
    this.resonance=0;
    const cx=col+.5;
    this.fx('support',element,lane,cx,-0.5,2,.9);
    const inArea=(e:DefenseEnemy)=>e.hp>0&&Math.abs(e.lane-lane)<=1&&Math.abs(e.x-cx)<=1.75;
    if(element==='thunder'){
      for(const t of this.towers)t.jammedUntil=0;
      const priority=this.enemies.filter(e=>e.hp>0)
        .sort((a,b)=>(b.kind==='boss'?200:b.kind==='detune'?80:0)+b.hp-((a.kind==='boss'?200:a.kind==='detune'?80:0)+a.hp))
        .slice(0,3);
      for(const e of priority){
        this.fx('shot','thunder',e.lane,e.x,cx,lane,.45).reaction='chain';
        this.applyElementHit(e,null,'thunder',68,true);
        e.stunUntil=Math.max(e.stunUntil,this.elapsed+1.2);
      }
      return true;
    }
    const targets=this.enemies.filter(inArea);
    if(element==='water'){
      for(const e of targets){
        e.slowUntil=Math.max(e.slowUntil,this.elapsed+4.5);
        e.wetUntil=Math.max(e.wetUntil,this.elapsed+6.5);
        e.aura='water';e.auraUntil=this.elapsed+6.5;
        this.applyElementHit(e,null,'water',38,true);
      }
    }else if(element==='wind'){
      for(const e of targets){
        const push=e.kind==='boss'?.75:2.4;
        e.x=Math.min(spawnX,e.x+push);
        this.applyElementHit(e,null,'wind',34,true);
      }
    }else if(element==='fire'){
      this.burns.push({lane,x:cx,life:4.5,dps:14});
      for(const e of targets)this.applyElementHit(e,null,'fire',78,true);
    }else if(element==='dark'){
      for(const e of targets){
        e.vulnUntil=Math.max(e.vulnUntil,this.elapsed+7);
        this.applyElementHit(e,null,'dark',52,true);
      }
    }else if(element==='physical'){
      for(const e of targets)this.applyElementHit(e,null,'physical',56,true);
      for(const t of this.towers){
        if(Math.abs(t.lane-lane)<=1&&Math.abs(t.col-col)<=1){
          t.hp=Math.min(t.maxHp,t.hp+Math.round(t.maxHp*.55));
          t.jammedUntil=0;
        }
      }
    }
    return true;
  }
  useTape(lane:number){
    if(!this.canPlant()||!validLane(lane)||this.tapes===0)return false;
    this.tapes--;this.fx('tape',null,lane,8,0,lane,.8);
    for(const t of this.towers.filter(t=>t.lane===lane)){
      t.jammedUntil=0;
      if(t.kind!=='dew')this.shoot(t);
    }
    return true;
  }
  transmit(){if(this.phase!=='transmit')return false;this.phase='won';return true;}
  tick(seconds:number){
    if(!Number.isFinite(seconds)||seconds<=0)return;
    if(!this.canPlant()){if(this.effects.length)this.fadeEffects(seconds);return;}
    this.carry+=seconds;
    while(this.carry+1e-8>=STEP&&this.canPlant()){
      this.carry-=STEP;this.step();
    }
  }
  private fadeEffects(dt:number){
    for(const e of this.effects)e.life-=dt;
    this.effects=this.effects.filter(e=>e.life>1e-7);
  }
  private towerPeriod(t:DefenseTower):number{
    const base=DEFENSE_CARDS[t.kind].period;
    if(!this.enhanced)return base;
    let speedMult=t.level===3?1.28:t.level===2?1.14:1;
    if(this.tileAt(t.lane,t.col)?.kind==='amp')speedMult*=1.15;
    // Lv.3 Dew tower grants +20% attack speed aura to orthogonal neighbors
    if(t.kind!=='dew'&&this.towers.some(o=>o.kind==='dew'&&o.level===3&&o.hp>0&&Math.abs(o.lane-t.lane)+Math.abs(o.col-t.col)===1)){
      speedMult*=1.2;
    }
    return base/speedMult;
  }
  private towerDamage(t:DefenseTower):number{
    const base=DEFENSE_CARDS[t.kind].damage;
    if(!this.enhanced)return base;
    let mult=t.level===3?2.05:t.level===2?1.45:1;
    if(this.tileAt(t.lane,t.col)?.kind==='amp')mult*=1.2;
    return base*mult;
  }
  private step(){
    this.elapsed+=STEP;
    this.fadeEffects(STEP);
    if(this.enhanced){
      this.resonance=Math.min(100,this.resonance+STEP*1.65);
      for(let i=this.drops.length-1;i>=0;i--){
        this.drops[i].life-=STEP;
        if(this.drops[i].life<=0){
          // Auto-bank 50% when expiring so players aren't punished harshly
          this.dew+=Math.max(1,Math.round(this.drops[i].amount*.5));
          this.drops.splice(i,1);
        }
      }
      for(let i=this.burns.length-1;i>=0;i--){
        const b=this.burns[i];b.life-=STEP;
        if(Math.abs((this.elapsed*10)%5)<.1){
          for(const e of this.enemies){
            if(e.hp>0&&e.lane===b.lane&&Math.abs(e.x-b.x)<=.75){
              this.dealRawDamage(e,null,'fire',b.dps*.5);
            }
          }
        }
        if(b.life<=0)this.burns.splice(i,1);
      }
    }
    if(this.elapsed+1e-7>=this.incomeAt){this.dew+=7;this.incomeAt+=6;this.fx('dew',null,-1,-.15,-.15,-1,.5);}
    if(this.phase==='wave'){
      this.waveTime+=STEP;
      const schedule=this.schedules[this.wave-1];
      while(this.cursor<schedule.length&&schedule[this.cursor].at<=this.waveTime+1e-7){
        const spawn=schedule[this.cursor++];this.spawn(spawn.kind,spawn.lane,spawnX);
      }
    }
    for(const tower of this.towers){
      if(tower.hp<=0)continue;
      if(this.enhanced&&tower.kind==='physical'&&tower.level===3&&tower.hp<tower.maxHp){
        tower.hp=Math.min(tower.maxHp,tower.hp+STEP*6);
      }
      if(tower.readyAt>this.elapsed+1e-7||tower.jammedUntil>this.elapsed)continue;
      if(tower.kind==='dew'){
        const baseYield=this.enhanced?(tower.level===3?20:tower.level===2?15:11):11;
        const springBonus=this.enhanced&&this.tileAt(tower.lane,tower.col)?.kind==='spring'?1.4:1;
        const gained=Math.round(baseYield*springBonus);
        this.dew+=gained;tower.readyAt=this.elapsed+this.towerPeriod(tower);
        this.fx('dew','dew',tower.lane,tower.col+.5,tower.col+.5,tower.lane,.65).amount=gained;
        if(this.enhanced&&tower.level>=2&&this.drops.length<8){
          this.drops.push({id:++this.serial,lane:tower.lane,x:Math.min(7.6,tower.col+.7),amount:tower.level===3?12:7,life:9,maxLife:9});
        }
      }else if(this.shoot(tower))tower.readyAt=this.elapsed+this.towerPeriod(tower);
    }
    for(const enemy of this.enemies){
      if(enemy.hp<=0)continue;
      this.advanceEnemy(enemy);
      if(this.integrity===0)break;
    }
    this.towers=this.towers.filter(t=>t.hp>0);
    this.enemies=this.enemies.filter(e=>e.hp>0);
    if(this.integrity<=0){this.phase='lost';return;}
    if(this.phase==='interval'){
      this.nextWaveIn=Math.max(0,this.nextWaveIn-STEP);
      if(this.nextWaveIn<1e-7)this.beginWave();
    }else if(this.cursor===this.schedules[this.wave-1].length&&this.enemies.length===0){
      if(this.wave===WAVES){this.phase='transmit';}
      else{this.phase='interval';this.nextWaveIn=this.enhanced?6.5:5;}
    }
  }
  private spawn(kind:EnemyKind,lane:number,x:number,shadow=false){
    const base={noise:35,echo:52,detune:73,shield:105,boss:640}[kind];
    const hp=kind==='boss'?base:Math.round((base+(this.wave-1)*10+Math.max(0,this.wave-4)*14)*(shadow?.38:1));
    const speed=(shadow?.28:{noise:.24,echo:.195,detune:.185,shield:.16,boss:.095}[kind])*(kind==='boss'?1:1+.045*(this.wave-1));
    const maxShield=kind==='shield'?Math.round(70+this.wave*10):kind==='boss'?240:0;
    this.enemies.push({id:++this.serial,kind,lane,x,hp,maxHp:hp,speed,shadow,split:shadow,slowUntil:0,wetUntil:0,
      jamAt:this.elapsed+(kind==='boss'?5.5:2.5),strikeAt:0,aura:null,auraUntil:0,stunUntil:0,vulnUntil:0,
      shield:maxShield,maxShield,summonAt:this.elapsed+9.5});
  }
  private fx(kind:FxKind,element:TowerKind|null,lane:number,x:number,fromX:number,fromLane:number,maxLife:number){
    const effect:DefenseEffect={id:++this.serial,kind,element,lane,x,fromX,fromLane,life:maxLife,maxLife};
    this.effects.push(effect);return effect;
  }
  private advanceEnemy(e:DefenseEnemy){
    if(e.stunUntil>this.elapsed)return;
    if(e.kind==='boss'){
      if(e.jamAt<=this.elapsed){
        e.jamAt=this.elapsed+8.5;
        const targets=this.towers.filter(t=>t.hp>0&&Math.abs(t.lane-e.lane)<=1&&t.col+.5<=e.x+.2)
          .sort((a,b)=>b.col-a.col).slice(0,2);
        for(const victim of targets){
          victim.jammedUntil=Math.max(victim.jammedUntil,this.elapsed+3.2);
          this.fx('jam',null,victim.lane,victim.col+.5,e.x,e.lane,.8);
        }
        this.fx('bossPulse',null,e.lane,e.x,e.x,e.lane,.75);
      }
      if(e.summonAt<=this.elapsed){
        e.summonAt=this.elapsed+11;
        const summonLane=(e.lane+(Math.floor(this.elapsed)%2?1:LANES-1))%LANES;
        this.spawn('noise',summonLane,Math.min(spawnX,e.x+.4),true);
        this.fx('split',null,summonLane,Math.min(spawnX,e.x+.4),e.x,e.lane,.55);
      }
    }else if(e.kind==='detune'&&e.jamAt<=this.elapsed){
      // Aim at the nearest functioning tower in this lane. It must be ahead of
      // the creature and inside the broadcast radius.
      const victim=this.towers.filter(t=>t.hp>0&&t.lane===e.lane&&t.col+.5<=e.x+.1&&e.x-(t.col+.5)<3.2)
        .sort((a,b)=>b.col-a.col)[0];
      if(victim){
        victim.jammedUntil=Math.max(victim.jammedUntil,this.elapsed+3.6);e.jamAt=this.elapsed+9;
        this.fx('jam',null,victim.lane,victim.col+.5,e.x,e.lane,.75);
      }
    }
    const target=this.towers.find(t=>t.hp>0&&t.lane===e.lane&&e.x>=t.col+.40&&e.x<=t.col+1.01);
    if(target){
      if(e.strikeAt<=this.elapsed){
        const atk=e.shadow?5:e.kind==='boss'?26:e.kind==='detune'||e.kind==='shield'?14:10;
        target.hp=Math.max(0,target.hp-atk);e.strikeAt=this.elapsed+1.25;
        if(this.enhanced&&target.kind==='physical'&&target.level===3){
          this.dealRawDamage(e,target,'physical',14);
        }
      }
      return;
    }
    let slow=e.slowUntil>this.elapsed?.55:1;
    if(this.enhanced){
      const col=Math.floor(e.x);
      if(col>=0&&col<COLS&&this.tileAt(e.lane,col)?.kind==='chill'){
        slow*=.75;
        e.wetUntil=Math.max(e.wetUntil,this.elapsed+1.2);
        if(!e.aura||e.auraUntil<=this.elapsed){e.aura='water';e.auraUntil=this.elapsed+2.2;}
      }
    }
    e.x-=e.speed*STEP*slow;
    if(e.x<0){
      e.hp=0;const dmg=e.kind==='boss'?3:1;
      this.leaks+=dmg;this.integrity=Math.max(0,this.integrity-dmg);
      this.fx('leak',null,e.lane,0,.6,e.lane,.62);
    }
  }
  private activeAura(e:DefenseEnemy):ElementKind|null{
    if(e.wetUntil>this.elapsed)return 'water';
    if(e.aura&&e.auraUntil>this.elapsed)return e.aura;
    return null;
  }
  private applyElementHit(e:DefenseEnemy,t:DefenseTower|null,el:ElementKind,baseDmg:number,isSupport=false){
    if(e.hp<=0)return;
    const aura=this.activeAura(e);
    let dmg=baseDmg;
    let reaction:ReactionTag|undefined;
    if(el==='fire'&&aura==='water'){
      e.wetUntil=0;if(e.aura==='water')e.aura=null;
      dmg*=1.65;reaction='vaporize';
    }else if(el==='fire'&&aura==='thunder'){
      e.aura=null;e.auraUntil=0;
      dmg+=18;reaction='overload';
      if(e.kind!=='boss')e.x=Math.min(spawnX,e.x+.55);
      e.jamAt=Math.max(e.jamAt,this.elapsed+4.5);
      for(const other of this.enemies){
        if(other.id!==e.id&&other.hp>0&&other.lane===e.lane&&Math.abs(other.x-e.x)<=1.25){
          this.dealRawDamage(other,t,'fire',16,'overload');
        }
      }
    }else if(el==='thunder'&&aura==='fire'){
      e.aura=null;e.auraUntil=0;
      dmg+=18;reaction='overload';
      if(e.kind!=='boss')e.x=Math.min(spawnX,e.x+.55);
      e.jamAt=Math.max(e.jamAt,this.elapsed+4.5);
    }else if(el==='wind'&&aura&&aura!=='wind'){
      reaction='swirl';
      const spreadDmg=Math.round(dmg*.65);
      for(const other of this.enemies){
        if(other.id!==e.id&&other.hp>0&&other.lane===e.lane&&Math.abs(other.x-e.x)<=1.45){
          other.aura=aura;other.auraUntil=this.elapsed+4.5;
          if(aura==='water')other.wetUntil=Math.max(other.wetUntil,this.elapsed+4.5);
          this.dealRawDamage(other,t,'wind',spreadDmg,'swirl');
        }
      }
    }else if(el==='dark'&&(aura==='water'||aura==='thunder')){
      e.vulnUntil=Math.max(e.vulnUntil,this.elapsed+5);
      reaction='corrode';
    }else if(el==='physical'&&aura){
      dmg*=1.3;reaction='shatter';
    }
    if(reaction){
      this.reactions++;
      if(this.enhanced&&!isSupport)this.resonance=Math.min(100,this.resonance+4.5);
    }
    if(el!=='physical'&&el!=='wind'&&(!reaction||reaction==='corrode')){
      e.aura=el;e.auraUntil=this.elapsed+5.5;
    }
    this.dealRawDamage(e,t,el,dmg,reaction);
  }
  private shoot(t:DefenseTower){
    const origin=t.col+.5;
    const laneTargets=this.enemies.filter(e=>e.hp>0&&e.lane===t.lane&&e.x>=origin-.18&&(t.kind!=='physical'||e.x<=origin+1.02))
      .sort((a,b)=>a.x-b.x||a.id-b.id);
    const lead=laneTargets[0];
    if(!lead)return false;
    const dmg=this.towerDamage(t);
    const bolt=this.fx('shot',t.kind,t.lane,lead.x,origin,t.lane,.36);
    bolt.targetId=lead.id;
    if(!this.enhanced){
      // Exact legacy rules so baseline tests stay bit-identical.
      const card=DEFENSE_CARDS[t.kind];
      if(t.kind==='water'){lead.slowUntil=this.elapsed+2.8;lead.wetUntil=this.elapsed+5.5;}
      if(t.kind==='fire'){
        const blast=laneTargets.filter(e=>Math.abs(e.x-lead.x)<=.86);
        for(const e of blast){const wet=e.wetUntil>this.elapsed;if(wet)e.wetUntil=0;this.dealRawDamage(e,t,'fire',card.damage*(wet?1.65:1),wet?'vaporize':undefined);}
      }else if(t.kind==='thunder'){
        const wet=lead.wetUntil>this.elapsed;
        const chain=this.enemies.filter(e=>e.hp>0&&Math.abs(e.lane-t.lane)===1&&Math.abs(e.x-lead.x)<(wet?3.1:2.15))
          .sort((a,b)=>Math.abs(a.x-lead.x)-Math.abs(b.x-lead.x)||a.x-b.x).slice(0,wet?2:1);
        this.dealRawDamage(lead,t,'thunder',card.damage);
        for(const e of chain){
          this.fx('shot','thunder',e.lane,e.x,lead.x,lead.lane,.39).reaction='chain';
          this.dealRawDamage(e,t,'thunder',card.damage*.76,'chain');
        }
      }else if(t.kind==='dark'){
        t.focus=t.targetId===lead.id?Math.min(4,t.focus+1):0;t.targetId=lead.id;
        this.dealRawDamage(lead,t,'dark',card.damage+t.focus*2,t.focus?'focus':undefined);
      }else{
        const push=t.kind==='wind'&&(lead.kind==='noise'||lead.shadow);
        if(push)lead.x=Math.min(spawnX,lead.x+.28);
        this.dealRawDamage(lead,t,t.kind as ElementKind,card.damage,push?'push':undefined);
      }
      return true;
    }

    // Enhanced rules with Lv.1-3 evolutions & 6-element reactions
    if(t.kind==='water'){
      const hits=t.level===3?laneTargets.slice(0,2):[lead];
      for(const e of hits){
        e.slowUntil=Math.max(e.slowUntil,this.elapsed+(t.level===3?3.4:2.8));
        e.wetUntil=Math.max(e.wetUntil,this.elapsed+5.8);
        this.applyElementHit(e,t,'water',e===lead?dmg:dmg*.75);
      }
    }else if(t.kind==='fire'){
      const radius=t.level===3?1.15:.90;
      const blast=laneTargets.filter(e=>Math.abs(e.x-lead.x)<=radius);
      for(const e of blast)this.applyElementHit(e,t,'fire',dmg);
      if(t.level===3)this.burns.push({lane:t.lane,x:lead.x,life:3.0,dps:10});
    }else if(t.kind==='thunder'){
      const wet=lead.wetUntil>this.elapsed;
      const maxJump=t.level===3?(wet?3:2):(wet?2:1);
      const chain=this.enemies.filter(e=>e.hp>0&&e.id!==lead.id&&Math.abs(e.lane-t.lane)<=1&&Math.abs(e.x-lead.x)<(wet?3.3:2.25))
        .sort((a,b)=>Math.abs(a.x-lead.x)-Math.abs(b.x-lead.x)||a.x-b.x).slice(0,maxJump);
      this.applyElementHit(lead,t,'thunder',dmg);
      if(wet)lead.stunUntil=Math.max(lead.stunUntil,this.elapsed+(t.level===3?.6:.4));
      for(const e of chain){
        this.fx('shot','thunder',e.lane,e.x,lead.x,lead.lane,.39).reaction='chain';
        this.dealRawDamage(e,t,'thunder',dmg*.78,'chain');
        if(wet)e.stunUntil=Math.max(e.stunUntil,this.elapsed+.35);
      }
    }else if(t.kind==='dark'){
      t.focus=t.targetId===lead.id?Math.min(5,t.focus+1):0;t.targetId=lead.id;
      const bonus=t.focus*(t.level===3?4:2.5);
      const targets=t.level===3?laneTargets.slice(0,3):[lead];
      for(const e of targets)this.applyElementHit(e,t,'dark',dmg+bonus);
    }else if(t.kind==='wind'){
      const canPush=lead.kind==='noise'||lead.shadow||(t.level>=2&&lead.kind==='echo');
      if(canPush)lead.x=Math.min(spawnX,lead.x+(t.level===3?.55:.30));
      const hadAura=this.activeAura(lead);
      this.applyElementHit(lead,t,'wind',dmg);
      if(canPush&&!hadAura)this.fx('hit','wind',lead.lane,lead.x,lead.x,lead.lane,.28).reaction='push';
    }else if(t.kind==='physical'){
      this.applyElementHit(lead,t,'physical',dmg);
    }
    return true;
  }
  private dealRawDamage(e:DefenseEnemy,t:DefenseTower|null,el:ElementKind,raw:number,reaction?:ReactionTag){
    if(e.hp<=0)return;
    const vuln=e.vulnUntil>this.elapsed?1.25:1;
    let amount=Math.max(1,Math.round(raw*vuln));
    if(e.shield>0){
      const shieldMult=reaction==='shatter'||reaction==='overload'?2.2:el==='physical'?1.65:el==='dark'&&t?.level===3?1.5:1;
      const pierce=el==='dark'&&t?.level===3?Math.round(amount*.45):0;
      const absorbed=Math.min(e.shield,Math.round(amount*shieldMult));
      e.shield=Math.max(0,e.shield-absorbed);
      if(e.shield===0){
        this.fx('shieldBreak',el,e.lane,e.x,e.x,e.lane,.55);
        if(this.enhanced)this.resonance=Math.min(100,this.resonance+8);
      }
      amount=pierce;
    }
    const fx=this.fx('hit',el,e.lane,e.x,e.x,e.lane,.32);
    fx.reaction=reaction;fx.amount=amount>0?amount:Math.round(raw);fx.targetId=e.id;
    if(amount>0){
      e.hp=Math.max(0,e.hp-amount);
      if(t)t.totalDamage+=amount;
    }
    if(e.kind==='echo'&&!e.split){
      e.split=true;this.spawn('echo',e.lane,Math.min(spawnX,e.x+.33),true);
      this.fx('split',null,e.lane,e.x,e.x,e.lane,.55);
    }
    if(e.hp===0){
      this.kills++;
      const bounty=e.kind==='boss'?60:e.kind==='shield'?10:e.shadow?1:3;
      this.dew+=bounty;
      if(this.enhanced){
        this.resonance=Math.min(100,this.resonance+(e.kind==='boss'?40:e.kind==='shield'?12:5));
        if(e.kind==='shield'||e.kind==='detune'){
          this.drops.push({id:++this.serial,lane:e.lane,x:Math.min(7.7,e.x),amount:10,life:9,maxLife:9});
        }
      }
    }
  }
}
