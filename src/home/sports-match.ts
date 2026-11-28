import {trainingFactors,type Athlete,type Sport} from '../life/sports';

type Team=0|1;
type Point={x:number;z:number};
export interface SportInput {dx:number;dz:number;held:boolean}
export interface Competitor extends Point {
  athlete:Athlete;team:Team;slot:number;energy:number;boost:number;cool:number;lift:number;
  distance:number;split:number;finish:number;wet:boolean;moving:boolean;blocking:number;
}
interface Flight {from:Point;to:Point;height:number;endY:number;startY:number;duration:number;age:number;kind:'pass'|'shot'|'rally'|'bounce';hitter:number;serve:boolean}
const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const opp=(t:Team):Team=>t===0?1:0;
const side=(t:Team)=>t===0?1:-1;
export class SportsMatch {
  players:Competitor[];score:[number,number]=[0,0];ball={x:0,y:.35,z:0};owner=0;
  time=0;message='准备开球';rank=0;passes=0;winners=0;touches=0;rallyHits=0;longestRally=0;
  flight:Flight|null=null;waiting=.65;server:Team=0;fault=false;cleared=true;
  swimStarted=false;stroke=0;splash:number[]=[];lastAim={x:1,z:0};lastHit=0;
  private decision=0;private passed=-1;private serveFlight=false;
  readonly net:boolean;readonly length:number;readonly width:number;
  constructor(readonly sport:Sport,team:Athlete[],others:Athlete[],private random= Math.random){
    this.players=[...team,...others].map((athlete,i)=>({athlete,team:i<team.length?0:1,slot:i<team.length?i:i-team.length,x:0,z:0,energy:1,boost:0,cool:0,lift:0,distance:0,split:0,finish:0,wet:false,moving:false,blocking:0}));
    this.net=sport==='tennis'||sport==='badminton';
    this.length=sport==='tennis'?11.885:sport==='badminton'?6.7:sport==='football'?52.5:14;
    this.width=sport==='tennis'?4.115:sport==='badminton'?(team.length>1?3.05:2.59):sport==='football'?34:7.5;
    this.players.forEach((p,i)=>{
      if(sport==='swim'){p.x=-13.05;p.z=[-1.25,1.25,-3.75,3.75,-6.25,6.25][i];}
      else if(this.net){p.x=-side(p.team)*this.length*.77;p.z=team.length===1?0:(p.slot===0?-1:1)*this.width*.57;}
      else if(sport==='football'){p.x=-side(p.team)*[10,15,13,8,49][p.slot];p.z=[0,-13,14,7,0][p.slot];}
      else {p.x=[3,8,7][p.slot]+p.team*2;p.z=[0,-4,4][p.slot]+p.team*.8;}
    });
    if(this.net)this.prepareServe();
    if(sport==='football')this.kickoff(0);
    if(sport==='basketball')this.take(0);
    if(sport==='swim'){this.owner=-1;this.message='发令后按空格跃入，F 划水';}
    this.trackOwner();
  }
  private trackOwner(){if(this.owner>=0){const p=this.players[this.owner];this.ball={x:p.x,y:this.net?.92:this.sport==='basketball'?.48+.32*Math.abs(Math.sin(this.time*9)):.17,z:p.z};}}
  private kickoff(team:Team){
    this.players.forEach(p=>{p.x=-side(p.team)*[10,15,13,8,49][p.slot];p.z=[0,-13,14,7,0][p.slot];});
    const i=this.players.findIndex(p=>p.team===team&&p.slot===0);this.players[i].x=0;this.take(i);
  }
  private move(p:Competitor,target:Point,speed:number,dt:number){
    const dx=target.x-p.x,dz=target.z-p.z,len=Math.hypot(dx,dz);
    if(!len)return;
    const f=trainingFactors(p.athlete.rating),step=Math.min(len,speed*f.speed*(.76+.24*p.energy)*(1+.035*(p.athlete.traits[0]-3))*dt);
    p.x+=dx/len*step;p.z+=dz/len*step;
    p.moving=step>dt*.65;
    if(this.net)p.x=p.team===0?Math.min(-.28,p.x):Math.max(.28,p.x);
    p.x=clamp(p.x,this.sport==='basketball'?-.6:-this.length-1,this.length+1);
    p.z=clamp(p.z,-this.width-.8,this.width+.8);
  }
  private launch(i:number,to:Point,kind:Flight['kind'],duration:number,height:number,endY=0,serve=false){
    const p=this.players[i];
    this.owner=-1;this.lastHit=i;this.passed=kind==='pass'?i:-1;
    this.flight={from:{x:p.x,z:p.z},to:{...to},kind,duration,height,startY:this.net?1.05:kind==='shot'&&this.sport==='basketball'?1.55:.31,endY,age:0,hitter:i,serve};
    this.ball={x:p.x,y:this.flight.startY,z:p.z};p.cool=.32;this.touches++;
    if(kind==='rally')this.longestRally=Math.max(this.longestRally,++this.rallyHits);
  }
  private take(i:number){
    const was=this.players[this.lastHit].team,p=this.players[i];
    if(this.sport==='basketball'&&was!==p.team)this.cleared=false;
    if(this.passed>=0&&i!==this.passed&&this.players[this.passed].team===p.team&&p.team===0)this.passes++;
    this.passed=-1;this.owner=i;this.flight=null;this.lastHit=i;this.decision=.32;
    p.cool=.65;this.trackOwner();
  }
  private prepareServe(){
    this.rallyHits=0;
    const doubles=this.sport==='badminton'&&this.players.length===4;
    const turn=this.sport==='tennis'?this.score[0]+this.score[1]:this.score[this.server];
    const sign=side(this.server),zsign=turn%2?-sign:sign;
    const serving=this.players.filter(p=>p.team===this.server);
    const p=serving[doubles?Math.floor(this.score[this.server]/2)%2:0];
    p.x=-sign*(this.sport==='tennis'?this.length+.18:3.2);p.z=zsign*this.width*.52;
    this.players.filter(q=>q!==p).forEach(q=>{
      q.x=-side(q.team)*this.length*.73;
      q.z=q.team===this.server?p.z*-1:q.slot===0?-p.z:p.z;
    });
    this.owner=this.players.indexOf(p);this.lastHit=this.owner;this.flight=null;this.serveFlight=true;
    this.message=(this.server===0?'我方':'对方')+'发球 · 对角发入发球区';this.decision=.65;this.trackOwner();
  }
  private point(team:Team,value=1){
    this.score[team]+=value;this.flight=null;this.passed=-1;
    const [a,b]=this.score,hi=Math.max(a,b);
    const won=this.sport==='football'?this.time>=180&&a!==b:this.sport==='basketball'?hi>=11:
      this.sport==='tennis'?hi>=7&&Math.abs(a-b)>=2:hi===15||hi>=11&&Math.abs(a-b)>=2;
    this.message=(team===0?'我方':'对方')+'得分';if(won){this.rank=a>b?1:2;return;}
    this.waiting=.75;
    if(this.net){
      this.server=this.sport==='tennis'?(Math.floor((a+b+1)/2)%2 as Team):team;
      this.fault=false;this.prepareServe();
    }else if(this.sport==='football')this.kickoff(opp(team));
    else{
      const t=opp(team),i=this.players.findIndex(p=>p.team===t&&p.slot===0);
      this.players[i].x=3;this.players[i].z=0;this.take(i);this.cleared=true;
    }
  }
  private failedRally(f:Flight){
    if(f.serve&&this.sport==='tennis'&&!this.fault){
      this.fault=true;this.prepareServe();this.message='一发失误 · 再发一次';this.waiting=.5;
    }else this.point(opp(this.players[f.hitter].team));
  }
  private racket(i:number,alt:boolean,aim:number,charge=.38){
    const p=this.players[i],f=this.flight,serving=this.serveFlight&&this.owner===i;
    if(!serving&&f?.serve&&this.sport==='tennis')return;
    if(!serving && (!f||p.team===this.players[f.hitter].team||dist(p,this.ball)>1.55*trainingFactors(p.athlete.rating).window||this.ball.y>3.15))return;
    if(!serving&&(p.cool>0||this.ball.x*side(p.team)>0))return;
    const reach=serving?0:dist(p,this.ball);
    // One swing commits the racket. A stretched or tired animal may swing late.
    if(i&&!serving&&this.random()<.02+(1-p.energy)*.12+reach*.055+(90-p.athlete.rating)*.0013){
      p.cool=.85;p.lift=.18;return;
    }
    const sign=side(p.team),acf=trainingFactors(p.athlete.rating);
    const miss=(this.random()-.5)*(i===0?.75:1.5)*(1.3-p.athlete.traits[4]*.11)/acf.window;
    const short=alt&&!serving&&this.sport==='badminton'&&Math.abs(p.x)<2.8;
    const targetX=serving?(this.sport==='tennis'?4.5:4.4):short?1.25:this.length*(alt?.82:.72);
    const targetZ=serving?-Math.sign(p.z)*this.width*.50+aim*this.width*.30:aim*this.width*.99+miss;
    const to={x:sign*(targetX+miss),z:targetZ};
    const duration=dist(p,to)/(this.sport==='tennis'?11.6:9.4)*(alt&&this.sport==='tennis'?1.25:1);
    const speed=1+.55*clamp(charge,0,1)+(alt&&!short&&this.sport==='badminton'?.32:0);
    this.launch(i,to,'rally',Math.max(.45,duration/speed)/(acf.power**.3),this.sport==='badminton'?(short?1.9:alt?2.15:3.1):(alt?3.6:1.65),0,serving);
    this.serveFlight=false;this.message='观察落点 · 移动回击';
  }
  private restart(i:number,x:number,z:number,label:string){
    this.players[i].x=x;this.players[i].z=z;this.take(i);this.waiting=.5;this.message=label;
  }
  private boundary(){
    const {x,z,y}=this.ball,last=this.players[this.lastHit],goal=this.sport==='football';
    if(Math.abs(x)<=this.length+.11&&Math.abs(z)<=this.width+.11&&(goal||x>=0))return false;
    let team=opp(last.team),label='边线球';
    let nx=clamp(x,goal?-this.length:0,this.length),nz=clamp(z,-this.width,this.width);
    if(goal&&Math.abs(x)>this.length){
      if(Math.abs(z)<3.55&&y<2.37){this.point(x>0?0:1);return true;}
      const defending=x>0?1:0;
      if(team===defending){label='球门球';nx=Math.sign(x)*(this.length-5);nz=0;}
      else{label='角球';nz=Math.sign(z||1)*this.width;}
    }
    const i=this.players.findIndex(p=>p.team===team&&p.slot===(label==='球门球'?4:0));
    this.restart(i,nx*.997,nz*.997,label+' · '+(team===0?'我方':'对方')+'开球');return true;
  }
  private ballAction(i:number,charge:number,aimZ:number,aimX:number){
    const p=this.players[i],goal=this.sport==='football',sign=goal?side(p.team):1;
    if(charge<.18){
      const peers=this.players.map((q,j)=>({q,j})).filter(({q,j})=>q.team===p.team&&j!==i);
      const score=(q:Competitor)=>((q.x-p.x)*aimX+(q.z-p.z)*aimZ)/Math.max(.1,dist(p,q))-.007*dist(p,q);
      peers.sort((a,b)=>score(b.q)-score(a.q));
      if(peers[0]){const q=peers[0].q;this.launch(i,q,'pass',Math.max(.32,dist(p,q)/(goal?20:11)),goal?.15:1.05);}
      return;
    }
    if(!goal&&!this.cleared){this.message='先将球带出弧线';return;}
    const factor=trainingFactors(p.athlete.rating);
    const power=factor.power*(1+.045*(p.athlete.traits[2]-3)),range=goal?9+39*Math.min(1,charge)*power:5+9*Math.min(1,charge)*power;
    const basket={x:12.425,z:0},target=goal?{x:sign*(this.length+1),z:aimZ*4}:basket;
    const distance=dist(p,target),ratio=Math.min(1,range/Math.max(.01,distance));
    const off=goal?(.9-Math.min(.9,charge))*3:Math.max(0,Math.abs(charge-.7)-.16*factor.window)*4;
    const error=(this.random()-.5)*(goal?1.6:.42)/(factor.window*(.75+.085*p.athlete.traits[4]));
    const to={x:p.x+(target.x-p.x)*ratio,z:p.z+(target.z-p.z)*ratio+error+off};
    this.launch(i,to,'shot',Math.max(.55,dist(p,to)/(goal?23:8)),goal?.9:2.55,goal?.22:3.05);
    if(!goal)p.lift=.48;
  }
  action(charge:number,alt:boolean,input:SportInput){
    if(this.rank||this.waiting>0)return;
    const p=this.players[0];
    if(this.sport==='swim'){
      if(alt&&(!this.swimStarted||p.distance>=25&&!p.split)){
        this.swimStarted=true;p.boost=.95;p.wet=true;this.message='沿本泳道划水 · 到对岸触壁';
        if(p.distance>=25){p.split=this.time;this.splash.push(0);this.message='已蹬壁 · 游回出发端触壁';}
      }else if(!alt&&this.swimStarted){this.stroke=Math.min(1,this.stroke+.38);p.energy=Math.max(.18,p.energy-.025*trainingFactors(p.athlete.rating).fatigue);}
    }else if(this.net)this.racket(0,alt,input.dz,charge);
    else if(alt&&p.cool<=0){p.boost=.7;p.cool=1.3;p.lift=this.sport==='basketball'?.55:0;p.blocking=p.lift;}
    else if(!alt&&this.owner===0)this.ballAction(0,charge,input.dz||this.lastAim.z,input.dx||this.lastAim.x);
  }
  private swim(dt:number,input:SportInput){
    const p0=this.players[0];
    for(const [i,p] of this.players.entries()){
      if(p.finish||(!i&&!this.swimStarted))continue;
      if(!p.wet){p.wet=true;p.boost=.65;}
      if(p.distance===25&&!p.split){
        if(!i){this.message='已触壁 · 按空格蹬壁折返';continue;}
        p.cool+=dt;if(p.cool<.45-.035*p.athlete.traits[3])continue;
        p.split=this.time;p.boost=.65;this.splash.push(i);
      }
      const f=trainingFactors(p.athlete.rating);
      const pace=i?(.9+.035*p.athlete.traits[5]):input.held?.99+this.stroke*.20:.35+this.stroke*.93;
      const speed=2.5*f.speed*pace*(.78+.22*p.energy)+p.boost*f.power;
      p.energy=clamp(p.energy-dt*.018*f.fatigue*(1-.07*(p.athlete.traits[1]-3))+(i===0&&!input.held?dt*.015:0),.18,1);
      const next=Math.min(p.split?50:25,p.distance+dt*speed);
      if(p.distance<1.1&&next>=1.1)this.splash.push(i);
      if(next===50)p.finish=this.time-dt+(50-p.distance)/speed;
      p.x=-12.5+(next<=25?next:50-next);p.distance=next;
    }
    this.stroke=Math.max(0,this.stroke-dt*.70);
    if(p0.finish){this.rank=1+this.players.slice(1).filter(q=>q.finish>0&&q.finish<p0.finish).length;}
  }
  private advanceFlight(dt:number){
    const f=this.flight;if(!f)return;
    f.age+=dt;const u=Math.min(1,f.age/f.duration),lastX=this.ball.x;
    this.ball={x:f.from.x+(f.to.x-f.from.x)*u,z:f.from.z+(f.to.z-f.from.z)*u,y:f.startY*(1-u)+f.endY*u+4*f.height*u*(1-u)};
    if(this.net){
      if(lastX*this.ball.x<=0&&lastX!==this.ball.x&&this.ball.y<(this.sport==='tennis'?.92:1.53)){this.failedRally(f);return;}
      if(u<1)return;
      const p=this.players[f.hitter],outside=Math.abs(this.ball.x)>this.length||Math.abs(this.ball.z)>this.width;
      const wrongServe=f.serve&&(this.ball.z*f.from.z>=0 || (this.sport==='tennis'?Math.abs(this.ball.x)>6.4:
        Math.abs(this.ball.x)<1.98||this.players.length===4&&Math.abs(this.ball.x)>5.94));
      if(f.kind!=='bounce'&&(outside||wrongServe)){this.failedRally(f);return;}
      if(this.sport==='tennis'&&f.kind!=='bounce'){
        this.flight={...f,kind:'bounce',serve:false,age:0,startY:0,endY:0,duration:.76,height:.92,from:{...this.ball},to:{x:this.ball.x+side(p.team)*2,z:this.ball.z}};
      }else{
        if(p.team===0)this.winners++;
        this.point(p.team);
      }
      return;
    }
    if(this.boundary())return;
    const p=this.players[f.hitter],goal=this.sport==='football';
    if((goal||f.kind!=='shot'||this.ball.y<1.65)&&u>.14){
      const catcher=this.players.findIndex((q,i)=>i!==f.hitter&&dist(q,this.ball)<(goal&&q.slot===4?1.55:1.0)&&this.ball.y<(q.lift>0?2.8:goal&&q.slot===4?2.2:1.28));
      if(catcher>=0){this.take(catcher);return;}
    }else if(!goal&&this.ball.y<2.7&&u<.45){
      const block=this.players.findIndex(q=>q.team!==p.team&&q.blocking>0&&dist(q,this.ball)<1.3);
      if(block>=0){this.take(block);return;}
    }
    if(u<1)return;
    if(!goal&&f.kind==='shot'&&dist(this.ball,{x:12.425,z:0})<.32){
      this.point(p.team,dist(f.from,{x:12.425,z:0})>6.75||Math.abs(f.from.z)>6.6?2:1);return;
    }
    this.flight=null;this.ball.y=goal?.12:.2;
  }
  update(dt:number,input:SportInput){
    if(this.rank)return;
    if(this.waiting>0){this.waiting-=dt;return;}
    this.time+=dt;
    this.players.forEach(p=>{p.moving=false;p.cool=Math.max(0,p.cool-(this.sport==='swim'?0:dt));p.boost=Math.max(0,p.boost-dt);p.lift=Math.max(0,p.lift-dt);p.blocking=Math.max(0,p.blocking-dt);});
    if(this.sport==='swim'){this.swim(dt,input);return;}
    const me=this.players[0],goal=this.sport==='football';
    if(this.net&&this.owner===0){this.trackOwner();return;}
    if(input.dx||input.dz){
      this.lastAim={x:input.dx,z:input.dz};
      this.move(me,{x:me.x+input.dx,z:me.z+input.dz},(goal?8.6:5.1)*(me.boost>0?1.75:1),dt);
    }
    const holder=this.players[this.owner],target=this.flight?.to??this.ball;
    this.decision-=dt;
    const nearest=[0,1].map(t=>this.players.reduce((best,p,i)=>p.team!==t||goal&&p.slot===4?best:best<0||dist(p,target)<dist(this.players[best],target)?i:best,-1));
    for(let i=1;i<this.players.length;i++){
      const p=this.players[i],sign=side(p.team);
      if(this.net){
        if(this.owner===i){if(this.decision<=0)this.racket(i,false,(this.random()-.5)*1.35);continue;}
        if(this.owner>=0)continue;
        let dest:Point={x:-sign*this.length*.67,z:p.slot===0?-.4*this.width:.4*this.width};
        const receiving=this.flight&&this.players[this.flight.hitter].team!==p.team;
        if(receiving&&nearest[p.team]===i)dest=target;
        this.move(p,dest,4.3+.22*p.athlete.traits[3],dt);
        if(receiving&&this.ball.x*sign<0&&this.ball.y<2.15&&Math.abs(p.x-this.ball.x)<1.3&&(!this.flight!.serve||this.sport!=='tennis'))
          this.racket(i,this.random()<.17,(this.random()-.5)*2);
        continue;
      }
      const basket={x:12.425,z:0};
      let dest:Point={x:p.x,z:p.z};
      if(this.owner===i){
        dest=goal?{x:sign*this.length,z:0}:!this.cleared?{x:2,z:p.z}:{x:10.3,z:0};
        if(this.decision<=0){
          const shoot=goal?dist(p,dest)<24:this.cleared&&dist(p,basket)<7;
          if(shoot||this.random()<.30){
            this.ballAction(i,shoot?.65+this.random()*.3:0,(this.random()-.5)*1.6,goal?sign:1);
            this.decision=.75;
          }else this.decision=.5;
        }
      }else if(goal&&p.slot===4)dest={x:-sign*(this.length-1.2),z:clamp(this.ball.z,-3,3)};
      else if(nearest[p.team]===i&&(!holder||holder.team!==p.team))dest=this.ball;
      else if(holder?.team===p.team)dest={x:clamp(holder.x+sign*(goal?12:2.6),goal?-48:1,goal?48:12),z:clamp((p.slot%2?1:-1)*(goal?9:3.4)+holder.z*.4,-this.width,this.width)};
      else {const mark=this.players.filter(q=>q.team!==p.team)[p.slot];dest={x:mark.x-sign*(goal?2:1),z:mark.z};}
      this.move(p,dest,goal?7.7:4.4,dt);
      if(!goal&&p.cool===0&&p.team!==this.players[this.lastHit].team&&this.flight?.kind==='shot'&&this.flight.age>.055&&dist(p,this.ball)<1.45){
        p.cool=1.4;
        if(this.random()<.16+.055*p.athlete.traits[3])p.blocking=p.lift=.35;
      }
    }
    for(const p of this.players){
      const cost=p.boost>0?.24:p.moving?.016:0;
      p.energy=clamp(p.energy+dt*(cost?-cost*trainingFactors(p.athlete.rating).fatigue*(1.3-.1*p.athlete.traits[1]):.085),.15,1);
    }
    if(this.net){this.advanceFlight(dt);return;}
    if(this.owner>=0){
      const q=this.players[this.owner];this.trackOwner();
      if(!goal&&!this.cleared&&(dist(q,{x:12.425,z:0})>6.75||Math.abs(q.z)>6.6))this.cleared=true;
      if(!this.boundary()&&q.cool<=0){
        const thief=this.players.findIndex(p=>p.team!==q.team&&dist(p,q)<.92&&(p.boost>0||this.random()<dt*(.7+.16*p.athlete.traits[3])));
        if(thief>=0)this.take(thief);
      }
    }else if(this.flight)this.advanceFlight(dt);
    else {const i=this.players.findIndex(p=>dist(p,this.ball)<1.12);if(i>=0)this.take(i);}
    if(goal&&this.time>=180&&this.score[0]!==this.score[1])this.rank=this.score[0]>this.score[1]?1:2;
  }
}
