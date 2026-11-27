import * as T from 'three';
import type {Stage} from '../level/stage';
import {workbench,bakeDesk,batch,texture,fibers} from './jan01-chapter';
import {latch,outlet,type Workshop} from '../templates/turning-season';
import type {WorkshopKind} from '../../content/turning-season';

type Bench=ReturnType<typeof workbench>;
const wood='#81553b',dark='#473633',brass='#dfaa58',ivory='#f4e1b6';
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
function line(b:Bench,p:T.Object3D,color:string,a:number[],c:number[],radius:number){
  const v=new T.Vector3(...a),w=new T.Vector3(...c),diff=w.clone().sub(v),mid=v.add(w).multiplyScalar(.5);
  const m=b.cylinder(color,mid.x,mid.y,mid.z,radius,radius,diff.length(),p);
  m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),diff.normalize());return m;
}
function cutout(b:Bench,p:T.Group,color:string,points:number[][],z:number,depth=.07){
  const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();
  return b.part(new T.ExtrudeGeometry(s,{depth,bevelEnabled:false}),color,0,0,z,1,1,1,p);
}
function textile(stage:Stage,base:string,mark:string,diagonal=false){
  return stage.toon('#ffffff',{map:texture(640,384,g=>{
    g.fillStyle=base;g.fillRect(0,0,640,384);fibers(g,640,384,1800);
    g.strokeStyle=mark;g.lineWidth=3;g.strokeRect(10,10,620,364);
    g.lineWidth=1;g.strokeRect(17,17,606,350);
    for(let i=0;i<12;i++){g.beginPath();const x=25+i*54;g.moveTo(x,27);g.lineTo(x+9,21);g.lineTo(x+18,27);g.stroke();}
    if(diagonal)for(let i=-400;i<750;i+=12){g.beginPath();g.moveTo(i,0);g.lineTo(i+260,384);g.stroke();}
  })});
}
function horse(b:Bench,p:T.Group,main:string,trim:string){
  cutout(b,p,main,[[-1.14,.1],[-.91,.53],[-1.17,.79],[-.69,.59],[.18,.62],[.53,1.01],[.58,1.38],[.77,1.19],[1.01,1.24],[.96,1.05],[1.38,.82],[1.25,.62],[.94,.69],[.60,.23],[.06,.05],[-.42,.05],[-.92,-.1]],0);
  for(const [i,x] of [-.79,-.6,.26,.5].entries()){
    const k=i%2?.42:-.28;line(b,p,main,[x,.16,.03],[x+k,-.32,.05],.066);
    line(b,p,main,[x+k,-.32,.05],[x+k+.14,-.58,.09],.052);
    b.oval(trim,x,.16,.14,.06,.06,.022,p);}
  cutout(b,p,trim,[[-.52,.6],[.10,.6],[-.04,.32],[-.42,.27]],.1);
  b.oval(trim,.91,1.01,.13,.06,.05,.026,p);batch(p);
}
function shadowTheatre(b:Bench,stage:Stage){
  b.box(textile(stage,'#fff1c6','#b28854'),0,2.35,-2.76,8.8,3.55,.18);
  for(const x of [-4.53,4.53]){b.box(dark,x,1.93,-2.7,.25,3.88,.38);for(let i=0;i<5;i++){
    b.oval(i%2?'#933e39':'#b4553e',x-Math.sign(x)*(.13+i*.14),2.78+i*.06,-2.43,.21,1.22-i*.08,.14);}}
  b.box(wood,0,4.26,-2.70,9.5,.26,.56);
  // Spare rods on the proscenium and a drum beside the lamp give the stage its human scale.
  for(let j=0;j<3;j++)line(b,b.fixed,j%2?wood:brass,[-4.45+j*.22,.06,.29],[-3.98+j*.22,.12,-1.26],.029);
  b.cylinder('#8d493b',3.9,.34,.16,.54,.47,.62);
  b.cylinder(ivory,3.9,.68,.16,.54,.54,.055);
  for(let i=0;i<9;i++){const a=i*2*Math.PI/9;b.oval(brass,3.9+.51*Math.cos(a),.51,.16+.51*Math.sin(a),.043,.043,.043);}
  for(let i=0;i<17;i++)b.oval(i%2?brass:'#ad5540',-4.48+i*.56,4.02,-2.48,.25,.21,.11);
  for(const x of [-3.85,3.85]){b.cylinder(dark,x,.49,-1.9,.22,.36,.7);b.oval('#f8b450',x,1.02,-1.9,.32,.48,.32);}
  const puppet=b.group(),pattern=b.group();horse(b,puppet,'#613b37','#de9b4d');horse(b,pattern,'#caa97b','#efcd91');
  const stick=b.group();line(b,stick,brass,[-.52,-1.25,0],[-.25,.30,0],.025);batch(stick);puppet.add(stick);
  return (s:Workshop,t:number,x:number,z:number)=>{
    const to=s.step<2?[-1.45,-.55]:[1.5,.85];
    const scale=(v:number)=>.77+.12*v;
    pattern.position.set(to[0]*.78,2.15,-2.59);pattern.scale.setScalar(scale(to[1])*1.07);
    puppet.position.set(s.finishing?1.3+Math.sin(t*1.6)*.9:x*.78,2.14+(s.finishing?.12*Math.sin(t*4):0),-2.34);
    puppet.scale.setScalar(scale(z));puppet.rotation.z=s.finishing?.13*Math.sin(t*4.3):0;pattern.visible=!s.finishing;
  };
}
function springBath(b:Bench){
  for(let i=0;i<5;i++){const x=-7+i*3.35;
    const m=b.part(new T.ConeGeometry(1,1,5),i%2?'#7a999c':'#9ab0ae',x,1.55,-6.6-i%2,3,4+i%3,2);
    b.part(new T.ConeGeometry(1,1,5),'#f1ebd6',x,m.position.y+(4+i%3)*.31,m.position.z,1.18,(4+i%3)*.38,.8);}
  for(const i of [-1,1]){
    b.box(wood,i*3.1,1.27,-2.15,.24,2.55,.24);
    b.box('#865039',i*2.55,2.65,-2.14,2.25,.20,1);
    for(let j=0;j<5;j++)b.oval('#6c8850',i*(3.25-j*.10),1.42+j*.15,-2.13,.19,.39,.12).rotation.z=j*.23;
    line(b,b.fixed,wood,[i*3.2,1.25,-2.4],[i*.65,.52,-1.85],.19);
    b.cylinder(brass,i*1.95,.29,-.30,.2,.23,.58);}
  b.cylinder('#776b60',0,.235,-1.75,1.40,1.1,.47);
  const water=b.cylinder('#66bac0',0,.57,-1.75,1.18,1.18,.12,b.root);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;b.oval(i%2?'#a49c86':'#beb59a',1.29*Math.cos(a),.63,-1.75+1.29*Math.sin(a),.30,.15,.25);}
  const streams=[-1,1].map(i=>line(b,b.root,i<0?'#59adc6':'#d7a16e',[i*2.8,1.22,-2.38],[i*.62,.65,-1.83],.075));
  const mist=Array.from({length:6},(_,i)=>b.oval('#eee6cc',Math.sin(i)*.7,1,-1.9,.16,.05,.11,b.root));
  return (s:Workshop,t:number)=>{streams.forEach((m,i)=>{const n=i?s.hot:s.cold;m.visible=n>0;m.scale.x=m.scale.z=.5+.33*n;});
    water.position.y=.54+.025*(s.cold+s.hot);mist.forEach((m,i)=>{const f=(t*.33+i/6)%1;m.visible=s.hot>0||s.finishing;m.position.y=.68+f*1.07;m.scale.x=.04+.22*Math.sin(f*Math.PI);});};
}
function teaRoom(b:Bench){
  for(let i=0;i<3;i++)for(let j=0;j<13;j++)b.oval(i%2?'#6f9052':'#4c7856',j*.95-5.8,.24+i*.45,-3.7-i*.79,.71,.49,.50);
  for(const x of [-4.4,4.4]){b.cylinder(wood,x,1.35,-2.48,.12,.17,2.7);b.box(wood,x,2.6,-2.5,.34,.19,1.35);}
  b.box('#725b3c',0,2.8,-2.75,9.3,.18,1.4);
  for(let i=0;i<20;i++)b.cylinder('#ccad71',-4.46+i*.465,2.96,-2.7,.10,.10,1.6).rotation.x=Math.PI/2;
  const tray=b.group();tray.name='tea-tray';tray.position.set(0,.18,0);
  const basket=b.cylinder('#b48c52',0,0,0,3.15,2.72,.20,tray);basket.scale.z=.57;basket.name='solid-woven-tray';
  for(let j=-7;j<=7;j++){
    const width=5.82*Math.sqrt(1-(j/8)**2);b.box(j%2?'#dbbd79':'#cfa769',0,.114,j*.195,width,.014,.082,tray);}
  const leaves=b.group(tray);
  for(let i=0;i<30;i++){const a=i*2.4,r=.25+(i%7)*.18;const leaf=b.oval(i%3?'#648852':'#9ca455',Math.cos(a)*r,.17,-.18+Math.sin(a)*r*.60,.16,.035,.065,leaves);leaf.rotation.y=a;}
  batch(leaves);
  b.cylinder('#8e6842',0,.29,-1.95,.67,.41,.57);
  for(let i=0;i<4;i++)b.cylinder(i%2?'#ba9b69':'#8b6e49',0,.34+i*.08,-1.95,.5+i*.05,.48+i*.05,.05);
  return (s:Workshop)=>{const toss=s.finishing?clamp(s.finishTime/1.2):0;
    tray.rotation.z=-s.tilt*.029*(1-toss);tray.position.y=.18+.12*Math.sin(toss*Math.PI);
    leaves.position.set(.6*s.tilt*(1-toss),.20*toss+.92*Math.sin(toss*Math.PI),-1.95*toss);
    leaves.scale.setScalar(1-.64*toss);};
}
function peaceCourt(b:Bench){
  for(let i=0;i<3;i++){
    const x=(i-1)*2.85;
    for(const dx of [-1.30,1.30]){b.box('#9aabac',x+dx,1.45,-2.6,.22,2.90,.55);b.box(ivory,x+dx,2.86,-2.6,.34,.18,.69);}
    b.box('#ddcbb1',x,3.05,-2.6,2.78,.24,.62);
  }
  const panes=[-2.85,0,2.85].map(x=>{const g=b.group();g.position.set(x-1.15,.80,-2.47);
    b.box('#78989c',1.05,.81,0,2.1,1.62,.11,g);
    for(let i=0;i<5;i++)b.box('#b3c3b1',.22+i*.41,.81,.083,.045,1.45,.045,g);
    batch(g);return g;});
  for(let j=0;j<20;j++){const x=-5.5+j*.58;b.oval('#778c70',x,.42,-3.8,.54,.38,.48);}
  const dove=b.group();
  cutout(b,dove,'#fff6dd',[[-.6,-.10],[-.22,.04],[-.5,.31],[.18,.03],[.40,.26],[.55,.22],[.60,.11],[.80,.05],[.54,.02],[.31,-.19],[-.11,-.25]],0);
  const wing=b.group(dove);cutout(b,wing,'#dfded0',[[-.03,-.03],[-.52,.43],[-.07,.37],[.28,.02]],.08);batch(dove);
  return (s:Workshop,t:number)=>{panes.forEach((m,i)=>{m.rotation.y=-(s.step>i+1||s.finishing?1.17:i===s.step-1?.45*s.progress:0);});
    const k=clamp((s.step-1+s.progress)/3);dove.position.set(-3+6*k+(s.finishing?s.finishTime*.88:0),1.38+.28*Math.sin(t*2.3)+(s.finishing?s.finishTime*.80:0),-1.57);wing.rotation.x=Math.sin(t*5)*.6;};
}
function pressShop(b:Bench,stage:Stage){
  for(const x of [-3.6,3.6]){b.box('#557069',x,1.25,-2.1,.36,2.5,.62);b.box(wood,x,2.5,-2.08,.57,.29,.82);}
  b.box('#53726a',0,2.75,-2.1,8.1,.31,.67);
  for(let j=0;j<5;j++)b.box(j%2?'#d7c197':'#efdbb2',-3.79,.15+j*.1,-1.18,.99,.075,1.15);
  for(const z of [.55,1.61])b.box(brass,0,.105,z,6.6,.07,.07);
  const sheet=texture(768,360,g=>{g.fillStyle='#f4e3b7';g.fillRect(0,0,768,360);fibers(g,768,360,3200);
    g.strokeStyle='#567267';g.lineWidth=5;g.strokeRect(22,22,724,316);g.strokeRect(33,33,702,294);
    g.fillStyle='#c3c395';g.beginPath();g.moveTo(38,220);for(let x=38;x<738;x+=6)g.lineTo(x,145+24*Math.sin(x/56)+27*Math.sin(x/32));g.lineTo(732,307);g.lineTo(38,307);g.fill();
    g.strokeStyle='#4f786e';g.lineWidth=10;g.beginPath();g.moveTo(96,224);g.lineTo(660,224);g.stroke();
    for(let i=0;i<5;i++){g.beginPath();g.arc(162+i*108,273,49,Math.PI,2*Math.PI);g.stroke();}
    g.fillStyle='#965747';g.font='22px serif';g.fillText('石 家 庄　·　纪 念 印 样',240,82);});
  b.box(stage.toon('#ffffff',{map:sheet}),0,1.44,-2.26,6.4,2.44,.16);
  const cover=b.box('#d4c6a0',0,1.44,-2.09,6.44,2.46,.11,b.root);
  const roller=b.group();roller.position.set(-3,.42,1.05);
  b.cylinder('#6f8c79',0,0,0,.27,.27,1.32,roller).rotation.x=Math.PI/2;
  line(b,roller,wood,[0,0,-.78],[0,.64,-.63],.07);line(b,roller,wood,[0,0,.78],[0,.64,.63],.07);
  line(b,roller,brass,[0,.64,-.63],[0,.64,.63],.07);batch(roller);
  const register=b.group();register.position.set(0,1.44,-1.98);
  b.box('#a95940',0,0,0,.7,.065,.06,register);b.box('#a95940',0,0,.065,.065,.7,.04,register);batch(register);
  b.box('#354e4d',0,1.44,-1.87,.74,.06,.045);b.box('#354e4d',0,1.44,-1.80,.06,.74,.04);
  return (s:Workshop)=>{const p=s.finishing?1:s.progress;cover.visible=p<.997;cover.scale.x=6.44*(1-p);cover.position.x=3.22*p;
    register.position.x=s.dx*.28;register.position.y=1.44+s.dz*.24;register.visible=s.step<3;roller.position.x=-3+6*p;};
}
export function buildWorkshop(stage:Stage,kind:WorkshopKind){
  const b=workbench(stage);
  const top=textile(stage,kind==='dove'?'#dbd7c3':kind==='spring'?'#b5ae8d':kind==='tea'?'#aa8e65':'#bf9870','#877554');
  b.box(top,0,-.23,.15,10.5,.46,7.1,b.fixed,'solid-bench');
  const animate={shadow:shadowTheatre,spring:springBath,tea:teaRoom,dove:peaceCourt,press:pressShop}[kind](b,stage);
  if(kind!=='tea'){b.cylinder(wood,latch[0],.09,latch[1],.45,.53,.18);b.cylinder(brass,latch[0],.205,latch[1],.30,.32,.055);}
  if(kind==='spring'||kind==='dove')b.cylinder(brass,outlet[0],.14,outlet[1],.29,.39,.28);
  const material=stage.toon('#ffe79f',{emissive:'#f5a749',emissiveIntensity:.48});
  const ring=b.part(new T.TorusGeometry(.44,.045,8,36),material,0,.36,0,1,1,1,b.root);ring.rotation.x=Math.PI/2;
  const world=bakeDesk(stage,b.root);batch(b.fixed);
  const tray=b.root.getObjectByName('tea-tray');if(tray instanceof T.Group)batch(tray);
  return {root:b.root,world,update(s:Workshop,t:number,x:number,z:number){animate(s,t,x,z);const mark=s.target;
    ring.position.x=mark[0];ring.position.z=mark[1];ring.visible=!s.finishing;ring.scale.setScalar(1+.08*Math.sin(t*3));}};
}
