import type {Vec} from '../slime/types';
import {ArenaEncounter,type RpgDayConfig} from './january-rpg';

const voyages={
  '1202':{name:'红砂上的第一声',routes:['借风跃过','压稳舱瓣'],legs:['靠风的一瓣','背风的一瓣','天线底座'],start:'红砂会从风口掠过。先压住迎风端，再到相对的一侧趁风歇展开舱瓣。',verb:'展开',end:'竖起发信天线'},
  '1203':{name:'木星从镜头下经过',routes:['短曝快扫','长曝慢扫'],legs:['极区薄雾','赤道亮带','风暴眼'],start:'从探头的一侧扫到另一侧。看地上的显影条逐段变亮，三次扫描将拼成木星。',verb:'曝光',end:'叠合三张底片'},
  '1204':{name:'对接口的白色刻度',routes:['弹起锁销','摊开锁环'],legs:['导向环','密封环','舷窗口'],start:'到手轮边观察舱体摆动。两根指针接近时刹停手轮，再到插座一端锁合。',verb:'锁合',end:'接通舱间灯'},
  '1205':{name:'听冰纹的人',routes:['借势破冰','压艏开冰'],legs:['岸冰','浮冰带','外海冰缘'],start:'在探冰标旁敲响冰面。留意哪边的冰裂开，去那一侧带船经过。',verb:'探冰',end:'引船入海'},
  '1206':{name:'吊索尽头的铝尖',routes:['跳扣棘爪','压索固定'],legs:['卷扬鼓','横臂导轮','塔顶座'],start:'绕着地上的卷扬鼓转，吊冠会跟着上升。收够绳长，再到导轮一侧锁住。',verb:'扣紧',end:'为方尖碑落冠'},
} as const;
export type VoyageDay=keyof typeof voyages;
export const isVoyageDay=(day:string):day is VoyageDay=>Object.hasOwn(voyages,day);
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
type Body={guard:boolean;airborne:boolean;dashing:boolean};
export class Voyage extends ArenaEncounter{
  readonly design:typeof voyages[VoyageDay];
  private readonly voyageRules:RpgDayConfig;
  engaged=false;
  fill=0;
  elapsed=0;
  private previousAngle:number|null=null;
  private woundAngle=0;
  constructor(readonly day:VoyageDay,seed:string,config:RpgDayConfig){
    super(config.arena,seed,config);
    this.design=voyages[day];
    this.voyageRules={...config,routes:this.design.routes,verb:this.design.verb,ending:this.design.end,rounds:3};
    this.layout.branches[1][1]=0;
  }
  override get rules(){return this.voyageRules;}
  get title(){return this.design.legs[Math.min(2,this.round)];}
  get opening(){return this.design.start;}
  override get z(){return .1-this.round*3.05;}
  get side(){return this.initialSide*(this.round%2?-1:1);}
  get wind(){return .5+.5*Math.sin(this.elapsed*1.3+this.side);}
  get source():Vec{return [this.day==='1206'?0:-2.65*this.side,0,this.z+.65];}
  override get safeSpot():Vec{return [2.65*this.side,0,this.z];}
  get nextSpot():Vec{return this.engaged?this.safeSpot:this.source;}
  get hint(){
    if(!this.engaged)switch(this.day){
      case '1202':return '走到风标脚下摊开。铜环蓄满，再按 J 压住迎风端。';
      case '1203':return '到这条纬带的起点按 J 打开快门。';
      case '1204':return '手轮上白针摆到金色刻线附近时按 J 刹住。';
      case '1205':return '在黑白探冰标旁按 J 敲冰，顺裂开的蓝缝找到出口。';
      case '1206':return '离鼓心约一步，绕着卷扬鼓走半圈。铜环蓄满后按 J 挂绳。';
    }
    switch(this.day){
      case '1202':return '到另一侧，看风带垂下。'+(this.route<0?'弹起时按 J 放开舱瓣。':'摊开并按 J 放开舱瓣。');
      case '1203':return '沿地面光带横穿到另一端'+(this.route>0?'，摊开身体连续曝光。':'，收身快速扫过。')+'光带显影后按 J 收片。';
      case '1204':return '舱体已经停稳，到对侧亮着的插座'+(this.route<0?'弹起扣销':'摊开压锁环')+'，按 J。';
      case '1205':return '冰缝朝'+(this.side<0?'左':'右')+'打开。沿蓝缝到出口'+(this.route<0?'闪避借势':'摊开压艏')+'，按 J 开航。';
      case '1206':return '铝冠已经升起，到亮着的导轮'+(this.route<0?'弹起扣爪':'摊开锁索')+'，按 J 固定高度。';
    }
  }
  override advance(dt:number,p:Vec,guard:boolean,_evading:boolean){
    if(this.phase!=='duel')return;
    this.elapsed+=dt;
    const [sx,,sz]=this.source;
    if(this.day==='1202'&&!this.engaged)this.fill=clamp(this.fill+dt*(guard&&this.near(p,this.source,1.5)?1.6:-.4));
    if(this.day==='1203'&&this.engaged){
      const progress=clamp((p[0]-sx)/(this.safeSpot[0]-sx));
      if(Math.abs(p[2]-this.z)<1.5&&(this.route<0||guard)&&progress<this.fill+.28)this.fill=Math.max(this.fill,progress);
    }
    if(this.day==='1206'&&!this.engaged){
      const dx=p[0]-sx,dz=p[2]-sz,r=Math.hypot(dx,dz);
      if(r>=.5&&r<=2.55){
        const angle=Math.atan2(dz,dx);
        if(this.previousAngle!==null){
          const d=angle-this.previousAngle;
          this.woundAngle+=Math.atan2(Math.sin(d),Math.cos(d));
          this.fill=clamp(Math.abs(this.woundAngle)/Math.PI);
        }
        this.previousAngle=angle;
      }else this.previousAngle=null;
    }
    this.clock=this.day==='1204'||(this.day==='1202'&&this.engaged)?this.wind:this.fill;
  }
  private miss(message:string){this.message=message;this.errors++;if(--this.health<=0)this.phase='lost';return false;}
  override strike(p:Vec,body:Body){
    if(this.phase!=='duel')return false;
    if(!this.engaged){
      if(!this.near(p,this.source,this.day==='1206'?2.6:1.55))return this.miss('还没碰到机件。沿金色标记靠近再试。');
      if((this.day==='1206'||this.day==='1202')&&this.fill<.88)return this.miss(this.hint);
      if(this.day==='1204'&&this.wind>.48)return this.miss('白针越过刻线了。等它摆回来。');
      this.engaged=true;this.fill=0;this.message=this.hint;return false;
    }
    const [x,,z]=this.safeSpot;
    if(Math.hypot(p[0]-x,p[2]-z)>1.5)return this.miss(this.hint);
    if(this.day==='1203'){
      if(this.fill<.88)return this.miss('底片还有留白。沿亮带退到缺口，接着向前扫。');
    }else{
      if(this.day==='1202'&&this.wind>.58)return this.miss('风带仍在扬起，等它落下再展开。');
      if(!(this.route>0?body.guard:this.day==='1205'?body.dashing:body.airborne))return this.miss(this.hint);
    }
    this.round++;this.health=3;this.engaged=false;this.fill=0;this.previousAngle=null;this.woundAngle=0;
    if(this.round===3)this.phase='finale';
    this.message=this.round===3?this.design.end:this.title;return true;
  }
}
