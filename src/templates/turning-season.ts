import type {WorkshopKind} from '../../content/turning-season';
export type Spot = readonly [number,number];
export const latch:Spot=[-3.45,1.8], outlet:Spot=[3.1,1.5];
const shadowMarks:Spot[]=[[-1.45,-.55],[1.5,.85]];
const teaRims:Spot[]=[[-2.8,.1],[2.8,.1],[-2.8,.1]];
const windows:Spot[]=[[-2.35,-.25],[.15,-.95],[2.55,-.35]];
export const nearSpot=(x:number,z:number,p:Spot,r=.8)=>Math.hypot(x-p[0],z-p[1])<r;
const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));

/** All machines keep their last successful stop after a missed operation. */
export class Workshop {
  step=0; errors=0; progress=0; finishTime=0; pinned=false; cold=0; hot=0; dx=-2; dz=1;
  hint=''; hintTime=0; time=0; tilt=0;teaEdges=0;
  constructor(readonly kind:WorkshopKind){}
  get finishing(){return this.step===5;}
  get done(){return this.finishTime>=2.45;}
  get needsPin(){return this.kind!=='tea';}
  get target():Spot {
    if(this.step===0&&this.needsPin)return latch;
    switch(this.kind){
      case 'shadow':return shadowMarks[Math.min(1,Math.max(0,this.step-1))];
      case 'spring':return this.cold<2?[-1.95,-.3]:this.hot<1?[1.95,-.3]:outlet;
      case 'tea':return this.step===0?[0,1.1]:this.step>=4?[0,-.65]:teaRims[this.step-1];
      case 'dove':return this.step>=4?outlet:windows[Math.max(0,this.step-1)];
      case 'press':return this.step===1?[-1.9,-.3]:this.step===2?[1.85,-.3]:this.step===3?[-3,1.05]:outlet;
    }
  }
  message(value:string,miss=false){this.hint=value;this.hintTime=2;if(miss)this.errors++;}
  tick(dt:number,x:number,z:number,pinned:boolean,airborne:boolean){
    this.time+=dt;this.hintTime=Math.max(0,this.hintTime-dt);this.pinned=pinned;
    if(this.finishing){this.finishTime+=dt;return;}
    if(this.step===0&&this.needsPin&&pinned){this.step=1;return;}
    if(this.needsPin&&!pinned)return;
    if(this.kind==='tea'&&this.step>0&&Math.abs(z-.1)<.65&&Math.abs(x)>2.65)this.teaEdges|=x<0?1:2;
    if(this.kind==='tea'&&this.step>0&&this.step<4){
      this.tilt=clamp(x/3,-1,1);
      if(nearSpot(x,z,this.target)){this.step++;this.progress=0;}
    }else if(this.kind==='tea'&&this.step===4&&airborne&&nearSpot(x,z,this.target,1.15)){this.step=5;}
    else if(this.kind==='dove'&&this.step>0&&this.step<4){
      if(nearSpot(x,z,this.target,1))this.progress=clamp(this.progress+dt,0,1);
      else if(this.progress>.08){this.progress=0;this.errors++;this.message('纸鸽还在上一扇窗边，回来等它停稳。');}
      if(this.progress>=1){this.progress=0;this.step++;}
    }else if(this.kind==='press'&&this.step===4&&Math.abs(z-1.05)<.87){
      const lead=clamp((x+3)/6,0,1);
      if(lead-this.progress<.18)this.progress=Math.max(this.progress,lead);
      if(this.progress>.96)this.step=5;
    }
  }
  operate(x:number,z:number){
    if(this.finishing)return;
    if(this.needsPin&&!this.pinned){this.message('先让分身守住左前方铜座。');return;}
    switch(this.kind){
      case 'shadow':
        if(nearSpot(x,z,this.target,.7)){if(this.step===2)this.step=5;else this.step++;}
        else this.message('马影偏开了。左右移动调位置，前后移动调大小。',true);
        break;
      case 'spring':
        if(nearSpot(x,z,[-1.95,-.3]))this.cold=(this.cold+1)%4;
        else if(nearSpot(x,z,[1.95,-.3]))this.hot=(this.hot+1)%4;
        else if(nearSpot(x,z,outlet)){
          if(this.cold===2&&this.hot===1)this.step=5;
          else this.message('接水碗的三道刻纹要分给两股水：蓝槽两格，琥珀槽一格。',true);
        }else this.message('走近蓝色或琥珀色槽柄。每拨一次进一格，末格回零。');
        break;
      case 'tea':
        if(this.step===0&&nearSpot(x,z,this.target,1.1))this.step=1;
        else this.message(this.step===4?'走到收青篓旁弹跳，把叶片翻进篓。':'靠身体的重量踩动竹匾，两边轮流。');
        break;
      case 'dove':
        if(this.step===4&&nearSpot(x,z,outlet,1.1))this.step=5;
        else this.message('让纸鸽在亮起的窗下歇一会，再去下一扇窗。');
        break;
      case 'press':
        if(this.step===1&&nearSpot(x,z,this.target)){this.dx++;if(this.dx===0)this.step++;}
        else if(this.step===2&&nearSpot(x,z,this.target)){this.dz--;if(this.dz===0)this.step++;}
        else if(this.step===3&&nearSpot(x,z,this.target)){this.step=4;this.progress=0;}
        else this.message(this.step===4?'贴着铜轨向右，滚筒会跟着你。':'靠近标亮的对位规或辊道左端。',true);
        break;
    }
  }
  get objective():[string,string] {
    if(this.finishing)return ['留在这里看一会','这次操作已经收进纪念品。'];
    if(this.step===0&&this.needsPin)return ['让分身留守铜座','靠近左前方金圈，按 G 投分身。点地面或用 WASD 移动。'];
    if(this.needsPin&&!this.pinned)return ['铜座松开了','回到铜座附近按 G 重新压住，已完成的步骤保留。'];
    switch(this.kind){
      case 'shadow':return ['第'+this.step+'幅影样','跟着金色脚印移动，幕上的马影和浅色轮廓重合后按 F。'];
      case 'spring':return ['蓝槽 '+this.cold+'/2　琥珀槽 '+this.hot+'/1','在两只槽柄旁按 F 调节。流量合适后，去右前方开池闸。'];
      case 'tea':return this.step===0?['拨拢一匾茶青','走到匾心前沿按 F 拨拢叶片。']:this.step===4?['把叶片翻进收青篓','走到匾后金圈，按空格弹跳。']:['压动竹匾　'+(this.step-1)+'/3','踩上金色匾缘，看叶片翻到另一侧，再跟过去。'];
      case 'dove':return this.step===4?['打开尽头的天空之窗','到右前方窗闩按 F，送纸鸽离开。']:['陪纸鸽停在第'+this.step+'扇窗','走到亮窗下停一下，等纸鸽跟上你。'];
      case 'press':return this.step===4?['沿轨道滚出桥景　'+Math.round(this.progress*100)+'%','从左向右贴着铜色辊道走。']:this.step===3?['抬起压辊','走到辊道左端按 F。']:['对齐'+(this.step===1?'横':'纵')+'向十字规','走近亮起的铜规按 F 微调，直到两色套准。'];
    }
  }
}
