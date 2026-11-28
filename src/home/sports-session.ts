import * as T from 'three';
import {spawnPackModel,type SpawnedPackModel} from './model-pack';
import {disturbAnimalWater,disturbWater} from './water-waves';
import {SportsMatch,type SportInput} from './sports-match';
import type {Court} from './sports-park';
import type {LifeData} from '../life/state';
import type {SlimeCharacter} from '../slime/character';
import {entrants,reward,settleSport,sportHelp,sportsLog,sportsNames,trainingToday,traitNames,type Athlete} from '../life/sports';
import './sports.css';

interface Host{ctx:any;slime:SlimeCharacter;life:LifeData;save:()=>void;day:()=>string;splash:(x:number,z:number,level:number)=>void}
const btn=(title:string,act:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=title;b.onclick=act;return b;};
export class SportsSession {
  court:Court|null=null; match:SportsMatch|null=null; private choices:Athlete[]=[];
  private my:string[]=[];private them:string[]=[];private count=1;private doubles=false;
  private panel=document.createElement('section');private meter?:HTMLProgressElement;private board?:HTMLElement;private status?:HTMLElement;
  private group=new T.Group();private models:SpawnedPackModel[]=[];private ball:T.Mesh;private shadow:T.Mesh;
  private keys=new Set<string>();private held=false;private charge=0;private stick=[0,0];private locked=false;
  private help=false;private helpView=document.createElement('section');private intro=0;private id=0;private wave=0;
  private result:ReturnType<typeof settleSport>=null;private origin:[number,number,number]=[0,0,0];
  private eye=new T.Vector3();private look=new T.Vector3();private resultText='';private previousText='';
  private gear=new T.Group();private rackets:T.Group[]=[];
  private swimCap=new T.Mesh(new T.SphereGeometry(1,28,12,0,Math.PI*2,0,Math.PI*.37),
    new T.MeshStandardMaterial({color:0xe96a49,roughness:.57,side:T.DoubleSide}));
  constructor(private host:Host){
    this.panel.className='sports-panel';this.panel.hidden=true;document.body.append(this.panel);
    this.helpView.className='sports-panel sports-help';this.helpView.hidden=true;document.body.append(this.helpView);
    this.ball=new T.Mesh(new T.SphereGeometry(1,18,12),new T.MeshStandardMaterial({color:0xf6e4aa}));
    this.shadow=new T.Mesh(new T.RingGeometry(.14,.23,24),new T.MeshBasicMaterial({color:0x674722,transparent:true,opacity:.72,depthWrite:false}));
    this.shadow.rotation.x=-Math.PI/2;this.group.add(this.ball,this.shadow,this.gear,this.swimCap);host.ctx.scene.add(this.group);this.group.visible=false;
    window.addEventListener('keydown',e=>this.key(e,true),true);window.addEventListener('keyup',e=>this.key(e,false),true);
    window.addEventListener('blur',()=>this.resetInputs());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.resetInputs();});
  }
  get active(){return this.court!==null;}
  open(c:Court){
    if(this.active)return;
    this.court=c;this.result=null;this.previousText='';this.resultText='';this.choices=entrants(this.host.life,c.sport);
    this.count=Math.min(5,this.choices.length);this.doubles=false;this.my=[];this.them=[];
    const s=this.host.slime;this.origin=[...s.position];this.locked=s.inputLock;s.inputLock=true;s.keys.clear();s.setMenuPointer('quickMenu',true);
    document.body.classList.add('sports-open');this.panel.hidden=false;this.lobby();
  }
  private title(label:string){
    const h=document.createElement('h2');h.textContent=label;this.panel.replaceChildren(h);
  }
  private paragraph(text:string){const p=document.createElement('p');p.textContent=text;this.panel.append(p);return p;}
  private controls(...bs:HTMLElement[]){const row=document.createElement('div');row.className='sport-actions';row.append(...bs);this.panel.append(row);}
  private fill(){
    const sport=this.court!.sport,team=sport==='football'?5:sport==='basketball'?3:sport==='badminton'&&this.doubles?2:1;
    const opponents=sport==='swim'?this.count:team;
    this.my.length=team-1;this.them.length=opponents;
    const used=new Set([...this.my,...this.them].filter(Boolean));
    for(const arr of [this.my,this.them])for(let i=0;i<arr.length;i++)if(!arr[i]){
      const next=this.choices.find(c=>!used.has(c.id))??this.choices[0];arr[i]=next.id;used.add(next.id);
    }
  }
  private lobby(){
    if(this.match){this.clearMatch();this.host.slime.releaseDeck();this.host.slime.teleport(this.origin);}
    this.fill();this.panel.className='sports-panel';const sport=this.court!.sport;
    this.title(sportsNames[sport]+' · 邀请比赛');
    const log=sportsLog(this.host.life);
    this.paragraph('史莱姆能力 '+log.ability+'　今日训练 '+trainingToday(log,this.host.day())+'/4　·　'+(sport==='swim'?'第 1–6 名：8 / 5 / 4 / 3 / 3 / 3 贝壳':'胜 '+reward(sport,1)+' / 负 '+reward(sport,2)+' 贝壳'));
    if(sport==='badminton')this.controls(btn(this.doubles?'双打 · 切换单打':'单打 · 切换双打',()=>{this.doubles=!this.doubles;this.lobby();}));
    if(sport==='swim'){
      const select=document.createElement('select');select.setAttribute('aria-label','对手人数');
      for(let n=1;n<=Math.min(5,this.choices.length);n++)select.add(new Option(n+' 位游泳对手',String(n),false,this.count===n));
      select.onchange=()=>{this.count=+select.value;this.lobby();};this.controls(select);
    }
    for(const [arr,title] of [[this.my,'我的队伍 · 史莱姆'],[this.them,'对手']] as const){
      const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=title;field.append(legend);
      arr.forEach((id,i)=>{
        const row=document.createElement('label'),sel=document.createElement('select');sel.setAttribute('aria-label',title+' '+(i+1));
        for(const c of this.choices)sel.add(new Option(c.name+' · '+c.rating,c.id,false,c.id===id));
        sel.onchange=()=>{
          for(const list of [this.my,this.them]){const other=list.indexOf(sel.value);if(other>=0)list[other]=id;}
          arr[i]=sel.value;this.lobby();
        };
        const c=this.choices.find(c=>c.id===id)!;
        const info=document.createElement('small');info.textContent=c.tip+' '+traitNames.map((t,j)=>t+c.traits[j]).join(' · ')+'（满分 5）';
        row.append(sel,info);field.append(row);
      });
      this.panel.append(field);
    }
    this.controls(btn('开始比赛',()=>this.start()),btn('重新配队',()=>{
      const shuffled=[...this.choices];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
      this.choices=shuffled;this.my=[];this.them=[];this.lobby();
    }),btn('F1 帮助',()=>this.toggleHelp()),btn('回场边',()=>this.stop()));
  }
  toggleHelp(){
    if(!this.court)return;
    this.resetInputs();this.help=!this.help;
    this.helpView.hidden=!this.help;this.panel.hidden=this.help;
    if(this.help){
      const h=document.createElement('h2');h.textContent=sportsNames[this.court.sport]+' · 比赛帮助';
      const p=document.createElement('p');p.textContent=sportHelp[this.court.sport];
      const tips=document.createElement('p');tips.textContent='WASD 或左侧摇杆移动，右侧按钮对应 F 和空格。完成比赛即可领贝壳，每天前四场无论输赢均提升能力。退出本场可回场边重新邀请。';
      this.helpView.replaceChildren(h,p,tips,btn('回到现场',()=>this.toggleHelp()));
    }
  }
  private start(){
    const c=this.court!;this.clearMatch();this.resetInputs();this.result=null;this.previousText=this.resultText;
    const log=sportsLog(this.host.life),me:Athlete={id:'player',name:'史莱姆',species:'slime',asset:'',size:.8,rating:log.ability,traits:[3,3,3,3,3,3],tip:''};
    const get=(id:string)=>this.choices.find(a=>a.id===id)!;
    this.match=new SportsMatch(c.sport,[me,...this.my.map(get)],this.them.map(get));this.id=log.matches+1;
    for(const p of this.match.players.slice(1)){
      const m=spawnPackModel(T,p.athlete.asset,Math.max(.65,Math.min(1.4,p.athlete.size)),{outline:false,castShadow:true});
      const ring=new T.Mesh(new T.RingGeometry(.44,.52,28),new T.MeshBasicMaterial({color:p.team===0?0x33bfc1:0xe98c53,side:T.DoubleSide}));
      ring.rotation.x=-Math.PI/2;ring.position.y=.035;m.group.add(ring);m.group.userData.sportRing=ring;
      this.group.add(m.group);this.models.push(m);
    }
    this.group.visible=true;this.ball.visible=this.shadow.visible=c.sport!=='swim';
    this.swimCap.visible=c.sport==='swim';
    this.ball.material.color.setHex(({football:0xfff3ca,basketball:0xde7839,tennis:0xdbec52,badminton:0xffffeb,swim:0xffffff})[c.sport]);
    this.ball.scale.setScalar(c.sport==='football'?.25:c.sport==='basketball'?.22:.15);
    if(c.sport==='football'){
      const original=this.host.ctx.scene.getObjectByName('SM_FB_MatchBall');
      if(original){const ball=original.clone();ball.name='比赛用球';ball.visible=true;ball.position.set(0,0,0);ball.scale.setScalar(1.5);this.gear.add(ball);this.ball.visible=false;}
    }else if(c.sport==='badminton'){
      this.ball.scale.setScalar(.065);
      const skirt=new T.Mesh(new T.ConeGeometry(.13,.21,12,1,true),new T.MeshStandardMaterial({color:0xfff3da,side:T.DoubleSide}));
      skirt.rotation.z=Math.PI;this.gear.add(skirt);
    }else if(c.sport==='basketball'){
      const seams=new T.Group(),mat=new T.MeshBasicMaterial({color:0x473022});
      for(const tilt of [0,Math.PI/2,Math.PI/4]){
        const arc=new T.Mesh(new T.TorusGeometry(.221,.006,5,36),mat);arc.rotation.y=tilt;seams.add(arc);
      }
      this.gear.add(seams);
    }
    if(this.match.net)for(const p of this.match.players){
      const racket=new T.Group(),edge=new T.MeshStandardMaterial({color:p.team?0xc36442:0x23736b});
      const head=new T.Mesh(new T.TorusGeometry(.23,.022,6,24),edge);head.scale.y=1.3;head.position.y=.52;
      const grip=new T.Mesh(new T.CylinderGeometry(.026,.033,.34,8),edge);grip.position.y=.16;
      const strings=new T.Mesh(new T.CircleGeometry(.211,12),new T.MeshBasicMaterial({color:0xece4bb,wireframe:true}));
      strings.position.copy(head.position);strings.scale.y=1.3;racket.add(head,grip,strings);this.rackets.push(racket);this.group.add(racket);
    }
    this.intro=2;this.wave=0;this.panel.className='sports-panel playing';this.title(sportsNames[c.sport]);
    this.board=this.paragraph('动物正在入场');this.status=this.paragraph('');
    this.meter=document.createElement('progress');this.meter.max=1;this.panel.append(this.meter);
    const labels={football:['传球 / 蓄力射门','冲刺'],basketball:['传球 / 蓄力投篮','抢板 / 封盖'],tennis:['发球 / 挥拍','高吊'],badminton:['发球 / 挥拍','轻吊 / 扣杀'],swim:['划水','跃入 / 蹬壁']}[c.sport];
    const primary=btn(labels[0],()=>{}),alt=btn(labels[1],()=>this.act(0,true));
    primary.onpointerdown=e=>{e.preventDefault();primary.setPointerCapture(e.pointerId);this.press();};
    primary.onpointerup=()=>this.release();primary.onpointercancel=()=>this.resetInputs();
    primary.onclick=e=>{if(!e.detail&&!this.held)this.act(.1,false);};
    this.controls(primary,alt,btn('F1 帮助',()=>this.toggleHelp()),btn('退出比赛',()=>this.stop()));
    if(c.sport!=='swim'){
      const pad=document.createElement('div');pad.className='sport-stick';pad.setAttribute('aria-label','移动摇杆');
      const thumb=document.createElement('i');pad.append(thumb);
      const move=(e:PointerEvent)=>{const r=pad.getBoundingClientRect();const x=(e.clientX-r.left-r.width/2)/(r.width*.36),z=(e.clientY-r.top-r.height/2)/(r.height*.36);const k=Math.max(1,Math.hypot(x,z));this.stick=[x/k,z/k];thumb.style.transform='translate('+this.stick[0]*24+'px,'+this.stick[1]*24+'px)';};
      pad.onpointerdown=e=>{pad.setPointerCapture(e.pointerId);move(e);};pad.onpointermove=e=>{if(pad.hasPointerCapture(e.pointerId))move(e);};
      pad.onlostpointercapture=()=>{this.stick=[0,0];thumb.style.transform='';};this.panel.append(pad);
    }
    const p=this.match.players[0];this.host.slime.teleport([c.x+p.x,c.y,c.z+p.z]);
    this.eye.copy(this.host.ctx.camera.position);this.look.set(c.x+p.x,c.y,c.z+p.z);this.render(1);
  }
  private input():SportInput{
    const dx=this.stick[0]+Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA')),dz=this.stick[1]+Number(this.keys.has('KeyS'))-Number(this.keys.has('KeyW'));
    const k=Math.max(1,Math.hypot(dx,dz));return {dx:dx/k,dz:dz/k,held:this.held};
  }
  private act(charge:number,alt:boolean){if(!this.help&&this.intro<=0)this.match?.action(charge,alt,this.input());}
  private press(){if(this.held)return;this.held=true;this.charge=0;if(this.court?.sport==='swim')this.act(0,false);}
  private release(){if(!this.held)return;this.held=false;if(this.court?.sport!=='swim')this.act(Math.min(1,this.charge),false);this.charge=0;}
  private resetInputs(){this.keys.clear();this.stick=[0,0];this.held=false;this.charge=0;}
  private key(e:KeyboardEvent,down:boolean){
    if(!this.active)return;
    if((e.target instanceof HTMLSelectElement)&&!['Escape','F1'].includes(e.code))return;
    if(e.code==='Tab'||e.code==='Enter')return;
    e.preventDefault();e.stopImmediatePropagation();
    if(e.code==='F1'&&down&&!e.repeat){this.toggleHelp();return;}
    if(e.code==='Escape'&&down&&!e.repeat){if(this.help)this.toggleHelp();else this.stop();return;}
    if(this.help||!this.match||this.result)return;
    if(down)this.keys.add(e.code);else this.keys.delete(e.code);
    if(e.code==='KeyF'){if(down&&!e.repeat)this.press();if(!down)this.release();}
    if(e.code==='Space'&&down&&!e.repeat)this.act(0,true);
  }
  update(dt:number){
    if(!this.active||!this.match||document.hidden)return;
    if(this.help){this.camera(dt);return;}
    if(!this.result){
      this.intro=Math.max(0,this.intro-dt);
      if(this.intro===0){
        if(this.held)this.charge+=dt;
        let left=Math.min(.15,dt);while(left>.000001){const slice=Math.min(left,1/60);this.match.update(slice,this.input());left-=slice;}
      }
      this.render(dt);
      if(this.match.rank)this.finish();
    }else this.camera(dt);
  }
  private render(dt:number){
    const c=this.court!,m=this.match!,s=this.host.slime,swim=c.sport==='swim';
    const t=m.time,phase=1-this.intro/2;
    this.wave-=dt;
    m.players.forEach((p,i)=>{
      const dive=swim&&p.wet?Math.min(1,p.distance/1.1):0;
      const x=c.x+p.x-(swim&&p.wet?.55*(1-dive):0),z=c.z+p.z,wet=swim&&p.wet&&dive>=1;
      const draft=i?.24:.17;
      const swimY=wet?-draft+.033*Math.sin(t*6+i):.84-(.84+draft)*dive+.55*Math.sin(Math.PI*dive);
      const y=c.y+(swim?swimY:Math.sin(Math.PI*Math.min(1,p.lift/.55))*.85);
      if(i===0){
        const vx=(x-s.position[0])/Math.max(.008,dt),vz=(z-s.position[2])/Math.max(.008,dt);
        s.attachDeck([x,y,z],[0,1,0]);s.velocity=[vx,0,vz];const len=Math.hypot(vx,vz);
        if(len>.12)s.forward=[vx/len,0,vz/len];
        if(swim){
          const r=s.latest?.radii[0]??[.25,.18,.23];
          this.swimCap.scale.set(r[0]*1.01,r[1]*1.06,r[2]*1.01);this.swimCap.position.set(x,y+r[1]+.013,z);
        }
      }else{
        const model=this.models[i-1],g=model.group;
        const wx=this.intro?T.MathUtils.lerp(c.x+p.x*.8,x,phase):x;
        const wz=this.intro?T.MathUtils.lerp(c.z+c.d*.43,z,phase):z;
        const dx=wx-g.position.x,dz=wz-g.position.z,moving=Math.hypot(dx,dz)>.001;
        if(moving)g.rotation.y=Math.atan2(dx,dz);
        g.position.set(wx,y,wz);g.userData.sportRing.visible=!wet;
        model.setPose?.(wet?(p.finish?'float':'swim'):moving?'run':'idle');
      }
      if(wet&&!p.finish&&this.wave<=0)(i?disturbAnimalWater:disturbWater)(this.host.ctx,x,z,.18);
      const racket=this.rackets[i];
      if(racket){racket.position.set(x+.32,y+.28,z+.16);racket.rotation.z=(p.team?1:-1)*(.52+(m.lastHit===i&&m.flight?Math.max(0,.32-m.flight.age)*4:0));}
    });
    if(this.wave<=0)this.wave=.42;
    for(const i of m.splash.splice(0)){const p=m.players[i];this.host.splash(c.x+p.x,c.z+p.z,c.y-.152);}
    this.ball.position.set(c.x+m.ball.x,c.y+m.ball.y,c.z+m.ball.z);
    this.gear.position.copy(this.ball.position);if(c.sport==='badminton')this.gear.position.y+=.10;
    if(c.sport==='basketball'||c.sport==='football')this.gear.rotation.z=-m.ball.x*2;
    const target=m.net&&m.flight?m.flight.to:m.ball;
    this.shadow.position.set(c.x+target.x,c.y+.055,c.z+target.z);
    if(this.board)this.board.textContent=swim?'已游 '+m.players[0].distance.toFixed(1)+' / 50 米　'+t.toFixed(1)+' 秒':'我方 '+m.score[0]+'　—　'+m.score[1]+' 对方'+(c.sport==='football'?'　'+Math.max(0,180-Math.floor(t))+' 秒':'');
    if(this.status)this.status.textContent=this.intro?'选手正在入场…':m.waiting>0?'准备…':m.message;
    if(this.meter)this.meter.value=swim?m.players[0].energy:Math.min(1,this.charge);
    this.camera(dt);
  }
  private camera(dt:number){
    const c=this.court!,m=this.match!,p=m.players[0],wide=c.sport==='football',net=m.net,swim=c.sport==='swim';
    const target=new T.Vector3(c.x+(net?p.x*.24:(swim?p.x:p.x*.72+m.ball.x*.28)),c.y+.65,c.z+(swim?0:net?p.z*.25:p.z*.7+m.ball.z*.3));
    const radius=wide?14:swim?11:c.sport==='tennis'?18:net?11:12;
    this.look.lerp(target,1-Math.exp(-dt*8));target.y+=radius*.77;target.z+=radius;
    this.eye.lerp(target,1-Math.exp(-dt*7));const ctx=this.host.ctx;
    ctx.camera.position.copy(this.eye);ctx.controls.target.copy(this.look);ctx.camera.lookAt(this.look);ctx.camera.updateMatrixWorld();
  }
  private finish(){
    const m=this.match!,sport=this.court!.sport;
    this.result=settleSport(this.host.life,this.id,sport,m.rank,this.host.day());
    if(!this.result){this.stop();return;}
    this.host.save();this.resetInputs();const r=this.result;
    this.host.slime.setMood(r.rank===1?'Happy':'Surprised',1.4);
    this.panel.className='sports-panel';this.title(sportsNames[sport]+' · '+(sport==='swim'?'第 '+r.rank+' 名':r.rank===1?'获胜':'完赛'));
    this.paragraph('贝壳 +'+r.shells+'　运动能力 '+r.before+' → '+r.after);
    const log=sportsLog(this.host.life);this.paragraph('今日训练 '+log.trained+'/4'+(log.trained>=4?' · 再赛仍可赚贝壳':''));
    this.resultText=sport==='swim'?'折返 '+m.players[0].split.toFixed(1)+' 秒 · 总用时 '+m.players[0].finish.toFixed(1)+' 秒':
      '比分 '+m.score.join(' : ')+' · '+(m.net?'制胜球 '+m.winners+' · 最长回合 '+m.longestRally+' 拍':'成功传球 '+m.passes);
    this.paragraph(this.resultText);if(this.previousText)this.paragraph('上场：'+this.previousText);
    this.paragraph('我方：'+m.players.filter(p=>!p.team).map(p=>p.athlete.name).join('、')+'　对手：'+m.players.filter(p=>p.team).map(p=>p.athlete.name).join('、'));
    this.controls(btn('原阵再赛',()=>this.start()),btn('换伙伴',()=>this.lobby()),btn('F1 帮助',()=>this.toggleHelp()),btn('回场边',()=>this.stop()));
  }
  private clearMatch(){
    const disposable=new Set<{dispose:()=>void}>();
    for(const o of [...this.gear.children,...this.rackets]){
      if(o.name!=='比赛用球')o.traverse(n=>{if(n instanceof T.Mesh){disposable.add(n.geometry);disposable.add(n.material);}});
      o.removeFromParent();
    }
    disposable.forEach(o=>o.dispose());this.rackets=[];this.gear.rotation.set(0,0,0);
    for(const m of this.models){const r=m.group.userData.sportRing;r.geometry.dispose();r.material.dispose();r.removeFromParent();m.dispose();m.group.removeFromParent();}
    this.models=[];this.match=null;this.group.visible=false;
  }
  stop(){
    if(!this.court)return;
    this.clearMatch();this.resetInputs();this.result=null;this.help=false;this.helpView.hidden=true;this.panel.hidden=true;this.court=null;
    document.body.classList.remove('sports-open');const s=this.host.slime;s.releaseDeck();s.inputLock=this.locked;s.teleport(this.origin);s.keys.clear();s.setMenuPointer('quickMenu',false);
  }
}
