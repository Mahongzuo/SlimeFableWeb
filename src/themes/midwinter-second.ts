/** The receiving hut, lookout, polar camp, orbital desk and writing room are miniature interpretations. */
import * as T from 'three';
import {floor,paint,label,rod,ring,batch,wood,jade,brass,cream,red,iron} from './december-chapters';
import {grain,peaked,starwall} from './winter-chapters';
import {type Exhibit,ripples,paper,folded,ease,wheel} from './midwinter-chapters';
export const radio:Exhibit=(b,st)=>{
 floor(b,grain(st,'#988166'));b.box(ripples(st,'#76959a','#a1b3aa'),0,-.32,-5.32,13,.32,5.12);
 const aerials=[-3.44,3.16];for(const x of aerials){rod(b,wood,[x,0,-2.18],[x,3.67,-2.25],.073);
 rod(b,iron,[x,3.31,-2.25],[x+.65,.09,-1.93],.017);}
 for(let j=0;j<3;j++){rod(b,iron,[aerials[0],3.54-j*.14,-2.24],[0,3.20-j*.14,-2.24],.012);rod(b,iron,[0,3.20-j*.14,-2.24],[aerials[1],3.54-j*.14,-2.24],.012);}
 b.box(wood,0,.70,-2.19,3.35,1.39,.73);b.box('#656c60',0,1.49,-2.16,3.07,.18,.65);
 for(const k of [-1,1]){for(let j=0;j<8;j++)ring(b,j%2?'#986a46':'#ad7851',k*.91+j*.045,1.83,-2.12,.24,.040,b.fixed,false).rotation.y=Math.PI/2;
  wheel(b,k*2.08,.26,.52,.22);}
 const meter=b.group();meter.position.set(0,1.61,-1.74);b.box(cream,0,.36,0,1.37,.64,.07,meter);
 for(let j=0;j<9;j++)b.box(iron,-.49+j*.12,.49,.053,.018,.081,.018,meter);batch(meter);
 const needle=rod(b,red,[0,0,0],[0,.41,0],.025,b.root);const pivot=b.group();pivot.position.set(0,1.68,-1.66);pivot.add(needle);
 const bulb=b.oval('#f5c876',.97,1.72,-1.79,.17,.16,.12,b.root);
 const band=b.box(cream,0,.075,1.58,1.48,.12,.55);const dots=[-1,0,1].map(k=>b.oval(iron,k*.36,.15,1.58,.079,.021,.078,b.root));
 const strip=b.box(label(st,'#e7d8b1','S  ···',iron),0,.88,-1.76,1.86,.61,.04,b.root);
 const key=rod(b,brass,[0,.12,-.79],[0,.29,-.49],.065,b.root);
 const kite=b.group();folded(b,'#c79368',[[0,.49,0],[-.37,0,0],[0,-.64,.06]],kite);
 folded(b,'#d9c19a',[[0,.49,0],[0,-.64,.06],[.37,0,0]],kite);rod(b,cream,[0,-.62,.04],[.13,-1.21,.02],.016,kite);batch(kite);
 const spares=[kite,kite.clone()];b.root.add(spares[1]);
 return(s,t)=>{pivot.rotation.z=-.66+1.34*(1-s.t%1.08/1.08);bulb.visible=s.step>0&&s.pulse;
  spares.forEach((m,i)=>{const side=i?1:-1,up=s.chosen===i;
   m.position.set(side*(up?2.67:2.17),up?2.6+.10*Math.sin(t*2):.68,up?-2.13:.13);m.rotation.z=side*.18+.08*Math.sin(t*2.2);});
  dots.forEach((m,i)=>m.visible=i<s.count);strip.visible=s.end>=0;strip.position.y=.69+.28*ease(s.end);
  key.rotation.x=s.pulse&&s.count>0?.11:0;};
};
export const ridge:Exhibit=(b,st)=>{
 floor(b,grain(st,'#a38260'));b.box(ripples(st,'#72939a','#a4bbb4'),0,-.34,-5.30,14,.22,5.15);
 for(let i=0;i<7;i++)peaked(b,i%2?'#728b88':'#617c7b',-5.42+i*1.87,.76+(i%3)*.17,-5.38-i%2*.29,3.13,2.46+(i%3)*.40,.37);
 for(let i=0;i<5;i++)peaked(b,i%2?'#68827c':'#84998b',-4.72+i*2.37,.49,-4.44,2.92,1.38+(i%2)*.47,.27);
 rod(b,wood,[-3.99,.36,-2.33],[3.99,.36,-2.33],.091);
 for(const x of [-3.8,-2.8,-1.4,1.4,2.8,3.8])rod(b,wood,[x,.03,-2.32],[x,.36,-2.32],.064);
 b.cylinder(wood,-3.64,1.63,-1.62,.11,.17,3.26);rod(b,cream,[-3.62,2.93,-1.62],[-1.62,.05,-1.52],.024);
 const mist=Array.from({length:4},(_,i)=>b.oval('#c2cbc3',i*1.73-2.5,1.37+(i%2)*.21,-3.94,1.18,.20,.18,b.root));
 for(const [x,h,z] of [[-2.10,.49,.52],[2.03,.88,-.78]]){
 b.cylinder(wood,x,h*.43,z-.44,.074,.13,h*.86);ring(b,brass,x,h,z-.44,.23,.043,b.fixed,false);}
 const chart=b.group();chart.position.set(0,.09,1.50);
 const halves=[-1,1].map((k,i)=>{const sheet=paint(st,'#dfd1ab',g=>{
  g.save();g.translate(-768*i,0);g.strokeStyle='#948167';g.lineWidth=5;g.strokeRect(23,20,1490,344);
  g.fillStyle='#77877b';g.beginPath();g.moveTo(27,267);
  for(const [sx,sy] of [[151,194],[241,219],[391,109],[459,154],[515,130],[704,238],[829,211],[928,156],[989,175],[1139,78],[1231,143],[1290,128],[1508,247],[1508,283],[27,283]])g.lineTo(sx,sy);g.fill();
  g.fillStyle='#556e68';g.beginPath();g.moveTo(29,287);g.bezierCurveTo(319,142,434,281,735,254);
  g.bezierCurveTo(1048,234,1213,182,1507,276);g.lineTo(1507,298);g.lineTo(29,298);g.fill();
  g.strokeStyle='#8b9d93';g.beginPath();g.moveTo(25,317);g.lineTo(1511,317);g.stroke();g.restore();});
  return b.box(sheet,.49*k,0,0,.975,.04,.66,chart);});
 return(s,t)=>{mist.forEach((m,i)=>{m.position.x=-2.5+i*1.73+2.82*Math.sin(s.t*1.29);m.position.y=1.19+i%2*.2-.71*Math.max(0,Math.sin(s.t*1.29));});
  const k=ease(s.end);halves.forEach((m,i)=>{m.visible=!!(s.mask&(1<<i));m.rotation.z=(i?1:-1)*(.29-.29*k);});
  chart.position.set(0,.09+.85*k,1.50-1.15*k);chart.rotation.x=.96*k;};
};
export const tent:Exhibit=(b,st)=>{
 floor(b,ripples(st,'#c7d3cb','#a8bbb7'));
 for(let i=0;i<8;i++)peaked(b,i%2?'#aabcb9':'#cad6cd',-6.29+i*1.69,.64,-4.62+(i%2)*.4,2.73,1.67+(i%3)*.23,.35);
 for(const k of [-1,1]){rod(b,wood,[k*3.07,.11,-.40],[k*3.07,.11,-1.68],.071);
 b.box('#a88565',k*3.07,.22,-1.04,.49,.15,.91);}
 const mast=b.cylinder(wood,0,.86,1.16,.052,.072,1.72,b.root);
 const shadow=rod(b,'#859da2',[0,0,0],[0,0,-2.75],.044,b.root);const pivot=b.group();pivot.position.set(0,.064,1.16);pivot.add(shadow);
 const markers=[-1,1].map(k=>b.cylinder(brass,k*1.91,.145,-.68,.08,.11,.29,b.root));
 const shelter=b.group();shelter.position.set(0,.03,-1.53);for(const k of [-1,1]){folded(b,k>0?'#c9aa78':'#ad906a',[[0,1.63,-.73],[k*1.05,.03,-.73],[k*1.05,.03,.73],[0,1.63,.73]],shelter);
 rod(b,wood,[k*1.07,.02,.77],[0,1.63,.77],.047,shelter);rod(b,cream,[0,1.58,.74],[k*1.53,.05,1.10],.024,shelter);}
 folded(b,'#b7996e',[[.02,1.6,-.72],[-1.02,.02,-.72],[1.02,.02,-.72]],shelter);batch(shelter);
 return(s,t)=>{mast.visible=s.pin;pivot.visible=s.pin;pivot.rotation.y=-s.shadow*.81;
  markers.forEach((m,i)=>m.visible=!!(s.mask&(1<<i)));shelter.scale.y=.045+.955*ease(s.end);};
};
export const twins:Exhibit=(b,st)=>{
 floor(b,paint(st,'#3f5566',g=>{g.strokeStyle='#91a69c';g.lineWidth=3;for(let j=0;j<12;j++)g.strokeRect(25+j*65,256,45,85);}));
 starwall(b,st,'#23374d');const earth=paint(st,'#79949c',g=>{g.fillStyle='#8fa694';for(let i=0;i<20;i++){g.beginPath();g.ellipse(i*151%768,i*91%384,64,17,i*.25,0,7);g.fill();}});
 b.part(new T.SphereGeometry(1,44,24),earth,0,-2.93,-5.64,5.26,4.02,3.26);
 const models=[0,1].map(i=>{const ship=b.group();const shell=b.cylinder(i?'#aeb9b2':'#cac7b5',0,0,0,.27,.49,.81,ship);shell.rotation.z=Math.PI/2;
 const tail=b.cylinder(iron,-.47,0,0,.48,.44,.19,ship);tail.rotation.z=Math.PI/2;b.box('#475e65',.17,.16,.25,.22,.18,.17,ship);
 for(const k of [-1,1])rod(b,brass,[-.46,k*.23,0],[-.72,k*.33,0],.033,ship);batch(ship);return ship;});
 const frames=[-1,1].map(side=>{const frame=b.group();frame.position.set(side*1.21,1.78,-1.52);
  for(const k of [-1,1])for(const [x,y] of [[-.48,-.36],[.48,-.36],[-.48,.36],[.48,.36]]){
   const cx=k*.79,cy=k*.26;
   rod(b,brass,[cx+x*.68,cy+y,0],[cx+x,cy+y,0],.023,frame);rod(b,brass,[cx+x,cy+y*.60,0],[cx+x,cy+y,0],.023,frame);}
  batch(frame);return frame;});
 const album=b.group();b.box(wood,0,0,0,2.42,.13,.93,album);batch(album);
 const photos=[-1,1].map(k=>{const still=paint(st,'#d8d1b8',g=>{g.fillStyle='#405969';g.fillRect(44,33,680,301);g.fillStyle='#8fa99e';g.beginPath();g.ellipse(406,361,436,112,0,0,7);g.fill();
   g.translate(384,161);g.scale(k,1);g.fillStyle='#d7ceaf';g.beginPath();g.moveTo(-107,-58);g.lineTo(101,-24);g.lineTo(101,32);g.lineTo(-107,67);g.fill();g.fillStyle='#596569';g.fillRect(-118,-57,31,115);g.fillRect(62,-28,27,21);});
  return b.box(still,k*.57,.096,0,1.06,.04,.78,album);});
 return(s,t)=>{const reveal=ease(s.end);album.position.set(0,.09+reveal*.91,1.62-reveal*1.15);album.rotation.x=.86*reveal;
  for(let i=0;i<2;i++){const m=models[i],k=i?1:-1;m.position.set(s.gap*1.42+k*.79,1.78+k*.26+Math.cos(s.t*1.38)*.12,-2.02+k*.15);
   m.rotation.z=k*.16+.08*s.gap;photos[i].visible=!!(s.mask&(1<<i));frames[i].visible=!s.ready&&!(s.mask&(1<<i));}};
};
export const letter:Exhibit=(b,st)=>{
 floor(b,grain(st,'#98795d'));b.box('#8b8175',0,1.75,-3.67,9.18,3.5,.32);
 b.box('#786a5a',-2.12,1.35,-3.19,2.46,2.70,.66);b.box('#4d4d47',-2.12,.78,-2.83,1.68,1.50,.085);
 b.box(wood,-2.12,2.12,-2.79,2.66,.19,.46);for(let i=0;i<3;i++)rod(b,wood,[-2.70+i*.15,.17,-2.74],[-1.76+i*.13,.30,-2.68],.11);
 const flames=[0,1,2,3].map(i=>b.oval(i%2?'#d38e54':'#d4a266',-2.57+i*.28,.51,-2.70,.12,.29,.08,b.root));
 b.box(wood,2.05,1.86,-3.38,2.47,2.50,.29);b.box('#91a6a7',2.05,1.86,-3.2,2.22,2.25,.05);
 for(const v of [-1,0,1]){b.box(wood,2.05+v*.99,1.86,-3.10,.061,2.17,.073);b.box(wood,2.05,1.86+v*1.01,-3.09,2.10,.06,.06);}
 const flakes=Array.from({length:11},(_,i)=>b.oval('#cad6c8',1.14+i*53%170*.010,1.30,-3.15,.033,.031,.018,b.root));
 b.box('#d8c8a2',0,.07,.71,1.74,.14,.96);const details=[paper(st,cream,'fire'),paper(st,cream,'snow')];
 const cards=details.map(p=>b.box(p,0,.17,0,.67,.04,.49,b.root));const envelope=b.group();envelope.position.set(0,.20,.71);
 b.box('#e3d0aa',0,0,0,1.43,.067,.75,envelope);
 folded(b,'#ccbc9b',[[-.71,.047,-.34],[-.04,.060,.20],[.71,.047,-.34]],envelope);
 folded(b,'#ede0bf',[[-.71,.073,.37],[.71,.073,.37],[0,.082,-.14]],envelope);batch(envelope);
 const seal=b.cylinder(red,0,.23,.66,.119,.14,.049,b.root);
 b.cylinder(brass,2.59,.12,1.50,.23,.29,.24);b.oval(red,2.59,.27,1.5,.16,.037,.16);
 return(s,t,x,z)=>{const k=ease(s.end);flames.forEach((m,i)=>m.scale.y=.29+.05*Math.sin(t*4+i));
  flakes.forEach((m,i)=>m.position.y=.91+(2.04-(s.t*.20+i*.31)%2.04));envelope.visible=s.ready;
  envelope.position.y=.20+k*.43;envelope.rotation.x=.55*k;seal.visible=s.end>=0;seal.position.set(0,envelope.position.y+.13,.66+k*.03);
  cards.forEach((m,i)=>{m.visible=!s.ready&&(s.carry===i||!!(s.mask&(1<<i)));const held=s.carry===i,first=s.chosen===i;
   m.position.set(held?x:first?-.37:.37,held?.49:.176+.059*k,held?z-.19:.71);m.rotation.z=(first?1:-1)*k*.31;});};
};
