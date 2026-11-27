/** The archive pavilion, memorial garden and workshop tableaux are fictional. */
import * as T from 'three';
import {floor,paint,panel,label,rod,ring,batch,wood,jade,brass,cream,red,iron} from './december-chapters';
import {grain,peaked} from './winter-chapters';
import {type Exhibit,tiles,paper,ripples,tree,skyline,folded,ease} from './midwinter-chapters';
export const bell:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#a49b84','#8c8775'));
 for(const x of [-3.55,3.55]){b.box('#8d5141',x,1.46,-2.7,.23,2.92,.32);b.box('#b39065',x,.18,-2.7,.43,.36,.46);}
 rod(b,wood,[-3.85,2.91,-2.70],[3.85,2.91,-2.7],.19);
 for(let i=0;i<20;i++)rod(b,i%2?'#56635d':'#65726b',[-3.99+i*.42,3.15,-3.35],[-3.99+i*.42,2.97,-2.09],.21);
 for(let i=0;i<6;i++)skyline(b,-4.8+i*1.86,-5.1,.84+(i%3)*.12,'#c0b398');
 const metal=paint(st,'#928558',g=>{g.strokeStyle='#b7a56e';g.lineWidth=9;for(const y of [72,254,304]){g.beginPath();g.moveTo(0,y);g.lineTo(768,y);g.stroke();}for(let j=0;j<17;j++)g.strokeRect(17+46*j,106,25,48);});
 const bronze=b.group();bronze.position.set(0,2.77,-2.68);ring(b,brass,0,-.17,0,.15,.065,bronze,false);
 b.part(new T.LatheGeometry([new T.Vector2(.14,-.30),new T.Vector2(.36,-.43),new T.Vector2(.48,-1.02),new T.Vector2(.66,-1.26),new T.Vector2(.61,-1.38)],36),metal,0,0,0,1,1,1,bronze);
 b.oval(iron,0,-1.35,0,.12,.21,.12,bronze);batch(bronze);
 rod(b,brass,[2.63,.14,1.43],[2.65,2.18,-2.64],.024,b.root);
 const pages=[paper(st,'#e5d6ac','mountain'),paper(st,'#ebdbb4','bell')];
 const cards=pages.map((p,i)=>b.box(p,0,.1,0,.97,.075,.70,b.root));const inset=b.group();inset.position.set(0,.65,-1.55);
 b.box(wood,0,0,0,2.72,.98,.14,inset);batch(inset);
 return(s,t,x,z)=>{const k=ease(s.end);bronze.rotation.z=s.end<0?0:Math.sin(s.end*9)*.34*(1-k*.54);
  cards.forEach((m,i)=>{const side=i?1:-1,put=!!(s.mask&(1<<i));m.rotation.x=put?.20:0;
   if(put){m.position.set(side*.65,.68,-1.42);m.rotation.x=Math.PI*.5-.19;}else m.position.set(s.carry===i?x:side*2.1,s.carry===i?.47:.09,s.carry===i?z-.27:-.84);});
 };
};
export const garden:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#798785','#687876'));const water=ripples(st,'#628688','#8fa8a1');
 b.box(water,0,.022,-2.5,8.67,.035,2.52);
 for(let i=0;i<8;i++)b.box('#949b8e',-3.83+i*1.10,.063,-1.19,1.05,.12,.14);
 b.box('#8e9388',0,1.10,-4.90,10.1,2.18,.23);
 for(const x of [-4.10,-2.75,2.80,4.08]){tree(b,x,-3.87,1.22+Math.abs(x)*.13);}
 const lights=[-1,1].map(k=>{const x=k*2.03;b.cylinder('#738377',x,.13,-.48,.35,.41,.26);
 b.cylinder('#cab997',x,.39,-.48,.14,.15,.35);const flame=b.oval('#efc480',x,.69,-.48,.071,.16,.071,b.root);return flame;});
 const crane=b.group();folded(b,'#ece6cb',[[-.51,.25,-.06],[-.12,.06,.04],[.01,.11,-.13]],crane);
 folded(b,'#fbf4df',[[.03,.10,-.13],[.49,.34,.08],[.12,.01,.11]],crane);
 folded(b,'#dddbc8',[[-.18,.05,.01],[.05,-.046,.14],[.22,.095,.01],[.02,.15,-.105]],crane);
 folded(b,'#f1ead6',[[.12,.085,.01],[.26,.37,-.03],[.33,.27,-.02],[.22,.14,.05]],crane);batch(crane);
 b.box(wood,0,.07,.67,.91,.14,.61);
 const circles=[0,1].map(i=>ring(b,'#a5bbb2',0,.062,-1.69,.24+i*.29,.012,b.root));
 return(s,t,x,z)=>{lights.forEach((m,i)=>{const settled=s.chosen===i;const f=(settled?1:.53)+.08*Math.sin(t*(settled?1.7:6.3)+i);m.scale.set(.071*f,.16*f,.071*f);});
  const k=ease(s.end);const moving=s.step>=2&&s.end<0;crane.position.set(s.end>=0?.05+.18*k:moving?x:0,s.end>=0?.12:moving?.42:.23,s.end>=0?-1.58-k*.82:moving?z-.28:.67);
  crane.rotation.y=s.end>=0?.7*k:-.22;circles.forEach((m,i)=>{m.visible=s.end>=0;m.position.z=crane.position.z;m.scale.setScalar(.3+k*(1.3+i*.32));});};
};
export const sign:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#b69c7e','#99856c'));for(const x of [-3.4,-1.70,1.70,3.4])skyline(b,x,-3.85,1.15,'#c6ad83');
 for(const x of [-1.81,1.81]){b.box('#825643',x,1.29,-2.16,.23,2.58,.30);b.box(cream,x,.17,-2.16,.40,.34,.42);}
 const signboard=b.group();const timber=grain(st,'#b5875d');b.box(timber,0,0,0,3.32,.72,.16,signboard);batch(signboard);
 const type=b.box(label(st,'#b9895c','石 榴 巷','#534834'),0,0,.101,2.85,.58,.035,signboard);
 const shavings=Array.from({length:8},(_,i)=>b.box('#c4a076',-1.51+i*.43,.13,-.53,.19,.042,.10,b.root));
 for(const x of [-2.32,2.32]){b.box(wood,x,.13,-.56,.36,.26,.89);rod(b,iron,[x-.17,.30,-.56],[x+.17,.30,-.56],.045);}
 b.box(wood,0,.07,.88,1.12,.14,.57);b.box(label(st,cream,'石 榴 巷',iron),0,.158,.88,.89,.03,.33);
 return(s,t)=>{const k=ease(s.end);signboard.position.set(0,.24+k*1.90,-.54-k*1.62);signboard.rotation.x=-Math.PI/2*(1-k);
  type.visible=s.step>=3;shavings.forEach((m,i)=>{const n=s.chosen===1?7-i:i;m.visible=s.step<2&&n>=Math.floor(s.sweep*8);m.rotation.y=i*.63;});};
};
export const dynamo:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#7b918e','#687e7d'));for(let i=0;i<6;i++)skyline(b,-4.75+i*1.85,-4.18,.98+(i%3)*.11,'#9eaa98');
 const lamps=Array.from({length:12},(_,i)=>b.box('#f4cd7c',-4.75+Math.floor(i/2)*1.85+(i%2?.34:-.34),.84+Math.floor(i/2)%3*.09,-3.55,.24,.34,.06,b.root));
 b.box(iron,0,.48,-2.22,3.26,.96,.76);const dial=paint(st,'#ddcfaa',g=>{g.strokeStyle='#706754';g.lineWidth=4;for(let i=0;i<48;i++){const a=i*Math.PI/24;const r=i%4?.85:.75;
 g.beginPath();g.moveTo(384+309*r*Math.cos(a),192+155*r*Math.sin(a));g.lineTo(384+309*Math.cos(a),192+155*Math.sin(a));g.stroke();}});
 b.part(new T.CircleGeometry(1.12,56),dial,0,1.82,-1.83,1,1,1);ring(b,brass,0,1.82,-1.86,1.15,.075,b.fixed,false);
 const needles=[red,jade].map((c,i)=>{const p=b.group();p.position.set(0,1.82,-1.72+i*.065);rod(b,c,[0,-.13,0],[0,1.0-i*.14,0],.033,p);batch(p);return p;});
 const handle=b.group();handle.position.set(2.62,.12,1.47);rod(b,iron,[0,0,0],[0,.64,-.11],.058,handle);rod(b,red,[-.18,.65,-.11],[.18,.65,-.11],.072,handle);batch(handle);
 return(s,t)=>{needles[0].rotation.z=-t*.41;needles[1].rotation.z=-t*.41+(s.step>=2?0:s.offset);handle.rotation.x=-.29+ease(s.end)*1.26;
  lamps.forEach((l,i)=>l.visible=s.end>=0&&s.end>.07*i);};
};
export const press:Exhibit=(b,st)=>{
 floor(b,grain(st,'#aa8867'));const dark='#626b65';
 const papers=[paper(st,'#eadcb9','cols'),paper(st,'#eadcb9','rows')];
 const wall=tiles(st,'#beb29b','#ad9f87');b.box(wall,0,1.58,-4.17,9.30,3.16,.24);
 for(const k of [-1,1]){const x=k*3.03;b.box(wood,x,1.04,-3.71,1.58,2.08,.65);
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){
   const dx=x+(col-1)*.47,dy=.32+row*.64;b.box('#725d4e',dx,dy,-3.34,.40,.46,.09);
   b.box('#c0a581',dx,dy-.11,-3.28,.29,.14,.039);b.box(brass,dx,dy-.10,-3.24,.15,.028,.029);}}
 rod(b,iron,[-3.58,2.81,-3.56],[3.65,2.71,-3.56],.021);
 for(let i=0;i<5;i++){const x=-2.41+i*1.23;const sheet=b.box(papers[i%2],x,2.38,-3.5,.68,.70,.038);
  sheet.rotation.z=(i%3-1)*.06;b.box(wood,x,2.76,-3.49,.079,.17,.061);}
 for(const k of [-1,1]){b.box(dark,k*1.63,1.22,-2.07,.32,2.44,.72);b.box(dark,k*1.63,.16,-2.08,.62,.32,.93);}
 b.box(iron,0,2.42,-2.08,3.78,.25,.82);b.box(wood,0,.67,-2.09,3.04,.23,1.13);
 const lid=b.group();b.box(dark,0,0,0,2.80,.23,.99,lid);b.cylinder(brass,0,.42,0,.14,.14,.80,lid);batch(lid);
 const proofs=papers.map(p=>b.box(p,0,0,0,1.07,.055,.75,b.root));
 const rolled=[-1,1].map(k=>{const r=b.cylinder(iron,k*1.51,.093,-.24,.13,.13,.60,b.root);r.rotation.z=Math.PI/2;return r;});
 const print=b.group();b.box('#e6d8b8',0,0,0,2.65,.065,1.12,print);
 papers.forEach((p,i)=>b.box(p,(i?1:-1)*.60,.044,0,1.12,.022,.89,print));batch(print);
 const lever=b.group();lever.position.set(2.65,.12,1.49);rod(b,wood,[0,0,0],[.14,.68,0],.061,lever);b.oval(red,.14,.72,0,.105,.12,.105,lever);batch(lever);
 return(s,t,x,z)=>{const k=ease(s.end),stroke=s.end<0?0:Math.sin(Math.PI*k);
  lid.position.set(0,1.65-.66*stroke,-2.04);lever.rotation.z=-.18-.95*stroke;
  proofs.forEach((m,i)=>{const put=!!(s.mask&(1<<i)),side=i?1:-1;m.visible=s.end<0;
   m.position.set(put?side*.69:s.carry===i?x:side*2.18,put?.119:s.carry===i?.45:.09,put?.26:s.carry===i?z-.26:-.71);});
  print.visible=k>.44;print.position.set(0,.84+.26*k,-2.05+1.39*k);print.rotation.x=.59*k;
  rolled.forEach((r,i)=>{r.rotation.x=s.carry===i?s.proof*6:0;});};
};
