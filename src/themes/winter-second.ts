/** Bespoke orbit table, recovery deck, wooden mouse, medal tray and paired atlas lenses. */
import * as T from 'three';
import {floor,paint,panel,label,rod,ring,batch,wood,jade,brass,cream,red,iron} from './december-chapters';
import {type WinterBuilder,grain,inked,starwall,dish} from './winter-chapters';
export const jovian:WinterBuilder=(b,st)=>{
  floor(b,paint(st,'#3f5565',g=>{g.strokeStyle='#8d9f96';g.lineWidth=3;g.strokeRect(22,24,724,339);for(let i=0;i<20;i++)g.fillRect(47+i*34,335,2,11+(i%5)*3);}));
  starwall(b,st,'#202d44');const gas=paint(st,'#c7a276',g=>{
    const tones=['#d7b88a','#b47f5e','#ccad82','#cf9c75','#c3ac87','#dfcaa0'];
    for(let j=0;j<16;j++){g.fillStyle=tones[j%6];g.beginPath();for(let i=0;i<=32;i++){const x=i*24,y=j*24+7*Math.sin(i*.36+j*.45);if(!i)g.moveTo(x,y);else g.lineTo(x,y);}g.lineTo(768,392);g.lineTo(0,392);g.fill();}
    g.fillStyle='#b47353';g.beginPath();g.ellipse(508,230,67,22,-.13,0,7);g.fill();g.strokeStyle='#dfb98b';g.lineWidth=5;g.stroke();});
  const planet=b.part(new T.SphereGeometry(1,46,28),gas,0,2.22,-2.86,1.50,1.43,1.5,b.root);
  const orbit=ring(b,brass,0,2.19,-1.86,2.23,.034,b.fixed,false);orbit.scale.y=.58;
  const orbiter=b.group();b.box(brass,0,0,0,.34,.20,.23,orbiter);for(let i=0;i<2;i++)b.box('#607f8c',i?.33:-.33,0,0,.29,.15,.05,orbiter);batch(orbiter);dish(b,orbiter,.01,.06,0,.38);
  const arc=b.part(new T.TorusGeometry(2.23,.08,8,21,.57),'#e0ca82',0,0,0,1,1,1,b.root);
  const stand=b.group();stand.position.set(0,2.19,-1.85);stand.scale.y=.58;stand.add(arc);
  const reel=[-1,1].map(k=>b.box(gas,k*.50,.13,1.79,.88,.05,.46,b.root));
  for(let i=0;i<6;i++){b.cylinder(iron,-3.58+i*.21,.12,1.64,.074,.093,.25);}
  return(s,t)=>{const radius=s.end<0?2.23:2.23+Math.min(1,s.end)*.40;
    orbiter.position.set(radius*Math.cos(s.phase),2.19+radius*.58*Math.sin(s.phase),-1.56);orbiter.rotation.z=.20*Math.sin(s.phase);
    planet.rotation.y=.12*t;arc.rotation.z=s.arc-.285;arc.visible=!s.ready;reel.forEach((m,i)=>m.visible=s.step>i);};
};
export const recovery:WinterBuilder=(b,st)=>{
  floor(b,paint(st,'#859292',g=>{g.strokeStyle='#596e70';for(let i=0;i<15;i++){g.beginPath();g.moveTo(i*59,0);g.lineTo(i*59,384);g.stroke();}for(let j=0;j<3;j++)g.strokeRect(20,11+j*129,728,113);}));
  const wave=paint(st,'#6996a0',g=>{g.lineWidth=4;for(let j=0;j<48;j++){g.strokeStyle=j%2?'#90b6b8':'#c0d1c2';const x=j*61%735,y=j*157%384;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+18,y+9,x+41,y-1);g.stroke();}});
  b.box(wave,0,-.30,-5,14,.22,4.59);for(const x of [-3.35,3.35]){rod(b,brass,[x,0,-2.11],[x,2.86,-2.11],.12);
    rod(b,iron,[x,0,-1.59],[x,2.12,-2.11],.066);}rod(b,brass,[-3.55,2.89,-2.11],[3.55,2.89,-2.11],.13);
  const pod=b.group();b.cylinder('#d1cbb4',0,.44,0,.44,.82,.82,pod);b.cylinder(iron,0,.035,0,.81,.73,.16,pod);b.cylinder(cream,0,.91,0,.26,.45,.13,pod);
  for(const side of [-1,1])b.box('#516a73',side*.27,.55,.60,.27,.23,.055,pod).rotation.z=side*.15;
  batch(pod);const collar=ring(b,'#ba7353',0,.13,0,.88,.13,pod);
  const ropes=[-1,1].map(k=>rod(b,cream,[k*2.8,2.69,-2.09],[k*.52,.34,-2.73],.035,b.root));
  for(const x of [-2.05,2.04]){const m=b.cylinder(iron,x,.17,-.82,.30,.35,.34);ring(b,brass,x,.39,-.82,.32,.050);m.rotation.y=.2;}
  for(let i=0;i<6;i++)b.oval('#ac825b',-3.5+i*.15,.082,1.55,.09,.07,.16);
  const a=new T.Vector3(),c=new T.Vector3(),up=new T.Vector3(0,1,0);return(s,t)=>{
    const lift=T.MathUtils.smoothstep(s.end,0,1.6);pod.position.set(0,-.12+.056*Math.sin(t*2)+lift*1.22,-3.2+lift*1.30);
    pod.rotation.z=(s.left-s.right)*.18+(s.ready?0:.035*Math.sin(t*1.6));collar.visible=s.pin;
    ropes.forEach((m,i)=>{const k=i?1:-1;a.set(k*2.80,2.69,-2.09);c.set(k*.53,pod.position.y+.48,pod.position.z+.23);
      m.position.copy(a).lerp(c,.5);c.sub(a);m.scale.y=c.length()/2.95;m.quaternion.setFromUnitVectors(up,c.normalize());});};
};
export const mouse:WinterBuilder=(b,st)=>{
  floor(b,grain(st,'#aa9171'));
  b.box('#797c6c',0,1.87,-3.60,7.05,3.67,.76);
  b.box('#2d4647',-.34,2.11,-3.14,5.36,2.55,.17);
  for(let i=0;i<10;i++)b.box('#a5a489',2.82,1.20+i*.17,-3.10,.39,.045,.08);
  const idx=paint(st,'#668279',g=>{g.fillStyle='#ccd1ae';g.fillRect(4,10,760,88);g.fillStyle='#425950';g.font='47px monospace';g.fillText('INDEX',35,73);
    g.fillStyle='#cbd3b2';for(let i=0;i<3;i++)g.fillRect(61,142+i*64,549-i*62,6);});
  const window=b.group();b.box(idx,0,0,0,1.65,.83,.07,window);batch(window);
  const frame=b.group();for(const side of [-1,1]){b.box('#b2c5a2',side*.88,0,0,.024,.94,.03,frame);b.box('#b2c5a2',0,side*.47,0,1.77,.024,.03,frame);}batch(frame);
  const cursor=b.group();rod(b,cream,[-.105,0,0],[.105,0,0],.016,cursor);rod(b,cream,[0,-.105,0],[0,.105,0],.016,cursor);batch(cursor);
  const pointer=b.group();b.box(wood,0,.32,0,.83,.47,1.04,pointer);b.box(red,0,.59,-.12,.18,.08,.35,pointer);
  for(const k of [-1,1]){const wheel=b.cylinder(iron,k*.43,.18,.03,.15,.15,.09,pointer);wheel.rotation.z=Math.PI/2;}batch(pointer);
  const coord=(x:number,z:number)=>[x*.51-.34,2.09-z*.42];
  const docs=[[-2.23,.98],[2.13,-.85]].map(([x,z],i)=>{
    const [sx,sy]=coord(x,z),link=b.group();link.position.set(sx,sy,-2.86);
    b.box(inked(st,i?'page':'lane'),0,.17,0,.92,.48,.045,link);
    b.box('#e4d4a2',0,0,.047,.82,.032,.036,link);batch(link);return link;
  });
  const from=coord(-1.87,-.67),to=coord(1.39,.41);frame.position.set(to[0],to[1]-.25,-2.98);
  return(s,t,x,z)=>{const pos=coord(x,z);cursor.position.set(pos[0],pos[1],-2.78);
    const p=s.step===0?from:s.step===1?pos:to;window.position.set(p[0],p[1]-.25,-2.91);frame.visible=s.step<2;window.visible=s.step<2||s.ready;
    pointer.position.set(x*.57,0,z*.67);docs.forEach((m,i)=>{m.visible=s.step>=2;if(s.chosen===i)m.scale.y=1.04;});
    if(s.end>=0)window.position.x+=.32*Math.min(1,s.end);};
};
export const medal:WinterBuilder=(b,st)=>{
  floor(b,grain(st,'#9c7d62'));
  const curtain=paint(st,'#785949',g=>{for(let i=0;i<28;i++){g.fillStyle=i%2?'#8b6550':'#725646';g.fillRect(i*28,0,14,384);}g.fillStyle='#d0af75';g.fillRect(0,325,768,9);});
  b.box(curtain,0,1.89,-4.36,11,3.83,.28);for(const k of [-1,1]){b.cylinder(cream,k*3.73,1.59,-3.22,.20,.25,3.18);b.cylinder(brass,k*3.73,.14,-3.22,.32,.37,.28);}
  panel(b,label(st,'#d9c8a2','1901',iron),0,2.83,-4.1,2.28,.78,wood);
  const velvet=paint(st,'#476566',g=>{g.strokeStyle='#c9b37b';g.lineWidth=3;g.strokeRect(27,21,714,342);for(const x of [120,648]){g.beginPath();g.ellipse(x,195,73,114,0,0,7);g.stroke();}});
  const tray=b.group();tray.position.set(0,.79,-1.43);b.box(wood,0,0,0,4.85,.20,1.58,tray);b.box(velvet,0,.118,0,4.68,.035,1.40,tray);batch(tray);
  b.cylinder(brass,0,.32,-1.43,.32,.52,.64);
  const coin=b.group();const med=b.cylinder(brass,0,0,0,.37,.37,.11,coin);med.rotation.x=Math.PI*.5;ring(b,cream,0,0,.073,.295,.021,coin,false);
  for(let j=0;j<6;j++)b.oval('#ad854e',Math.cos(j*.76)*.15,Math.sin(j*.76)*.15,.095,.045,.076,.032,coin);batch(coin);
  const lid=b.group();lid.position.set(0,.94,-2.20);for(const k of [-1,1]){b.box(brass,k*2.34,.57,0,.048,1.15,.055,lid);b.box(brass,0,k*.57+.57,0,4.74,.05,.055,lid);}batch(lid);
  return(s,t,x)=>{tray.rotation.z=-x*.028;coin.position.set(s.medalX,1.28+tray.rotation.z*s.medalX,-1.36);coin.rotation.z=-s.medalX/.37;
    lid.rotation.x=-.91+1.15*T.MathUtils.smoothstep(s.end,0,1.5);};
};
export const atlas:WinterBuilder=(b,st)=>{
  floor(b,grain(st,'#a39073'));b.box('#8d9c92',0,1.82,-4.01,10.1,3.71,.27);
  const spine=b.group();spine.position.set(0,1.56,-2.96);b.box(wood,0,0,0,5.92,2.96,.28,spine);
  for(const k of [-1,1])b.box(cream,k*1.42,0,.17,2.76,2.77,.045,spine);b.box('#907859',0,0,.19,.065,2.8,.041,spine);batch(spine);
  const pages=[-1,1].map((k,i)=>{const disc=b.part(new T.CircleGeometry(.89,40),inked(st,i?'diamond':'circle'),k*1.44,1.74,-2.74,1,1,1);
    ring(b,wood,k*1.44,1.74,-2.68,.89,.084,b.fixed,false);return disc;});
  const aids=[-1,1].map((k,i)=>{const p=b.group();b.box(inked(st,i?'diamond':'circle'),0,0,0,.99,.06,.76,p);batch(p);return p;});
  const lens=b.group();ring(b,brass,0,0,0,.37,.045,lens,false);rod(b,wood,[.28,-.25,0],[.54,-.53,0],.039,lens);batch(lens);
  for(let j=0;j<4;j++){const x=-3.21-j*.19;b.box(j%2?jade:wood,x,.48,-1.75,.17,.95,.59);b.box(brass,x,.28,-1.43,.13,.052,.04);}
  return(s,t,x,z)=>{const side=s.carry;for(let i=0;i<2;i++){const k=i?1:-1;const m=aids[i],taken=!!(s.mask&(1<<i));m.position.set(side===i?x:k*2.05,side===i?.39:.09,side===i?z-.23:.73);m.visible=!taken;
      pages[i].scale.setScalar(taken?1:.87);}
    lens.position.set(x*.76,1.31-z*.33,-2.49);if(s.end>=0)spine.rotation.x=-.08*Math.sin(Math.min(1,s.end)*Math.PI);};
};
