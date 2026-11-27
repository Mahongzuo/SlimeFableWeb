// 微缩街景、列车试验台、算房、双星剧场和海湾灯展都是互动演绎。
import * as T from 'three';
import {Kit} from './folio-landmarks';
import type {Vec} from '../slime/types';
import type {DecemberReception} from '../templates/december-skirmish';
const ivory='#e8dbba', navy='#425769', iron='#626e71', wood='#77543d', brass='#c99852';
export const decemberOutlines:Record<string,[number,number][]>={
 crossing:[[-2.5,7],[2.5,7],[2.5,2.25],[5,2.25],[5,-2.6],[2.25,-2.6],[2.25,-7],[-2.25,-7],[-2.25,-2.6],[-5,-2.6],[-5,2.25],[-2.5,2.25]],
 speedtrap:[[-2.15,7],[2.5,7],[2.5,2.85],[4.52,2.2],[4.52,-4.8],[1.85,-7],[-1.87,-7],[-1.87,-2.67],[-4.7,-1.8],[-4.7,2.8],[-2.15,3.4]],
 beads:[[-2.45,7],[2.45,7],[2.45,2.6],[4.82,2.6],[4.82,-2.65],[2.45,-2.65],[2.45,-7],[-2.45,-7],[-2.45,-2.65],[-4.82,-2.65],[-4.82,2.6],[-2.45,2.6]],
 twins:[[-1.7,7],[1.7,7],[3.4,3.3],[4.65,1.3],[4.15,-2.85],[2.38,-4.5],[1.75,-7],[-1.75,-7],[-2.5,-4.6],[-4.45,-2.3],[-4.75,.85],[-3.25,3.4]],
 town:[[-2.25,7],[2.25,7],[2.25,2.75],[3.8,2.35],[4.8,-1.02],[4.24,-3.55],[1.76,-4.45],[1.76,-7],[-1.8,-7],[-2.24,-3.15],[-4.7,-2.35],[-4.86,1.8],[-3.1,2.42],[-2.25,3.3]]
};
export const decemberEyes:Record<string,Vec>={crossing:[6.7,3.6,11.1],speedtrap:[6.5,4.1,11.8],beads:[6.8,5.5,11.3],twins:[6.9,3.8,11.8],town:[6.5,4.1,11.2]};
export function decemberGround(kind:string){return ({crossing:'#96a28a',speedtrap:'#a0a98b',beads:'#99775a',twins:'#b29c80',town:'#6d9da3'} as Record<string,string>)[kind];}

