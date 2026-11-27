/** Paper lightbox, lunar communications display, archive street, field notebook and tidal quay. */
import * as T from 'three';
import {floor,paint,panel,label,rod,ring,batch,wood,jade,brass,cream,red,iron} from './december-chapters';
import {type WinterBuilder,grain,inked,starwall,peaked,dish,shed} from './winter-chapters';
export const lecture:WinterBuilder=(b,st)=>{
  floor(b,grain(st));b.box('#677469',0,1.78,-3.95,10.25,3.72,.23);
  for(const x of [-4.57,4.57])for(let j=0;j<6;j++){b.oval(j%2?'#845a50':'#995f51',x+(x<0?1:-1)*j*.16,1.88,-3.68,.18,1.98-j*.08,.14);}
  panel(b,paint(st,'#eee5c9',g=>{g.fillStyle='#c8c2a2';g.fillRect(82,73,604,2);g.fillRect(82,313,604,2);}),0,2.15,-3.66,6.75,2.97,wood);
  b.box(iron,.08,.13,.15,1.6,.26,1.06);b.box('#efe0af',.08,.291,.15,1.34,.04,.81);
  const slides=['branch','page'].map((x,i)=>{const p=b.group();b.box(iron,0,0,0,1.17,.065,.78,p);b.box(inked(st,x as 'branch'|'page'),0,.052,0,1.02,.031,.64,p);batch(p);
    p.position.set(i?2.04:-2.10,.11,-.72);return p;});
  const projections=[-1,1].map((k,i)=>b.box(inked(st,i?'page':'branch'),k*1.16,2.15,-3.485,2.12,1.62,.032,b.root));
  b.cylinder(iron,3.60,.13,-.70,.34,.46,.26);rod(b,iron,[3.60,.19,-.70],[3.60,1.31,-.70],.069);rod(b,iron,[3.60,1.31,-.70],[3.12,1.73,-.54],.064);
  b.oval('#393c3b',3.06,1.77,-.51,.21,.09,.10);for(let i=0;i<3;i++)b.box(cream,-3.40+i*.12,.07+i*.052,1.68,.73,.06,.49);
  return(s,t,x,z)=>{slides.forEach((m,i)=>{const held=s.carry===i,installed=!!(s.mask&(1<<i));
    m.position.set(held?x:installed?.08:i?2.04:-2.10,held?.47:installed?.36+i*.08:.11,held?z-.16:installed?.15:-.72);
    projections[i].visible=installed;projections[i].scale.y=1.55+(s.end>=0?.18*Math.min(1,s.end):0);});
    if(s.end>=0)slides[1].rotation.z=.13*Math.sin(Math.min(1,s.end)*Math.PI);};
};
export const relay:WinterBuilder=(b,st)=>{
  floor(b,paint(st,'#94a0a0',g=>{for(let i=0;i<66;i++){const x=i*173%755,y=i*139%384;g.strokeStyle=i%2?'#788b8b':'#b2b8ac';g.lineWidth=3;g.beginPath();g.ellipse(x,y,7+i%4*4,3+i%6,.12,0,7);g.stroke();}}));
  starwall(b,st,'#253a48');for(let i=0;i<8;i++)peaked(b,i%2?'#74898e':'#879799',-5.38+i*1.6,.28,-3.72-i%2,2.23,1.19+i%4*.34,.73);
  const ridge=peaked(b,'#89969a',0,.42,-.34,3.17,.91,.41);ridge.name='solid-central-ridge';
  const satellite=b.group();satellite.position.set(-.26,2.66,-2.57);
  b.box('#a99970',0,0,0,.61,.45,.47,satellite);for(const k of [-1,1]){b.box('#496b79',k*.71,0,0,.70,.34,.06,satellite);
    for(let j=0;j<4;j++)b.box(cream,k*(.44+j*.15),0,.045,.018,.32,.02,satellite);}batch(satellite);dish(b,satellite,0,.22,0,.52);
  const lamps=[0,1].map(i=>{const x=i?2.46:-2.42;dish(b,b.root,x,.02,-1.28,1.10);return b.oval('#c7ce8d',x,1.29,-1.26,.10,.10,.10,b.root);});
  const beams=[-2.42,2.46].map(x=>rod(b,'#d9c580',[x,1.24,-1.28],[-.25,2.67,-2.56],.026,b.root));
  b.oval('#b1c9c0',3.75,3.33,-4.75,.53,.53,.53);
  return(s,t)=>{satellite.rotation.y=.17*Math.sin(t*.7);beams.forEach((m,i)=>m.visible=s.step>=2+i||s.step===1+i&&s.canSee);lamps.forEach((m,i)=>m.scale.setScalar(s.step>=i+2?.16:.064));};
};
export const street:WinterBuilder=(b,st)=>{
  floor(b,paint(st,'#9aa5a0',g=>{g.strokeStyle='#798581';g.lineWidth=2;for(let j=0;j<7;j++)for(let i=-1;i<12;i++)g.strokeRect(i*87+(j%2)*42,j*59,87,59);}));
  const brick=paint(st,'#a59683',g=>{g.strokeStyle='#807967';g.lineWidth=2;for(let j=0;j<8;j++)for(let i=-1;i<11;i++)g.strokeRect(i*83+(j%2)*40,j*48,83,48);});
  b.box(brick,0,1.52,-3.88,11.14,3.05,.36);b.box('#d1d0b9',0,3.10,-3.87,11.49,.15,.70);
  const windows=[-2.48,2.48].map((x,i)=>{panel(b,inked(st,i?'page':'lane'),x,1.74,-3.54,2.54,1.67,wood);
    b.box('#66706b',x,2.71,-3.34,2.96,.16,.72).rotation.x=.11;b.box('#dbd9c3',x,2.83,-3.34,2.98,.055,.73).rotation.x=.11;
    const shutter=b.group();shutter.position.set(x-1.19,1.73,-3.30);b.box(wood,.59,0,0,1.18,1.66,.10,shutter);
    for(let j=0;j<5;j++)b.box('#a49477',.59,-.61+j*.30,.07,1.10,.12,.035,shutter);batch(shutter);return shutter;});
  shed(b,0,-4.86,2.2,'#b6a994');for(const k of [-1,1]){const x=k*4.12;rod(b,iron,[x,0,-1.53],[x,2.30,-1.53],.063);
    b.box('#e2cda4',x,2.33,-1.53,.31,.42,.27);b.box(iron,x,2.59,-1.53,.45,.09,.36);}
  const pages=[-1,1].map((k,i)=>b.box(inked(st,i?'page':'lane'),.2+k*.64,.094,.43,1.25,.07,.91,b.root));
  return(s,t)=>{windows.forEach((m,i)=>{const open=!!(s.mask&(1<<i));m.rotation.y=-(open?1.38:.09*Math.sin(t*3));pages[i].visible=open;
    if(s.end>=0)pages[i].rotation.z=-i*.13*Math.sin(Math.PI*Math.min(s.end,1));});};
};
export const sorghum:WinterBuilder=(b,st)=>{
  const earth=paint(st,'#b59e72',g=>{g.strokeStyle='#967653';g.lineWidth=8;for(let i=-2;i<14;i++){g.beginPath();g.moveTo(50*i,384);g.lineTo(50*i+83,0);g.stroke();}});
  floor(b,earth);for(let i=0;i<6;i++)peaked(b,i%2?'#91a694':'#aaba9e',-5+i*2.1,.35,-5-i%2*1.1,3,1.55+i%3*.38,.84);
  shed(b,2.91,-3.02,2.45,'#c7b38b');
  const grainHeads=b.group();for(let i=0;i<65;i++){const left=i%3!==0,x=left?-3.98+(i%9)*.32:1.62+(i%6)*.39,z=-2.18+Math.floor(i/9)*.45;
    const h=.54+(i*19%30)/45;rod(b,'#858b5c',[x,0,z],[x+.07,h,z],.025);
    const leaf=b.oval('#94985c',x-.08,h*.56,z,.028,.24,.062);leaf.rotation.z=.56;
    const g=b.oval(i%2?'#994b3f':'#b26648',x+.075,h+.12,z,.062,.17,.062,grainHeads);g.rotation.z=-.22;}
  batch(grainHeads);
  b.box(wood,.16,.075,1.64,2.53,.15,1.04);const frames=[-1,1].map((k,i)=>b.box(inked(st,i?'field':'lane'),.16+k*.60,.175,1.64,1.16,.038,.86,b.root));
  return(s,t)=>{grainHeads.rotation.z=.008*Math.sin(t*1.3);frames.forEach((m,i)=>{m.visible=s.step>i;
    if(s.end>=0){m.rotation.x=-.62*Math.min(1,s.end);m.position.y=.18+.44*Math.min(1,s.end);}if(i===0)m.rotation.y=s.chosen===1?.18:0;});};
};
export const harbor:WinterBuilder=(b,st)=>{
  const wharf=grain(st,'#a48968');floor(b,wharf);const sea=paint(st,'#759e9e',g=>{g.strokeStyle='#bfcec0';g.lineWidth=3;
    for(let i=0;i<42;i++){const x=i*139%718,y=i*61%375;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+14,y+7,x+34,y);g.stroke();}});
  b.box(sea,0,-.31,-4.87,13.3,.20,4.32);for(let i=0;i<5;i++)shed(b,-5.86+i*2.64,-7.04,1.93,'#b8aa93');
  const ships=[-1,1].map((k,i)=>{const p=b.group();p.position.set(k*2.73,-.13,-3.58);
    const sh=new T.Shape();sh.moveTo(-1.02,.19);sh.lineTo(-.82,-.14);sh.lineTo(.72,-.14);sh.lineTo(1.15,.17);sh.closePath();
    b.part(new T.ExtrudeGeometry(sh,{depth:.55,bevelEnabled:false}),i?'#687d80':jade,0,.16,0,1,1,1,p);
    b.box(cream,-.56,.51,.28,.50,.53,.52,p);for(let j=0;j<4;j++)b.box(j%2?red:'#b79e63',-.07+j*.23,.38,.25,.21,.32,.42,p);
    rod(b,iron,[-.73,.55,.16],[-.73,1.14,.16],.027,p);batch(p);return p;});
  const gauges=[-2.48,2.47].map(x=>{b.box(iron,x,.71,-1.34,.20,1.40,.18);b.box(brass,x,1.02,-1.226,.25,.13,.045);return b.box('#e3c69c',x,.7,-1.17,.36,.07,.10,b.root);});
  const bridges=[-2.48,2.47].map(x=>{const p=b.group();p.position.set(x,.11,-2.36);b.box(wood,0,0,-.47,.74,.11,.94,p);for(let i=0;i<5;i++)b.box(brass,0,.075,-.12-i*.18,.64,.027,.035,p);batch(p);return p;});
  const bell=b.group();bell.position.set(3.32,1.02,1.17);b.cylinder(brass,0,0,0,.15,.36,.42,bell);b.oval(iron,0,-.22,0,.07,.09,.07,bell);batch(bell);
  rod(b,wood,[3.63,0,1.17],[3.63,1.47,1.17],.067);
  return(s,t)=>{ships.forEach((m,i)=>{m.position.y=-.23+s.tide*.26;m.position.x=(i?1:-1)*(2.73+Math.max(0,s.end)*1.28);});
    gauges.forEach(m=>m.position.y=.32+s.tide);bridges.forEach((m,i)=>m.rotation.x=s.mask&(1<<i)?-.18:1.06);bell.rotation.z=s.end>=0?.27*Math.sin(t*10):0;};
};
