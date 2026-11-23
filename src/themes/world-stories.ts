import * as T from 'three';
import type {Stage,StageLook} from '../level/stage';
import type {Layout,Story} from '../templates/mode-world';
import type {Vec} from '../slime/types';
import {Kit} from './folio-landmarks';
import {rng} from '../templates/random';

const palettes={
 ceres:['#0b203a','#647586','#38495d','#d5a65d','#bfe5ff'],
 tiros:['#416c97','#c5dce4','#596b7c','#da985c','#e8faff'],
 wow:['#28394f','#8a9893','#436461','#ba925e','#c8f6b6'],
 life:['#62554f','#d4bf9f','#655d53','#ac5140','#fbeac0']
};
type NewStory=keyof typeof palettes;
export function newWorldLook(story:Story):StageLook{
 const [skyTop,skyHorizon,ground]=palettes[story as NewStory];
 return {skyTop,skyHorizon,fog:[23,66],sun:story==='ceres'?'#b9ddff':'#fff0cb',sunIntensity:story==='ceres'?1.25:1.95,hemiSky:'#e7eeea',hemiGround:ground,ink:'#253540',wash:skyHorizon};
}
const captions={
 ceres:['子午观测台','CERES  /  1801','谷神星 · 观测星图'],
 tiros:['气象遥测站','TIROS-2  /  1960','气象卫星 · 云图'],
 wow:['射电观测场','SIGNAL  /  1977','Wow! · 信号记录'],
 life:['摄影编辑部','LIFE  /  1936','佩克堡水坝 · 创刊封面']
};
function card(parent:any,x:number,y:number,z:number,w:number,h:number){
 const c=document.createElement('canvas');c.width=768;c.height=Math.round(768*h/w);
 const ctx=c.getContext('2d')!,tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
 const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));
 m.position.set(x,y,z);parent.add(m);return {ctx,tex,c,m};
}
/** Each station makes a different original piece of paper. Ink is revealed by the player's samples. */
function drawPaper(panel:ReturnType<typeof card>,story:NewStory,completed:number,finale:boolean){
 const {ctx:c,c:canvas,tex}=panel,w=canvas.width,h=canvas.height;
 const night=story==='ceres',red='#ad493d';c.fillStyle=night?'#173851':story==='tiros'?'#28647a':'#ece4cd';c.fillRect(0,0,w,h);
 c.save();c.scale(w/768,h/490);
 if(story==='ceres'){
  c.strokeStyle='#446179';c.lineWidth=1;for(let i=0;i<15;i++){c.beginPath();c.ellipse(370,290,70+i*39,21+i*19,-.12,0,Math.PI*2);c.stroke();}
  const r=rng('ceres-map');for(let i=0;i<160;i++){c.fillStyle=i%3?'#92adbd':'#f2e6bd';c.fillRect(r.range(18,752),r.range(95,463),2+i%3,2+i%3);}
  const coords=[[154,347],[356,290],[566,208]];
  c.lineWidth=5;c.strokeStyle='#f3ba6d';c.beginPath();
  for(let i=0;i<completed;i++){const [x,y]=coords[i];if(!i)c.moveTo(x,y);else c.lineTo(x,y);}
  if(finale)c.stroke();
  coords.slice(0,completed).forEach(([x,y],i)=>{c.strokeStyle='#f4d592';c.beginPath();c.arc(x,y,14,0,Math.PI*2);c.stroke();c.fillStyle='#e8d4a2';c.font='20px sans-serif';c.fillText(String(i+1),x+20,y);});
 }else if(story==='tiros'){
  c.strokeStyle='#467f90';c.lineWidth=2;for(let a=0;a<9;a++){c.beginPath();c.ellipse(380,322,75+a*48,88+a*24,-.16,0,Math.PI*2);c.stroke();}
  for(let k=0;k<completed;k++)for(let j=0;j<15;j++){const cx=125+k*239+Math.sin(j*.65)*32,cy=198+j*10;
   c.strokeStyle=j%2?'#a8d7d7':'#d9f2e7';c.lineWidth=5+j%3;c.beginPath();c.moveTo(cx-62,cy);c.bezierCurveTo(cx+12,cy-66,cx+34,cy+54,cx+86,cy-19);c.stroke();}
 }else if(story==='wow'){
  c.strokeStyle='#c4c7ae';c.lineWidth=1;for(let x=20;x<750;x+=25){c.beginPath();c.moveTo(x,112);c.lineTo(x,428);c.stroke();}for(let y=115;y<430;y+=20){c.beginPath();c.moveTo(18,y);c.lineTo(752,y);c.stroke();}
  c.strokeStyle='#3e5755';c.lineWidth=3;c.beginPath();let lim=completed===3?735:75+completed*125;
  for(let x=32;x<lim;x+=3){const amp=11+148*Math.exp(-((x-400)**2)/11000),y=282-amp*(Math.sin(x*.10)*.45+Math.sin(x*.034)*.4+.55);if(x===32)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();
  if(finale){c.fillStyle=red;c.font='italic bold 55px Georgia';c.fillText('Wow!',495,185);c.strokeStyle=red;c.lineWidth=4;c.beginPath();c.ellipse(402,240,92,119,-.16,0,Math.PI*2);c.stroke();}
 }else{
  c.fillStyle=red;c.fillRect(0,0,253,98);c.fillStyle='#fff0dc';c.font='bold 76px Georgia';c.fillText('LIFE',18,77);
  c.fillStyle='#5b5b56';c.fillRect(28,116,712,339);const shade=['#93938c','#bab6a7','#d9d6c4','#aaa99f'];
  for(let i=0;i<8;i++){const x=45+91*i,y=169+i*8;c.fillStyle=shade[i%4];c.fillRect(x,y,70,302-y);c.beginPath();c.moveTo(x,y);c.lineTo(x+18,y-24);c.lineTo(x+86,y-24);c.lineTo(x+70,y);c.fill();}
  c.fillStyle='#343d3b';c.beginPath();c.moveTo(28,348);c.lineTo(740,287);c.lineTo(740,425);c.lineTo(28,449);c.fill();
  if(!finale){c.fillStyle='#c5bca9';c.fillRect(28,116,712,339);c.fillStyle='#605a50';c.font='28px serif';c.fillText(completed?'校样就绪':'待压印',325,286);}
 }
 c.fillStyle=night||story==='tiros'?'#fff1cc':'#423e39';c.font='bold 35px Georgia';c.fillText(captions[story][1],story==='life'?315:28,57);
 c.font='21px "Microsoft YaHei"';c.fillText(captions[story][2],story==='life'?319:29,90);c.restore();tex.needsUpdate=true;
}
export function buildWorldStory(stage:Stage,l:Layout,seed:string){
 const story=l.story as NewStory,ceres=story==='ceres',tiros=story==='tiros',radio=story==='wow',press=story==='life';
 const [,haze,deck,trim,light]=palettes[story],dark='#263840',r=rng(seed);
 const material=new T.MeshStandardMaterial({roughness:.72,metalness:.17}),glow=new T.MeshBasicMaterial();
 const k=new Kit({toon:material,lit:material,glass:glow,lamp:glow,glow},seed),root=stage.scene;
 const labels:any[]=[];
 const sign=(x:number,y:number,z:number,text:string,w=1.8)=>{
  const p=card(root,x,y,z,w,w*.22),c=p.ctx;c.fillStyle=dark;c.fillRect(0,0,p.c.width,p.c.height);
  c.strokeStyle=trim;c.lineWidth=6;c.strokeRect(7,7,p.c.width-14,p.c.height-14);
  c.fillStyle='#f7eacc';c.font='bold 62px "Microsoft YaHei"';c.textAlign='center';c.textBaseline='middle';c.fillText(text,p.c.width/2,p.c.height/2,p.c.width-34);p.tex.needsUpdate=true;labels.push(p.m);
 };
 const ring=(point:Vec,radius:number,color:string)=>{const g=k.group(root,...point);k.ring(g,color,0,.074,0,radius,Math.PI/2,0,'glow');return g;};
 for(const f of l.world.surfaces){
  const w=f.max[0]-f.min[0],d=f.max[1]-f.min[1],x=(f.max[0]+f.min[0])/2,z=(f.max[1]+f.min[1])/2;
  k.box(root,deck,x,f.height-.22,z,w,.44,d);
  if(ceres){
   for(const radius of [1.2,2.4,3.65]){
    const inlay=new T.Mesh(new T.RingGeometry(radius-.018,radius+.018,96),new T.MeshBasicMaterial({color:'#839694'}));
    inlay.rotation.x=-Math.PI/2;inlay.position.y=.012;root.add(inlay);
   }
   for(let j=0;j<48;j++){const t=j*Math.PI/24;k.box(root,trim,3.61*Math.sin(t),.024,3.61*Math.cos(t),.025,.015,j%4===0?.19:.09,t);}
  }
  else for(let n=0;n<7;n++)k.box(root,radio?'#698067':'#84908d',x,.012,z-d/2+1+n*1.7,w-.20,.012,.019);
  for(const side of [-1,1])k.box(root,trim,x+side*(w*.5-.09),.025,z,.061,.035,d-.20);
 }
 for(const b of l.world.boxes){const [x,y,z]=b.min.map((v,i)=>(v+b.max[i])/2),[w,h,d]=b.max.map((v,i)=>v-b.min[i]);k.box(root,deck,x,y,z,w,h,d);
  for(const sign of [-1,1])k.beam(root,trim,[x+sign*w*.43,b.min[1]+.08,z+d/2+.025],[x+sign*w*.43,b.max[1]-.04,z+d/2+.025],.028);
  if(h>1)for(let j=1;j<6;j++)k.box(root,trim,x,b.min[1]+j*h/7,z+d/2+.035,w*.71,.035,.055);
 }
 k.box(root,radio?'#7c8774':press?'#87877a':ceres?'#26374b':'#637f8d',0,-.58,0,170,.22,155);
 if(ceres)for(let i=0;i<160;i++){const x=r.range(-32,32),y=r.range(2,19),z=r.range(-35,-11);k.ball(root,light,x,y,z,.026+i%4*.009,.034,.035,'glow');}
 const targets=l.targets.map((_,i)=>{const g=k.group(root);if(ceres){
  k.rock(g,'#e0c18e',0,0,0,.22,.18,.23,i); k.ring(g,light,0,.01,0,.39,-.27,.05,'glow');k.ball(g,'#fff0a6',0,0,.03,.09,.1,.1,'glow');
 }else{for(let j=0;j<5;j++)k.ball(g,j%2?'#d7e9eb':'#eef5e9',(j-2)*.18,.08*Math.sin(j*1.27),.03*j,.29,.25+(j%2)*.11,.23);k.ring(g,'#e2aa60',0,.01,.10,.61,.2,.0,'glow');}return g;});
 const stations=l.stations.map((s,i)=>{sign(s.at[0],s.at[1]+.75,s.at[2]-.57,(ceres?(i+1)+' · ':'')+s.label);
  return ring(s.at,.69,ceres?'#dabc79':light);});
 const feeds=l.pads.map((point,i)=>{const g=ring(point,.71,'#ace9d1');sign(point[0],point[1]+.65,point[2]-.85,tiros?'遥测供电':(i+1)+' 号馈源');return g;});
 const traces=radio?l.pads.map(([x,y,z])=>{
  const wire=k.group(root);
  const start:Vec=[x,y+.028,z-.76],corner:Vec=[x*.62,.028,-4.12],finish:Vec=[0,.028,-5.48];
  k.beam(wire,'#aba683',start,corner,.025);k.beam(wire,'#aba683',corner,finish,.025);
  const packet=k.group(root);k.ball(packet,'#c8ffbd',0,.055,0,.075,.064,.075,'glow');
  return {start,corner,finish,packet};
 }):[];
 const end=ring(l.end,.82,'#f9cd89'),moving=k.group(root),control=k.group(root,0,.25,-5.98);
 const backdrop=card(root,0,2.14,-7.42,4.15,2.65),paper=backdrop.m;
 k.box(root,dark,0,2.14,-7.55,4.43,2.91,.17);for(const sign of [-1,1])k.cyl(root,trim,sign*1.85,.61,-7.52,.07,1.22);
 k.box(root,deck,0,.27,-5.99,1.82,.54,.61);
 const tripod=(x:number,z:number,y=0)=>{for(let i=0;i<3;i++){const t=i*2.094;k.beam(root,trim,[x,y+.94,z],[x+.41*Math.cos(t),y+.025,z+.41*Math.sin(t)],.041);}};
 if(ceres){
  for(let j=0;j<15;j++){const t=Math.PI*(.02+j*.069);const x=6.7*Math.cos(t),z=-3.5-5.4*Math.sin(t);k.box(root,'#40546a',x,1.25,z,.37,2.5,.43);
   if(j<14){const t2=t+.069*Math.PI;k.beam(root,trim,[x,2.49,z],[6.7*Math.cos(t2),2.49,-3.5-5.4*Math.sin(t2)],.07);}}
  for(const station of l.stations){const [x,,z]=station.at;const sx=x+.72,sz=z-.64;tripod(sx,sz);
   k.beam(root,'#749494',[sx-.34,.72,sz+.19],[sx+.30,1.53,sz-.18],.13);k.ball(root,light,sx+.31,1.53,sz-.18,.12,.09,.12,'glow');
   for(let j=0;j<3;j++){const f=.2+.27*j,px=sx-.34+.64*f,py=.72+.81*f,pz=sz+.19-.37*f;
    k.beam(root,trim,[px,py,pz],[px+.036,py+.046,pz-.021],.147);}
  }
  for(let i=0;i<24;i++){const t=i*Math.PI/23,rr=9.1,y=2.6+.34*Math.sin(t*3);
   k.beam(root,'#687c85',[rr*Math.cos(t),0,-3-rr*Math.sin(t)],[rr*Math.cos(t),y,-3-rr*Math.sin(t)],.065);
   if(i%3===0)k.ball(root,light,rr*Math.cos(t),y,-3-rr*Math.sin(t),.075,.075,.075,'glow');
  }
  k.beam(control,'#e1c18c',[-.55,.39,.07],[.60,.39,-.09],.043);
 }else if(tiros){
  moving.position.set(-4.8,3.05,-7.5);k.cyl(moving,'#c8cbbb',0,0,0,.95,.53);
  for(let j=0;j<16;j++){const t=j*Math.PI/8;k.box(moving,'#485b71',Math.sin(t)*.93,0,Math.cos(t)*.93,.28,.36,.073,t);}
  for(let i=0;i<4;i++){const t=i*Math.PI/2;k.beam(moving,light,[.62*Math.cos(t),-.21,.62*Math.sin(t)],[1.45*Math.cos(t),-1.1,1.45*Math.sin(t)],.018);}
  for(let i=0;i<22;i++){const x=r.range(-22,22),z=r.range(-28,-12),y=r.range(1.2,6.4);k.ball(root,'#cedcdd',x,y,z,2.0,.49,.73);}
  for(const sign of [-1,1]){const x=sign*5.65;for(let j=0;j<3;j++){const z=3.4-j*4.7;tripod(x,z);k.ring(root,light,x,1.55,z,.58,.5,sign*.46,'lit');k.beam(root,trim,[x,1.54,z],[x+.35,2.14,z-.16],.035);}}
  k.box(control,'#e5dfbf',0,.38,0,1.07,.04,.63);
 }else if(radio){
  for(const side of [-1,1]){
   const x=side*6.22;
   for(let j=0;j<11;j++){
    const z=-6.6+j*1.20;k.beam(root,deck,[x-.62*side,.1,z],[x+side*.71,2.75,z],.047);
    k.beam(root,trim,[x,.1,z],[x+side*.71,2.75,z],.029);
   }
   for(let row=0;row<9;row++){const t=row/8;k.beam(root,'#b7c4b7',[x+side*(1.33*t-.62),.1+2.65*t,-6.75],[x+side*(1.33*t-.62),.1+2.65*t,5.4],.023);}
  }
  for(const [x,,z] of l.pads){k.beam(root,trim,[x,.05,z-.70],[x,.88,z-.78],.04);k.cone(root,light,x,.96,z-.78,.17,.23,'lit');}
  k.cyl(control,'#f1e7cc',-.59,.48,-.04,.19,.06);k.box(control,'#ccb686',.31,.46,.05,.54,.08,.36);
 }else{
  const high=l.stations[0].at;tripod(high[0]+.56,high[2]-.55,1.6);k.box(root,'#343b38',high[0]+.56,2.59,high[2]-.55,.43,.4,.51);
  const pressBox=l.world.boxes[1];for(const x of [pressBox.min[0]+.20,pressBox.max[0]-.20]){
   k.beam(root,'#958d7b',[x,1.52,pressBox.min[2]+.22],[x,1.52,pressBox.max[2]-.24],.21);}
  for(let i=0;i<11;i++){const x=(i-5)*1.28,y=2+.3*Math.cos(i*.67);k.box(root,'#7e8987',x,y*.5,-11.5,1.15,y,1.6);k.box(root,'#c4c5ad',x,y,-11.4,1.32,.18,1.8);
   k.box(root,'#636c6a',x,y*.47,-10.65,.24,y*.92,.31);k.taper(root,'#c4bfb0',x,y+.33,-11.1,.32,.56);}
  // Ink cylinders, compositors' cases and overhead drive belts wrap the working press.
  const machine=l.stations[1].at,unit=k.group(root,machine[0],1.42,machine[2]);
  for(let j=0;j<4;j++){k.cyl(unit,'#9d998f',.65,.12+j*.11,0,.22,.08);k.cyl(unit,'#7c5845',-.65,.12+j*.11,0,.19,.08);}
  for(const side of [-1,1]){const x=side*5.95;
   for(let z=-5;z<5;z+=2.8){
    k.box(root,'#594a3e',x,.57,z,.86,1.14,1.58);k.box(root,'#a18c70',x,1.17,z,.98,.08,1.74);
    for(let h=0;h<3;h++){k.box(root,'#9e8971',x-side*.448,.27+h*.28,z,.036,.22,1.43);k.box(root,'#4d4a40',x-side*.49,.30+h*.28,z,.07,.036,.34);}
   }
  }
  sign(-1.10,1.70,5.23,'摄影编辑 · 封面委托');k.cyl(root,'#625c4f',-1.10,.54,5.24,.23,.96);k.ball(root,'#caa685',-1.10,1.16,5.24,.18,.21,.17);
  k.cyl(root,'#3e443e',-1.10,1.33,5.24,.24,.08);k.box(root,'#9b5a44',-.87,.78,5.33,.28,.35,.07);
  k.box(control,'#54463e',0,.66,0,1.17,.12,.38);k.beam(control,trim,[.41,.68,0],[.57,1.04,.13],.058);
 }
 sign(0,1.03,-6.09,press?'压印创刊封面':ceres?'绘制观测星图':tiros?'提取气象云图':'接收记录纸',2.04);
 k.flush();let paperState=-1;
 return {update(time:number,progress:number,finale:number,visited:Set<number>,active:boolean[],positions:Vec[],health:number[]){
   const f=Math.min(1,finale/.95),n=Math.round(progress*3),state=n+(finale>0?4:0);
   if(state!==paperState){drawPaper(backdrop,story,n,finale>0);for(const label of labels)label.visible=finale===0;paperState=state;}
   if(press){control.position.y=.25-.23*Math.sin(f*Math.PI);paper.position.y=2.14+.26*Math.sin(f*Math.PI);}
   if(ceres)control.rotation.y=-.7+f*1.3;
   if(tiros){moving.rotation.y=time*.19;moving.position.y=3.05+.17*Math.sin(time*.55);control.position.z=-5.98+f*.33;}
   if(radio)control.rotation.y=Math.sin(finale*8)*.08*f;
   end.scale.setScalar(progress>=1?1+.07*Math.sin(time*4):.78);
   stations.forEach((g,i)=>{g.visible=ceres?i===visited.size:!visited.has(i);});
   targets.forEach((g,i)=>{g.visible=health[i]>0&&(!ceres||i===visited.size);g.position.fromArray(positions[i]);g.rotation.y=.27*Math.sin(time+i);});
   feeds.forEach((g,i)=>{g.scale.setScalar(active[i]?1.13+.04*Math.sin(time*7):1);});
   traces.forEach(({packet,start,corner,finish},i)=>{
    packet.visible=!!active[i];
    const phase=(time*1.45+i*.42)%2,first=phase<1,from=first?start:corner,to=first?corner:finish,t=phase%1;
    packet.position.set(from[0]*(1-t)+to[0]*t,.055,from[2]*(1-t)+to[2]*t);
   });
 }};
}