export function paintDecemberDeck(g:CanvasRenderingContext2D,c:DecemberReception){
 const kind=c.spec.kind,W=640,H=840;
 if(kind==='crossing'){
  g.fillStyle='#b3af96';g.fillRect(0,0,W,H);
  for(let row=0;row<24;row++)for(let col=0;col<13;col++){g.fillStyle=(row+col)%4?'#c5b9a0':'#bdb49d';g.fillRect(col*54+(row%2)*27,row*39,52,37);}
  g.fillStyle='#616e70';g.fillRect(175,119,292,590);
  g.fillStyle=ivory;for(let x=185;x<460;x+=35)g.fillRect(x,323,17,109);
  for(let y=129;y<700;y+=49){if(y>295&&y<445)continue;g.fillStyle='#d4c592';g.fillRect(317,y,6,28);}
  g.fillStyle=ivory;g.fillRect(181,305,279,6);g.fillRect(181,439,279,6);
 }else if(kind==='beads'){
  for(let j=0;j<19;j++){g.strokeStyle=j%4?'#976d49':'#cda06f';g.lineWidth=1+j%3;g.beginPath();
   g.moveTo(0,j*46+5);g.bezierCurveTo(170,j*46-7,430,j*46+15,640,j*46-2);g.stroke();}
  g.fillStyle='#704630';g.fillRect(0,379,640,30);g.fillStyle='#d7b575';g.fillRect(0,385,640,3);
  for(let x=36;x<640;x+=53){g.fillStyle='#c8a576';g.fillRect(x,164,4,212);g.fillRect(x,411,4,244);}
 }else if(kind==='speedtrap'){
  for(let i=0;i<20;i++){g.fillStyle='#76837d';g.fillRect(0,43*i,640,2);}
  for(let i=0;i<2;i++){g.fillStyle='#d8ba73';g.fillRect(62+514*i,70,6,710);}
  for(let y=70;y<795;y+=21){g.fillStyle='#e6daba';g.fillRect(86,y,y%3?11:23,3);}
 }else if(kind==='twins'){
  for(let i=0;i<18;i++){const y=i*52;g.strokeStyle=i%2?'#978569':'#c6ad87';g.beginPath();g.moveTo(0,y);g.bezierCurveTo(187,y-48,418,y+38,640,y-12);g.stroke();}
  for(let i=0;i<2;i++){g.strokeStyle=i?'#79bac3':'#dbab67';g.lineWidth=4;g.beginPath();g.moveTo(320,705);g.bezierCurveTo(i?530:115,565,i?505:130,362,320,112);g.stroke();}
 }else{
  for(let i=0;i<19;i++){g.fillStyle='#7a8b7c';g.fillRect(0,i*46,640,3);for(let j=0;j<12;j++)g.fillRect(j*71+(i%2)*35,i*46,2,46);}
  g.strokeStyle='#e0c075';g.lineWidth=6;g.beginPath();g.moveTo(114,420);g.lineTo(232,460);g.lineTo(320,339);g.lineTo(430,365);g.lineTo(520,347);g.stroke();
 }
}
function hinge(k:Kit,r:T.Group,x=0,y=0,z=0){const g=k.group(r,x,y,z);g.userData.hinged=true;return g;}
function lamp(k:Kit,r:T.Group,x:number,z:number,h:number){
 k.cyl(r,iron,x,(h-1.9)/2,z,.075,h+1.9);k.beam(r,iron,[x,h,z],[x-.55,h+.22,z],.062);
 k.ball(r,ivory,x-.55,h+.17,z,.28,.095,.13,'glow');
}
function pedestrian(k:Kit,r:T.Group,col:string){
 const g=hinge(k,r);g.userData.walkThrough=true;k.ball(g,'#cdac85',0,.79,0,.13);k.taper(g,col,0,.49,0,.19,.43);
 for(const side of [-1,1]){k.box(g,navy,side*.083,.17,0,.1,.32,.13);k.beam(g,col,[side*.13,.64,0],[side*.22,.36,.09],.043);}return g;
}
function storefront(k:Kit,r:T.Group,x:number,z:number,n:number){
 const hue=['#c7a883','#a8b6a0','#b79f91','#a9b6b5'][n%4],h=3.5+.6*(n%3);
 k.box(r,hue,x,(h-1.9)/2,z,3.2,h+1.9,2.25);
 k.box(r,'#79887e',x,h+.09,z,3.37,.18,2.42);
 for(let f=0;f<2;f++)for(const a of [-.92,0,.92]){k.box(r,ivory,x+a,1.7+f*1.05,z+1.15,.63,.78,.085);k.box(r,'#69868a',x+a,1.72+f*1.05,z+1.206,.49,.60,.046);}
 k.box(r,'#596e70',x,.33,z+1.15,2.62,1.08,.08);k.put('box',r,'toon',n%2?'#ac6e51':'#638a81',x,1,z+1.45,2.89,.1,.77,.19);
}
function crossing(k:Kit,r:T.Group,c:DecemberReception){
 for(let j=0;j<7;j++)storefront(k,r,(j-3)*3.55,-13.5-j%2,j);
 for(const side of [-1,1]){
  k.box(r,'#aeb39d',side*6,-.81,-.8,2,2.1,11.2);
  for(const z of [-4.3,3.1]){lamp(k,r,side*6.1,z,3.3);k.cyl(r,wood,side*7.22,.25,z,.14,3.4);
   k.ball(r,'#7f9976',side*7.22,2.1,z,.95,1.08,.88);k.ball(r,'#91a780',side*7.58,2.36,z+.15,.65,.65,.68);}
 }
 const waiters=['#b76c54','#6e889c','#b09351'].map(col=>pedestrian(k,r,col));
 const cars=[0,1].map(j=>{const car=hinge(k,r,j?.98:-.98,.03,(j?1:-1)*3.75);car.name='yielding-car-'+j;
  k.box(car,j?'#bd785c':'#59898f',0,.41,0,1.52,.42,.75);
  k.ball(car,'#6b7e81',-.09,.70,0,.52,.27,.36);for(const x of [-.52,.52])for(const z of [-.37,.37])k.ball(car,navy,x,.20,z,.2,.2,.08);return car;});
 const signal=hinge(k,r,1.45,2.5,-7.3);
 k.cyl(r,iron,1.45,.36,-7.3,.1,4.52);k.box(r,navy,1.45,2.68,-7.3,.66,1.55,.32);
 for(const [i,col] of ['#af5c47','#cfaa61','#84ba83'].entries())k.ball(r,col,1.45,3.1-i*.43,-7.11,.19,.19,.075);
 k.ring(signal,'#ffeed2',0,.60,.23,.233,0,0,'lamp');
 return(t:number,end:number)=>{
  const walk=c.done.has(2)?1:c.crossing;
  waiters.forEach((g,j)=>{const f=Math.min(1,Math.max(0,walk*1.40-j*.17));g.position.set(-3.65+f*7.3,.04+.044*Math.sin(f*Math.PI*14),-.75+j*.25-end*.24);g.rotation.y=Math.PI*.5;});
  cars.forEach((g,j)=>{const rolling=c.westHeld||c.done.has(2)?0:.48*(1+Math.cos(t*.88+j));
    const z=(j?1:-1)*(3.35+rolling-Math.min(end*end,8));g.position.z+=(z-g.position.z)*.11;
    g.rotation.y=j?Math.PI*.5:-Math.PI*.5;});
  signal.position.y=2.5-(c.westHeld||c.done.has(2)?.86:0);
 };
}
function train(k:Kit,r:T.Group,c:DecemberReception){
 const rail='#788890',z=-9.5;
 k.box(r,'#9d9e8d',0,-.10,z,112,.43,2.35);
 for(let j=0;j<28;j++){
   const x=(j-13.5)*4;k.box(r,'#8a9186',x,-1.18,z,.42,1.72,1.18);
   k.box(r,'#858f86',x,-.43,z,.77,.24,1.83);
 }
 for(let j=0;j<216;j++)k.box(r,'#715f52',(j-107.5)*.51,.16,z,.16,.12,1.65);
 for(const dz of [-.56,.56])k.box(r,rail,0,.263,z+dz,112,.10,.10);
 for(let j=0;j<26;j++){const x=(j-12.5)*4.2;k.cyl(r,rail,x,1.12,z-1.52,.078,6.04);k.beam(r,rail,[x,3.72,z-1.52],[x,3.45,z+.83],.052);
  if(j<25)k.beam(r,iron,[x,3.38,z+.24],[x+4.2,3.38,z+.24],.023);}
 const nose=hinge(k,r);nose.name='timed-train';
 // A sloping windshield, narrowed cheek and swept lower sill define the cab in profile.
 k.put('ball',nose,'toon','#e4e5d6',-.34,.89,0,1.56,.43,.616,0,0,-.12);
 k.put('ball',nose,'toon','#5b7883',-.52,1.13,0,1.08,.23,.572,0,0,-.17);
 k.put('ball',nose,'toon','#d7ddd1',.27,.77,0,1.06,.29,.52,0,0,-.11);
 for(const sign of [-1,1]){
   k.put('ball',nose,'toon','#e4c88d',.43,.82,sign*.475,.24,.047,.033,0,sign*.17,-.10);
   k.beam(nose,'#6d8d94',[-1.31,.78,sign*.607],[.55,.64,sign*.457],.041);
 }
 for(let j=0;j<3;j++){const x=-2.16-j*2.98;k.box(nose,'#dce1d6',x,.96,0,2.88,.94,1.2);k.box(nose,'#597e90',x,.80,.617,2.86,.12,.047);
  k.box(nose,'#73919b',x,1.15,.621,2.67,.24,.046);for(let l=0;l<5;l++)k.box(nose,ivory,x-1.17+l*.57,1.16,.649,.032,.23,.024);
  k.ball(nose,'#dce0d1',x,1.43,0,1.42,.09,.59);k.box(nose,'#6e7b7b',x,.46,0,1.72,.14,1.02);
  k.box(nose,'#859b9a',x-1.02,.99,.660,.045,.55,.017);
  for(const dx of [-.92,.92])for(const offset of [-.11,.11])k.ball(nose,navy,x+dx+offset,.433,.46,.112,.11,.12);
  if(j<2)k.box(nose,navy,x-1.49,.99,0,.081,.71,1.03);}
 k.beam(nose,iron,[-5.45,1.52,0],[-4.92,1.86,0],.041);
 k.beam(nose,iron,[-4.92,1.86,0],[-5.25,2.17,0],.041);k.box(nose,navy,-5.25,2.2,0,.09,.05,.74);
 const gates=[-3.7,4.1].map(x=>{const g=hinge(k,r,x,3.14,z);
   for(const s of [-1,1])k.box(r,iron,x,.55,z+s*1.22,.12,4.82,.12);
   k.box(r,rail,x,2.99,z,.17,.17,2.65);k.box(g,brass,0,.01,0,.22,.23,2.30,0,'glow');return g;});
 for(let i=0;i<9;i++)k.rock(r,'#8d9d89',-19+i*4.6,-1.3,-18-i%2,4.4,2.2+i%3,2.7,i);
 return(_t:number,end:number)=>{nose.position.set(c.elapsed?c.trainX+end*3:3.25,.02,z);gates.forEach((g,i)=>g.visible=c.windowAt(i+1)||c.done.has(i+1));};
}
function abacus(k:Kit,r:T.Group,c:DecemberReception){
 const frame=k.group(r,0,2.4,-9.4,.08);
 const plum='#6a3b32',bead='#a4593b';
 for(const y of [-2.06,2.03,.48])k.box(frame,plum,0,y,0,9.64,y===.48?.20:.42,.45);
 for(const x of [-4.86,4.86])k.box(frame,plum,x,0,0,.37,4.43,.52);
 k.box(r,'#8c684b',0,-.84,-9.4,11,2.11,2.5);
 const counters:T.Group[]=[];
 for(let j=0;j<9;j++){
  const x=(j-4)*1.00;k.cyl(frame,'#d0b18a',x,-.03,0,.073,3.87);
  for(let n=0;n<7;n++){const upper=n>4,y=upper?1.34+(n-5)*.30:-1.69+n*.293;
    if(j===4){const g=hinge(k,frame,x,y,.02);k.ball(g,n===4||n===5?'#c1864d':bead,0,0,0,.39,.142,.31);counters.push(g);}
    else {const at=y+(n>1&&n<5&&j%3===0?.57:0)-(upper&&j%4===0?.59:0);k.ball(frame,j%3?'#a56a46':'#7d4938',x,at,0,.38,.143,.31);}
  }
 }
 for(const x of [-6.1,6.1]){k.box(r,wood,x,.86,-6.6,2.15,5.7,1.06);
  k.box(r,'#d8c699',x,1.48,-6.03,1.76,2.6,.055);
  for(let j=0;j<9;j++)k.box(r,'#a48c69',x,2.53-j*.27,-5.985,1.56,.024,.022);
  k.box(r,'#5e5046',x,3.78,-6.6,2.5,.21,1.34);}
 // Ledger shelves and an oiled lattice window catch light behind the counting frame.
 for(const side of [-1,1]){
  const x=side*7.4;
  k.box(r,wood,x,1.10,-11.9,3.0,6.0,.64);
  for(let row=0;row<3;row++){
   const y=.22+row*.96;k.box(r,'#594536',x,y,-11.23,3.08,.12,1.04);
   for(let j=0;j<4;j++){const xx=x-1.14+j*.73,col=['#627d74','#a78a65','#7d7d87','#866854'][(row+j)%4];
    k.put('box',r,'toon',col,xx,y+.33,-11.46,.51,.56,.47,0,(j-1.5)*.06);
    k.box(r,'#ded0ac',xx,y+.35,-11.205,.092,.41,.027);}
  }
 }
 for(let j=0;j<3;j++){
  const x=(j-1)*3.65;k.box(r,'#dbcba5',x,3.18,-14.66,3.54,4.23,.23);
  for(let l=0;l<5;l++)k.box(r,'#997c55',x-1.5+l*.75,3.18,-14.50,.065,4.28,.063);
  for(let h=0;h<4;h++)k.box(r,'#997c55',x,1.52+h*1.04,-14.46,3.55,.065,.054);
 }
 k.taper(r,'#78827c',5.84,-.37,2.6,.58,2.98);k.ring(r,navy,5.84,1.12,2.6,.34,Math.PI/2);
 for(let j=0;j<3;j++)k.beam(r,wood,[5.84,1.09,2.61],[5.59+j*.27,2.15+j*.14,2.48+j*.18],.063);
 return(_t:number,end:number)=>{for(let n=0;n<7;n++){const g=counters[n],upper=n>4;
   let y=upper?1.34+(n-5)*.30:-1.69+n*.293;
   if(!upper&&c.done.has(0)&&!c.swept&&n>=(c.done.has(1)?1:2))y+=.64;
   if(n===5&&c.done.has(2))y=.75;
   g.position.y=y+(end&&n===5?.064*Math.sin(end*15)*Math.exp(-end*2):0);
 }};
}
function twins(k:Kit,r:T.Group,c:DecemberReception){
 const supports:T.Group[]=[],pairs:T.Group[][]=[];
 for(const side of [-1,1]){
  const x=side*2.7,z=-10.2;k.cyl(r,iron,x,-.6,z,.45,2.6);k.taper(r,'#a29880',x,.91,z,.38,.5);
  const body=hinge(k,r,x,2.55,z);body.name=side<0?'left-satellite':'right-satellite';supports.push(body);
  if(side<0){
   k.taper(body,'#bc9657',0,-.05,0,.73,.92,true);k.cyl(body,'#ad824d',0,.44,0,.75,.09);
   k.put('round',body,'toon','#7d8e8c',-.16,.04,.63,.20,.18,.20,Math.PI/2);
   k.ring(body,brass,-.16,.04,.74,.205);
   for(let j=0;j<5;j++)k.beam(body,'#d5b76d',[-.53+j*.24,-.38,.45],[-.36+j*.18,.34,.57],.023);
  }else{
   k.box(body,'#a5aaa8',0,0,0,1.18,.84,.82);k.box(body,ivory,0,.49,0,1.27,.13,.91);
   k.put('round',body,'toon',iron,.16,.09,.47,.28,.23,.28,Math.PI/2);
   k.put('round',body,'toon','#394656',.16,.09,.60,.225,.05,.225,Math.PI/2);k.ring(body,'#b8bfb1',.16,.09,.636,.23);
   for(const sx of [-1,1])k.beam(body,brass,[sx*.55,-.31,.44],[sx*.33,.37,.46],.031);
   for(let j=0;j<4;j++)k.box(body,navy,-.36,-.14+j*.105,.433,.22,.045,.03);
  }
  for(const sign of [-1,1]){k.taper(body,iron,sign*.34,-.55,-.12,.11,.23);k.ball(body,'#d0c49e',sign*.37,.47,-.19,.11);}
  k.beam(body,brass,[0,.65,0],[side*.34,1.22,-.15],.04);k.ball(body,ivory,side*.34,1.23,-.15,.095);
  const wings:T.Group[]=[];for(const n of [-1,1]){const g=hinge(k,body,n*.65,0,0);wings.push(g);
    g.rotation.x=side<0?.85:1.12;
    for(let j=0;j<(side<0?2:3);j++){const w=side<0?.70:.53,xx=n*(w*.5+j*(w+.035));
      k.box(g,'#c1b28a',xx,0,0,w,.075,.85);k.box(g,side<0?'#476f89':'#587896',xx,.048,0,w-.038,.032,.80);
      for(let i=0;i<5;i++)k.box(g,'#a4bdb8',xx,.07,-.32+i*.16,w-.05,.012,.017);
      k.box(g,'#a4bdb8',xx,.072,0,.018,.012,.79);}}
  pairs.push(wings);
 }
 k.cyl(r,'#d7d7c5',0,1.85,-16,.49,7.62);k.cone(r,ivory,0,6.04,-16,.5,1.07);
 for(let j=0;j<7;j++){const y=.50+j*.7;k.beam(r,iron,[1.13,y,-16],[1.91,y+.69,-16],.046);k.beam(r,iron,[1.91,y,-16],[1.13,y+.69,-16],.046);}
 for(const x of [1.13,1.91])k.beam(r,iron,[x,-1.9,-16],[x,5.5,-16],.069);
 k.box(r,'#977f65',0,-1.24,-15.6,6.4,1.53,4.8);
 for(let j=0;j<3;j++){const x=-6.6+j*1.35;k.box(r,'#a29981',x,-.15,-12.6,1.19,3.53,2.18);
  k.box(r,'#d8c5a1',x,1.68,-12.6,1.28,.15,2.31);k.box(r,navy,x,1.13,-11.49,.76,.31,.039);}
 for(let j=0;j<13;j++)k.rock(r,j%3?'#b89976':'#ae8b71',-26+j*4.4,-1.31,-21-j%4,4.7,1.6+j%3,3.1,j);
 return(t:number,end:number)=>{supports.forEach((g,j)=>{const sign=j?1:-1;g.position.x=sign*(2.7+end*.64);g.position.y=2.55+(c.done.has(j+1)?.23:0)+end*.58;
   g.rotation.z=sign*(.06+end*.09);g.rotation.y=.09*Math.sin(t*.45+j);
   pairs[j].forEach((w,n)=>{const goal=c.done.has(j+1)?0:(n===0?1:-1)*1.36;w.rotation.z+=.09*(goal-w.rotation.z);});
 });};
}
function town(k:Kit,r:T.Group,c:DecemberReception){
  const left=hinge(k,r),right=hinge(k,r),windowGroups=[left,right];const lamps:T.Group[]=[];
 // Harbourside public exhibit and its recipients. All signalling is a miniature visitor activity.
 k.box(r,'#b9c6b7',-4,.72,-12.2,6.2,5.25,3.05);k.box(r,'#859f9b',-4,3.43,-12.2,6.47,.21,3.22);
 k.box(r,'#81938b',-.2,-.93,-10.56,19.1,2.02,3.48);
 for(let j=0;j<13;j++)k.rock(r,j%2?'#9da89b':'#aeb4a2',-9+j*1.43,-.96,-8.67,.94,1.07,.54,j*.47);
 k.box(r,'#859b93',-4,1.64,-10.64,6.25,.13,.18);k.box(r,'#6e908c',-4,.17,-10.62,6.25,.28,.23);
 k.box(r,ivory,-2.49,.91,-10.53,1.21,1.22,.12);
 k.box(r,'#5e817e',-2.49,.89,-10.45,.98,1.05,.055);
 k.box(r,iron,-2.49,1.58,-10.29,1.47,.12,.68);
 for(const x of [-5.75,-3.91]){k.cyl(r,'#c3c8b6',x,2.54,-14.65,1.07,8.9);k.ball(r,'#bec6b8',x,6.98,-14.65,1.07,.47,1.07);}
 for(let i=0;i<8;i++)k.box(r,'#6b9297',-6.7+i*.77,2.4,-10.65,.56,.61,.075);
 for(let j=0;j<7;j++){const x=1.03+j*1.23,z=-10.4+(j%3)*.58,h=1.43+j%3*.24;
  k.box(r,j%2?'#c6aa87':'#d2bb94',x,(h-1.9)/2,z,1.12,h+1.9,1.31);
  for(const sign of [-1,1])k.put('box',r,'toon','#7b8c80',x,h+.21,z+sign*.36,1.32,.12,.86,sign*.43);
  k.box(r,'#817259',x,.38,z+.674,.33,.61,.055);k.box(r,'#d5c19d',x,.12,z+.82,.47,.10,.25);
  k.box(r,'#929782',x,h-.79,z+.693,1.14,.057,.14);
  for(const dx of [-.28,.28]){k.box(r,navy,x+dx,h-.51,z+.674,.24,.36,.048);k.box(right,'#ffe3a0',x+dx,h-.51,z+.711,.182,.27,.028,0,'glow');}}
 for(let j=0;j<4;j++){const x=-6.6+j*.7;k.box(r,navy,x,.93,-10.63,.42,.48,.048);k.box(left,'#ffdf9d',x,.93,-10.59,.32,.37,.03,0,'glow');}
 for(let j=0;j<5;j++){const x=-5.75+j*.84,z=-7.7;lamp(k,r,x,z,1.1+j*.13);const a=hinge(k,r,x-.55,1.27+j*.13,z);
  k.ball(a,'#ffe6a7',0,0,0,.31,.115,.16,'glow');lamps.push(a);}
 k.box(r,'#a19679',-4.2,-.21,-7.66,5.16,.36,1.02);
 for(const x of [-6.3,-4.3,-2.1])k.cyl(r,wood,x,-1.13,-7.44,.14,1.64);
 const beacon=hinge(k,r,9.2,.58,-13.2);k.taper(r,ivory,9.2,.13,-13.2,.57,4.04);
 k.cyl(r,navy,9.2,2.24,-13.2,.40,.18);k.cyl(r,'#edce90',9.2,2.54,-13.2,.31,.45, 'glow');
 k.cone(r,'#9b7052',9.2,2.96,-13.2,.52,.43);k.ball(beacon,'#fce7aa',0,1.96,.25,.12,.13,.13,'glow');
 for(const x of [-6.35,5.9]){const z=2.1;k.ball(r,'#795f48',x,-1.5,z,.78,.38,1.51);k.box(r,'#c2a77a',x,-1.25,z,.84,.23,1.28);
  k.beam(r,wood,[x,-1.28,z],[x,1.13,z],.051);k.beam(r,ivory,[x,.88,z],[x+.52,-1.05,z+.47],.021);}
 for(let j=0;j<11;j++){
  const sign=j%2?1:-1,x=sign*(5.1+j%3*.9),z=-7.9+j*.89;
  k.rock(r,j%2?'#80968c':'#9ca895',x,-1.84,z,.72,.47,.54,j*.74);
  k.put('ball',r,'toon','#b3c5b1',x+sign*.47,-1.865,z+.33,.39,.041,.08,0,j*.29);
 }
 return(t:number,end:number)=>{beacon.rotation.y=t*.8;windowGroups.forEach((g,j)=>g.visible=c.done.has(j+1)||end>.2+j*.37);
  lamps.forEach((a,j)=>{a.visible=c.order>0&&j<=c.nextLamp||end>j*.25;
    if(a.visible)a.scale.setScalar(1+.06*Math.sin(t*2+j));});};
}
export function buildDecemberVenue(k:Kit,r:T.Group,c:DecemberReception){
 const build=({crossing,speedtrap:train,beads:abacus,twins,town} as Record<string,typeof crossing>)[c.spec.kind];
 return build(k,r,c);
}
export function decemberPad(k:Kit,g:T.Group,c:DecemberReception,i:number){
 switch(c.spec.kind){
  case 'crossing':k.cyl(g,iron,0,.35,0,.066,.7);k.box(g,navy,0,.81,0,.29,.40,.18);k.ball(g,i===1?'#88af78':brass,0,.83,.10,.098,.11,.04);break;
  case 'speedtrap':for(const x of [-.34,.34])k.box(g,iron,x,.30,0,.055,.60,.065);k.box(g,i%2?brass:navy,0,.62,0,.79,.07,.08);break;
  case 'beads':k.beam(g,wood,[-.46,.20,0],[.46,.20,0],.042);for(const x of [-.22,.02,.26])k.ball(g,i===2?brass:'#a66040',x,.20,0,.105,.16,.16);break;
  case 'twins':k.taper(g,iron,0,.14,0,.28,.28);k.box(g,brass,0,.43,0,.25,.23,.23);for(const sign of [-1,1])k.box(g,'#7293a6',sign*.28,.45,0,.27,.046,.25);break;
  default:k.box(g,'#7b8475',0,.21,0,.38,.42,.38);k.box(g,'#f5d496',0,.53,0,.31,.22,.31,0,'glow');k.cone(g,navy,0,.72,0,.30,.22);
 }
}
