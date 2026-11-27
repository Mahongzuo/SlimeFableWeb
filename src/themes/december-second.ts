import * as T from 'three';
import {type Builder,rod,ring,paint,floor,panel,label,batch,brass,cream,iron,wood,jade,red} from './december-chapters';
export const archive:Builder=(b,st)=>{
  floor(b,paint(st,'#a88d68',g=>{g.strokeStyle='#866f53';for(let i=0;i<14;i++)g.strokeRect(i*63,0,63,384);}));
  b.box('#afb29c',0,1.89,-3.8,10.5,3.84,.32);
  const cards=[0,1].map(i=>paint(st,i?'#e1d3ae':'#e6ddbd',g=>{
    g.strokeStyle='#648078';g.lineWidth=5;g.strokeRect(31,23,706,338);g.fillStyle='#536760';
    g.font='44px serif';g.fillText(i?'芝加哥   1942':'馆藏文献   12 · 02',77,95);
    for(let j=0;j<4;j++)g.fillRect(82,137+j*38,265-(j%3)*37,5);
    g.beginPath();g.moveTo(415,275);for(let j=0;j<90;j++)g.lineTo(415+j*2.6,268-j*.9+10*Math.sin(j*.27));g.stroke();}));
  for(const [i,x] of [-2.35,2.35].entries()){
    panel(b,cards[i],x,2.15,-3.54,3.25,1.77,wood);
    rod(b,iron,[x-.67,.23,-2.24],[x-.67,1.18,-2.25],.065);rod(b,iron,[x+.67,.23,-2.24],[x+.67,1.18,-2.25],.065);
    b.box(wood,x,1.12,-2.22,2.24,.12,.71);b.box(brass,x,.11,-1.53,.77,.16,.31);}
  for(const x of [-4.35,4.31]){b.cylinder(iron,x,.95,-1.45,.075,.13,1.9);b.cylinder('#c7a365',x,2.01,-1.46,.24,.42,.31);}
  const sheet=paint(st,'#e9dcb8',g=>{g.strokeStyle='#a69d83';g.lineWidth=1;for(let i=0;i<40;i++)g.strokeRect(i*21,37,21,307);
    g.strokeStyle='#5d6e63';g.lineWidth=4;g.beginPath();g.moveTo(28,277);for(let i=0;i<156;i++)g.lineTo(28+i*4.55,246-i*.46+18*Math.sin(i*.14)+8*Math.sin(i*.63));g.stroke();});
  const paper=b.box(sheet,0,.053,.57,4.98,.075,1.09,b.root);
  const roller=b.cylinder('#d6bb8b',-2.45,.24,.57,.23,.23,1.35,b.root);roller.rotation.x=Math.PI/2;
  const slips=[0,1].map(i=>{const p=b.group();p.position.set(i?1.67:-1.66,.10,-1.19);b.box(i?'#a65145':jade,0,0,0,.23,.055,.54,p);batch(p);return p;});
  const folios=cards.map((mat,i)=>{const leaf=b.group();leaf.position.set(i?2.35:-2.35,1.20,-2.26);
    b.box(mat,0,.014,.30,1.6,.025,.60,leaf);batch(leaf);return leaf;});
  const shades=[-4.35,4.31].map(x=>{const bulb=st.glow('#ffe2a2',1.12,.54);bulb.position.set(x,1.82,-1.45);b.root.add(bulb);return bulb;});
  const lamp=b.oval('#f3c973',2.82,.40,1.34,.25,.14,.25,b.root);b.cylinder(iron,2.82,.15,1.34,.29,.36,.29);
  return s=>{paper.scale.x=.42+4.58*s.travel;paper.position.x=-2.48+paper.scale.x*.5;roller.position.x=-2.34+4.82*s.travel;roller.rotation.z=s.travel*8;
    slips.forEach((m,i)=>m.visible=!!(s.mask&(1<<i)));folios.forEach((m,i)=>{m.visible=!!(s.mask&(1<<i));m.rotation.x=-.18-.81*T.MathUtils.smoothstep(s.end,0,1.4);});
    shades.forEach(m=>m.visible=s.end>=0);lamp.scale.setScalar(s.end<0?.16:.22+.11*Math.min(1,s.end));};
};
export const message:Builder=(b,st)=>{
  floor(b,'#686b67');b.box('#404c52',0,1.79,-3.39,9.7,3.57,.34);
  for(let i=0;i<5;i++){const x=i*1.97-3.98;b.box('#677d81',x,2.01,-3.17,1.78,2.19,.12);
    for(let j=0;j<2;j++)b.box(j===i%2?'#e2cc89':'#5b6e78',x-.45+j*.89,2.12,-3.075,.69,1.67,.04);}
  b.box(iron,-.54,.49,-1.96,4.36,.94,1.16);b.box('#36544e',-.54,1.65,-2.19,4.21,1.75,.45);
  const grid=b.group();grid.position.set(-.53,1.68,-1.87);
  const letters=[['10001','10001','11111','10001','10001'],['11111','00100','00100','00100','11111'],['01010','11111','11111','01110','00100']];
  const strips=letters.map((bits,i)=>{const p=b.group(grid);
    for(let j=0;j<5;j++)for(let r=0;r<5;r++)if(bits[r][j]==='1')b.box('#acd894',-.30+j*.15,(2-r)*.16,0,.105,.105,.05,p);
    p.position.x=(i-1)*1.24;batch(p);return p;});
  const keyMat=['#c39c6b','#c3b48a','#97a99b'];
  for(const [i,x] of [-2.2,0,2.2].entries()){b.box(iron,x,.068,.35,1.60,.13,1.09,b.fixed,'solid-key-well');b.box(label(st,keyMat[i],['—','│','╱'][i],iron),x,.15,.35,1.40,.12,.92,b.fixed,'solid-key-cap');}
  const phone=b.group();phone.position.set(3.05,.56,-1.55);phone.rotation.z=-.13;
  b.box(iron,0,.72,0,1.0,1.98,.55,phone);b.box('#9eaa87',0,1.08,.31,.77,.46,.06,phone);
  for(let k=0;k<9;k++)b.box('#b3ad9b',(k%3-1)*.23,.65-Math.floor(k/3)*.16,.33,.15,.08,.06,phone);
  rod(b,iron,[.32,1.65,0],[.41,2.35,0],.055,phone);batch(phone);
  const signal=[0,1,2,3].map(i=>b.oval('#d4dc9b',0,0,0,.10,.08,.10,b.root));
  b.cylinder(brass,2.72,.11,1.27,.38,.43,.22,b.fixed).name='solid-send';
  return(s,t)=>{strips.forEach((p,i)=>p.visible=i<s.step);
    signal.forEach((m,i)=>{const k=Math.max(0,Math.min(1,s.end*1.34-i*.13));m.visible=s.end>=0&&k<1;m.position.set(-.43+k*3.63,2.35+Math.sin(k*Math.PI)*.75,-1.76);});
    phone.rotation.z=-.13+(s.end>.75?.04*Math.sin(t*26):0);};
};
export const rover:Builder=(b,st)=>{
  floor(b,paint(st,'#b48467',g=>{g.fillStyle='#956c57';for(let n=0;n<340;n++){const x=n*971%768,y=n*433%384;g.beginPath();g.ellipse(x,y,2+n%6,1+n%3,0,0,7);g.fill();}}));
  for(let i=0;i<12;i++){const x=-6+i*1.12;b.oval(i%2?'#ad7c66':'#947064',x,.32,-4.6-i%3,1.93,1.02+(i*7%4)*.4,1.43);}
  const land=b.group();land.position.set(-1.26,.62,-1.38);
  b.part(new T.CylinderGeometry(.83,1.22,.63,6),'#c9ab76',0,0,0,1,1,1,land);
  for(const k of [-1,1]){b.oval('#b0987d',k*.98,-.13,0,.65,.42,.67,land);rod(b,cream,[k*.43,.2,0],[k*1.26,-.29,.29],.064,land);}
  rod(b,iron,[0,.20,0],[0,1.40,0],.052,land);
  const dish=b.part(new T.SphereGeometry(.40,18,7,0,Math.PI*2,0,1.27),'#c4c9ad',0,1.02,.02,1,.45,1,land);dish.rotation.z=.5;batch(land);
  const ramp=b.group();ramp.position.set(-1.85,.36,-.78);b.box('#8c9281',0,0,.83,.76,.10,1.66,ramp);
  for(let i=0;i<9;i++)b.box(cream,0,.072,.10+i*.18,.69,.04,.05,ramp);batch(ramp);
  const car=b.group();b.box('#b8a169',0,.28,0,.72,.36,.63,car);b.box('#516c77',0,.50,0,.82,.08,.72,car);
  for(let i=0;i<3;i++)for(const k of [-1,1]){const w=b.cylinder(iron,k*.41,.14,-.27+i*.27,.17,.17,.14,car);w.rotation.z=Math.PI*.5;}
  b.oval(cream,0,.65,.16,.11,.13,.1,car);batch(car);
  for(let i=0;i<9;i++)b.oval('#926d5c',2.52+Math.sin(i)*.77,.12,-1.94+i*.17,.16+i%2*.1,.13,.19);
  const tracks=Array.from({length:9},()=>{const track=b.group();for(const k of [-1,1])b.box('#886e59',k*.30,0,0,.12,.017,.095,track);batch(track);return track;});
  return(s)=>{ramp.rotation.x=-1.15*(1-s.travel)+.14*s.travel;
    const q=T.MathUtils.smoothstep(s.end,0,1.55),dx=s.selected?3.35:1.31;car.position.set(-1.84+q*dx,.37*(1-q)+.08,-.84+q*2.25);car.rotation.y=q*(s.selected?1.06:.42);
    tracks.forEach((track,i)=>{const f=.18+i*.083;track.visible=q>f;track.position.set(-1.84+f*dx,.027,-.84+f*2.25);track.rotation.y=Math.atan2(dx,2.25);});};
};
export const drum:Builder=(b,st)=>{
  floor(b,paint(st,'#9a7455',g=>{g.strokeStyle='#7d5f4b';for(let i=0;i<8;i++)g.strokeRect(0,i*56,768,56);}));
  b.box('#9a8971',0,1.75,-3.52,10,3.52,.3);const birds=[0,1].map(i=>paint(st,'#e3cda0',g=>{
    g.strokeStyle='#495b5b';g.lineWidth=15;g.lineCap='round';g.beginPath();g.moveTo(155,i?173:222);
    g.quadraticCurveTo(260,i?275:115,384,213);g.quadraticCurveTo(485,i?267:112,610,i?165:222);g.stroke();g.fillStyle='#b99160';g.fillRect(72,315,625,5);}));
  for(const [i,x] of [-3.46,3.46].entries()){panel(b,birds[i],x,1.9,-3.31,2.05,1.29,wood);panel(b,birds[1-i],x,.71,-1.07,1.12,.68,wood);}
  const wheel=b.group();wheel.position.set(0,1.20,-1.38);
  b.cylinder(iron,0,-.59,0,1.25,1.18,.20,wheel);b.cylinder('#ccac70',0,0,0,1.08,1.08,.98,wheel);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const leaf=b.box(i%2?birds[0]:birds[1],1.09*Math.sin(a),.0,1.09*Math.cos(a),.49,.73,.055,wheel);leaf.rotation.y=a;
    const lip=b.box(iron,1.20*Math.sin(a),.57,1.20*Math.cos(a),.49,.62,.11,wheel);lip.rotation.y=a;}
  batch(wheel);b.cylinder(brass,0,.31,-1.38,.30,.62,.61);
  for(const k of [-1,1]){rod(b,wood,[k*3.49,0,-.99],[k*3.66,.76,-1.01],.055);b.cylinder(brass,k*2.4,.1,.92,.22,.28,.2);}
  const shutter=b.group();shutter.position.set(0,.73,.02);b.box(wood,0,.09,0,1.12,.35,.075,shutter);b.box(brass,.45,.10,.06,.12,.11,.05,shutter);batch(shutter);
  let angle=0,last=0;return(s,t)=>{const dt=Math.min(.075,Math.max(0,t-last));last=t;angle+=dt*(s.end>=0?7:s.count*1.7);wheel.rotation.y=angle;
    shutter.position.x=-1.11*T.MathUtils.smoothstep(s.end,0,1.0);};
};
export const foil:Builder=(b,st)=>{
  floor(b,'#967457');b.box('#799388',0,1.61,-3.43,10.23,3.23,.24);
  for(let i=0;i<4;i++)panel(b,label(st,cream,['锡 箔','音 纹','振 膜','回 放'][i],iron),-3.4+i*2.27,2.45,-3.24,1.45,.47,wood);
  const player=b.group();player.position.set(0,.95,-1.52);
  const roll=b.cylinder('#b9b8a8',0,0,0,.57,.57,3.77,player);roll.rotation.z=Math.PI/2;
  for(let i=0;i<29;i++){const r=ring(b,i%2?'#878b83':'#c4c4ac',-1.79+i*.128,0,0,.572,.015,player,false);r.rotation.y=Math.PI/2;}
  batch(player);
  for(const x of [-2.18,2.18]){
    b.box(wood,x,.12,-1.52,.72,.24,1.26);b.part(new T.ConeGeometry(.42,1.0,4),'#56615b',x,.65,-1.52,1,1,1);
    rod(b,brass,[x,.96,-1.52],[x*.78,.96,-1.52],.09);}
  const horn=b.group();horn.position.set(-3.27,1.35,-1.96);horn.rotation.z=.77;
  const bell=b.part(new T.CylinderGeometry(.78,.11,1.20,24,1,true),brass,0,.65,0,1,1,1,horn);
  bell.material=st.toon(brass,{side:T.DoubleSide});ring(b,cream,0,1.25,0,.78,.043,horn);batch(horn);
  const needle=b.group();rod(b,iron,[0,.02,0],[0,.53,.17],.046,needle);b.oval(brass,0,.61,.18,.17,.17,.09,needle);batch(needle);
  const glyphs=[0,1,2].map(i=>ring(b,red,-1.1+i*1.09,.94,-1.52,.584,.025,b.root,false));for(const r of glyphs)r.rotation.y=Math.PI/2;
  return(s,t,x)=>{const q=T.MathUtils.clamp(s.end/1.68,0,1);
    needle.position.set(s.end<0?Math.max(-1.69,Math.min(1.69,x*.75)):-1.67+q*3.34,s.step===2&&!s.flat?1.57:1.43,-1.39);
    player.rotation.x=(s.step>0?t*.82:0);glyphs.forEach((m,i)=>m.visible=i<s.notes.length);horn.rotation.z=.77+(s.end>=0?.023*Math.sin(t*22):0);};
};
