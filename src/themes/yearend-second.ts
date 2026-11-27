/** Fabric flyer, orbit radio, winter street, four-lamp cabinet and a lunar viewing port. */
import * as T from 'three';
import {floor,paint,label,rod,ring,batch,wood,jade,brass,cream,red,iron} from './december-chapters';
import {grain,peaked,starwall} from './winter-chapters';
import {tiles,folded,ease} from './midwinter-chapters';
import {type Exhibit,globe,castBell,arc} from './yearend-chapters';
export const flyer:Exhibit=(b,st)=>{
 floor(b,paint(st,'#c3af87',g=>{g.strokeStyle='#ad9a79';g.lineWidth=3;for(let i=0;i<30;i++){const x=i*83%714,y=i*71%373;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+34,y-7,x+91,y+1);g.stroke();}}));
 for(let i=0;i<7;i++)peaked(b,i%2?'#c2ac89':'#b8a789',-6.09+i*1.91,.41,-4.66-.18*(i%2),3.25,.94+(i%3)*.21,.57);
 for(const k of [-1,1]){rod(b,wood,[k*.26,.08,-2.69],[k*.26,.08,1.91],.058);}
 for(let i=0;i<13;i++)b.box('#9b8062',0,.039,-2.67+i*.36,.91,.078,.105);
 const wingMat=paint(st,'#e5d8b4',g=>{g.strokeStyle='#ac9873';g.lineWidth=3;for(let j=0;j<21;j++){g.beginPath();g.moveTo(j*39,0);g.quadraticCurveTo(j*39+4,160,j*39,384);g.stroke();}
 g.strokeStyle='#c4b58e';g.strokeRect(5,5,758,374);});
 const plane=b.group();
 for(const h of [.29,1.02]){b.box(wingMat,0,h,0,4.28,.065,.79,plane);rod(b,wood,[-2.11,h-.04,.33],[2.11,h-.04,.33],.024,plane);}
 for(const x of [-1.96,-1.23,-.51,.51,1.23,1.96]){for(const z of [-.29,.29])rod(b,wood,[x,.32,z],[x,1.0,z],.022,plane);
 if(x<1.9)rod(b,'#8a856e',[x,.32,.29],[x+.63,1,.29],.009,plane);}
 for(const k of [-1,1]){rod(b,wood,[k*.32,.28,-.25],[k*.27,.58,-1.51],.032,plane);rod(b,wood,[k*.33,.26,.24],[k*.29,.42,1.02],.031,plane);}
 b.box(wingMat,0,.42,1.01,1.08,.04,.34,plane);for(const k of [-1,1])b.box(wingMat,k*.26,.65,-1.47,.04,.46,.46,plane);
 b.box('#736a56',.13,.42,-.12,.37,.23,.34,plane);batch(plane);
 const props=[-1,1].map(k=>{const g=b.group(plane);g.position.set(k*.65,.64,-.44);rod(b,wood,[-.31,-.13,0],[.31,.13,0],.031,g);batch(g);return g;});
 rod(b,wood,[-3.1,0,-1.64],[-3.1,2.39,-1.64],.047);const wind=b.group();wind.position.set(-3.1,2.32,-1.64);
 folded(b,'#bf7954',[[0,0,0],[.75,.027,0],[.91,-.10,0],[.11,-.19,.02]],wind);batch(wind);
 return(s,t)=>{const k=ease(s.end);plane.position.set(.12+.89*k,.19+k*1.28,-1.79+1.52*k);plane.rotation.y=.24+.24*k;
  plane.rotation.z=s.mask===1?.085:s.mask===2?-.085:.031*Math.sin(t*1.4)*(1-k);plane.rotation.x=-.10*k;wind.rotation.z=-.57+.46*s.cycle;props.forEach(p=>p.rotation.z=t*(s.end<0?3:21));};
};
export const broadcast:Exhibit=(b,st)=>{
 floor(b,grain(st,'#927b67'));starwall(b,st,'#26384a');
 b.box(wood,0,.53,-1.81,4.58,.95,1.35);b.box('#697e73',0,1.06,-1.81,4.40,.09,1.23);
 [-1,1].forEach(k=>{const g=b.group();g.position.set(k*1.08,1.13,-1.71);b.cylinder('#445353',0,.055,0,.66,.66,.07,g);for(const r of [.38,.46,.55,.61])ring(b,'#718075',0,.099,0,r,.009,g);
 b.cylinder('#c5ac78',0,.1,0,.20,.20,.028,g);arc(b,g,Array.from({length:10},(_,i)=>{const a=(k>0?.55:2.58)+i*.13-.58;return [.58*Math.cos(a),.115,.58*Math.sin(a)];}),brass,.026);batch(g);return g;});
 const arms=[-1,1].map(k=>{const p=b.group();p.position.set(k*1.08,1.29,-1.71);rod(b,cream,[0,0,0],[.57,-.04,0],.027,p);batch(p);return p;});
 const orbit=b.group();orbit.position.set(0,2.40,-3.64);const loop=ring(b,'#84958c',0,0,0,2.01,.023,orbit,false);loop.scale.y=.41;batch(orbit);
 const sat=b.group();b.box('#b2afa0',0,0,0,.46,.19,.18,sat);rod(b,brass,[-.49,.06,0],[.47,-.08,0],.025,sat);batch(sat);
 ring(b,brass,1.73,2.40,-3.37,.35,.035,b.fixed,false);const speakers=[-1,1].map(k=>{const p=b.group();p.position.set(k*2.38,.27,1.33);const h=b.part(new T.ConeGeometry(.34,.46,15,1,true),'#a28d6a',0,.19,0,1,1,1,p);h.rotation.x=-Math.PI/2;batch(p);return p;});
 const clips=[0,1].map(i=>b.box(paint(st,'#d8c29e',g=>{g.strokeStyle=i?'#7c6657':'#537568';g.lineWidth=6;g.beginPath();
  for(let j=0;j<=220;j++){const q=j/220,x=27+q*714,y=192+Math.sin(q*Math.PI*(i?22:13))*Math.sin(q*Math.PI)*104;if(j)g.lineTo(x,y);else g.moveTo(x,y);}g.stroke();}),0,.57,-1.094,1.38,.48,.038,b.root));
 return(s,t)=>{arms.forEach(p=>p.rotation.y=-s.needle);const a=s.t*1.43;sat.position.set(2.01*Math.cos(a),2.40+.82*Math.sin(a),-3.58);sat.rotation.z=.28*Math.sin(a);
  clips.forEach((m,i)=>{m.visible=!!(s.mask&(1<<i));m.position.x=s.chosen===i?-.73:.73;});
  speakers.forEach((p,i)=>{const v=s.end>=0?1+.15*Math.max(0,Math.sin(s.end*12+i*2.2)):1;p.scale.setScalar(v);});};
};
export const clock:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#869293','#798486'));const back=tiles(st,'#8d8880','#77796f');b.box(back,0,1.75,-3.94,9.1,3.50,.35);
 for(let i=0;i<7;i++){const x=-3.60+i*1.17;b.box('#53646a',x,2.62,-3.69,.69,.92,.06);b.box(wood,x,2.59,-3.63,.041,.86,.035);b.box(wood,x,2.60,-3.62,.68,.045,.038);}
 for(const k of [-1,1]){b.box('#695f51',k*1.36,1.65,-2.66,.22,3.30,.29);}b.box(iron,0,3.30,-2.66,3.17,.18,.46);
 const bell=castBell(b,b.root,.01,3.16,-2.64,.92);
 const pen=b.group();pen.position.set(0,2.06,-2.12);rod(b,brass,[0,0,0],[0,-1.15,0],.036,pen);b.oval('#a38c60',0,-1.29,0,.20,.23,.10,pen);batch(pen);
 const panes=[-1,1,0].map((k,i)=>{const p=b.group();p.position.set(k*2.11,.92+(i===1?.31:0),-2.43);
 b.box(wood,0,0,0,.91,.85,.13,p);b.box('#5f7474',0,0,.09,.73,.68,.05,p);batch(p);return p;});
 const lights=panes.map((p,i)=>{const m=b.box(paint(st,'#ddbe81',g=>{g.fillStyle='#816a51';g.fillRect(370,12,23,366);g.fillRect(6,182,760,19);
 g.fillStyle='#9e855b';for(let j=0;j<=i;j++)g.fillRect(59+j*91,235,45,59);}),0,0,.133,.70,.66,.023,p);return m;});
 for(const k of [-1,1]){rod(b,iron,[k*3.32,0,-.91],[k*3.32,1.82,-.91],.05);b.oval('#d8ba82',k*3.32,1.91,-.91,.16,.19,.15);}
 return(s,t)=>{pen.rotation.z=s.pendulum*.71;lights.forEach((p,i)=>p.visible=i===2?s.ready:!!(s.mask&(1<<i)));bell.rotation.z=s.end<0?0:.45*Math.sin(s.end*8)*(1-.60*ease(s.end));};
};
export const bulbs:Exhibit=(b,st)=>{
 floor(b,grain(st,'#9d896c'));b.box(tiles(st,'#b0aa95','#9c9b85'),0,1.66,-3.77,9.22,3.32,.25);
 const metal='#66756b';b.box(wood,0,.55,-2.19,6.65,1.10,1.0);b.box(metal,0,1.15,-2.16,6.48,.12,.91);
 const row=[-2.26,2.26,-.78,.78],lights=row.map((x,i)=>{b.cylinder(wood,x,1.28,-2.11,.30,.37,.19);
  for(const h of [1.43,1.51,1.59])b.cylinder(iron,x,h,-2.11,.20,.22,.061);
  const dark=b.oval('#9fafa4',x,1.91,-2.11,.27,.38,.26,b.root),on=b.oval('#f6d296',x,1.91,-2.11,.28,.4,.27,b.root);return [dark,on];});
 for(let j=0;j<4;j++){const x=row[j];rod(b,j%2?jade:brass,[x,1.21,-1.84],[x,1.21,-1.68],.023);}
 const doors=[-1,1].map(k=>{const p=b.group();p.position.set(k*3.40,1.70,-1.61);for(const h of [-.66,.66])b.box(brass,-k*.82,h,0,1.64,.062,.08,p);b.box(brass,-k*1.63,0,0,.062,1.33,.08,p);batch(p);return p;});
 b.box(wood,0,.14,.80,1.02,.28,.67);const beads=[-1,1].map(k=>b.oval('#eed199',k*.13,.34,.80,.086,.09,.086,b.root));
 return(s,t,x,z)=>{lights.forEach(([dark,on],i)=>{on.visible=!!(s.mask&(1<<i));dark.visible=!on.visible;});doors.forEach((g,i)=>g.rotation.y=(i?1:-1)*ease(s.end)*1.19);
  beads.forEach((m,i)=>{m.visible=!s.ready;m.position.set(s.stock>i?x+(i?.13:-.13):(i?.13:-.13),s.stock>i?.47:.34,s.stock>i?z-.25:.80);});};
};
export const earthrise:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#667b7d','#596d70'));starwall(b,st,'#202c41');
 const porthole=b.group();porthole.position.set(0,2.04,-2.94);const metal=ring(b,'#87958e',0,0,0,1.58,.16,porthole,false);metal.scale.x=1.34;
 for(let i=0;i<18;i++){const a=i*Math.PI/9;b.oval(iron,2.11*Math.cos(a),1.58*Math.sin(a),.14,.057,.06,.046,porthole);}batch(porthole);
 const moon=b.group();moon.position.set(0,.66,-3.32);const regolith=paint(st,'#a3a798',g=>{for(let i=0;i<66;i++){const x=i*91%744,y=i*61%368,r=4+i%15;g.fillStyle=i%2?'#8e958b':'#bec0af';g.beginPath();g.ellipse(x,y,r,r*.47,-.18,0,7);g.fill();}});
 b.part(new T.SphereGeometry(1,44,23),regolith,0,-.70,0,3.65,1.29,1.0,moon);batch(moon);
 const blue=globe(st),earth=b.part(new T.SphereGeometry(.47,36,22),blue,.65,1.56,-3.81,1,1,1,b.root);
 const guides=[-1,1].map(k=>{const p=b.group();p.position.set(k*.76,1.88,-2.83);for(const a of [-1,1])for(const d of [-1,1]){
 rod(b,brass,[a*.51,d*.51,0],[a*.30,d*.51,0],.015,p);rod(b,brass,[a*.51,d*.51,0],[a*.51,d*.33,0],.015,p);}batch(p);return p;});
 b.box(iron,0,.17,1.56,1.13,.34,.61);const photo=b.group();b.box(cream,0,0,0,1.72,1.15,.055,photo);const film=[-1,1].map(k=>b.box(paint(st,'#243849',g=>{
  g.fillStyle='#719aa0';g.beginPath();g.arc(384+k*119,139,66,0,7);g.fill();g.fillStyle='#b2c0ab';g.beginPath();g.ellipse(379+k*119,117,32,13,-.4,0,7);g.fill();
  g.fillStyle='#a4a998';g.beginPath();g.ellipse(384,440,510,179,-.13*k,0,7);g.fill();}),0,.026,.045,1.59,.96,.026,photo));
 return(s,t)=>{const k=s.chosen===0?-1:1;moon.rotation.z=s.step>=2?0:.17*s.horizon;
  earth.position.set(k*.76,1.0+(s.ready?s.photo:s.rise)*1.12,-3.84);earth.rotation.y=s.t*.11;
  guides.forEach((m,i)=>m.visible=s.chosen===i&&!s.ready);photo.visible=s.end>=0;photo.position.set(0,.46+.65*ease(s.end),1.35-.77*ease(s.end));photo.rotation.x=-.48*(1-ease(s.end));
  film.forEach((m,i)=>m.visible=i===s.chosen);};
};
