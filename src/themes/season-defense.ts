import {isNewyearDay} from '../templates/newyear-defense';
import {buildNewyearDefense,newyearPalette} from './newyear-defense';
import {isMonthendDay} from '../templates/monthend-defense';
import {buildMonthDefense,monthPalette} from './monthend-defense';
import {isYearendDay} from '../templates/yearend-defense';
import {buildYearendDefense,yearendPalette} from './yearend-defense';
import {isMidDay} from '../templates/midwinter-defense';
import {buildMidDefense,midPalette} from './midwinter-defense';
import {winterDay} from '../templates/winter-defense';
import {buildWinterDefense,winterPalette} from './winter-defense';
import * as T from 'three';
import {buildDecemberDefenseTable,decemberDefensePalette,isDecemberDefense} from './december-defense';
import {Kit} from './folio-landmarks';
import type {JanuaryDefense} from '../templates/january-defense';

export const seasonDefensePalette={
 ...decemberDefensePalette,...winterPalette,...midPalette,...yearendPalette,...monthPalette,...newyearPalette,
 '1127':['#688888','#edcfa1','#80928a','#b9c2a7','#c48646','#e9bd75'],
 '1128':['#6894a4','#f1dec0','#79a8a6','#a7c2ad','#c87050','#eac985'],
 '1129':['#435975','#a5c2cd','#90aeb9','#b7c9c6','#df9e6d','#f6d89a'],
 '1130':['#323e58','#95a6b9','#617682','#94a5a9','#73b8ac','#ecd1a3'],
 '1201':['#282d48','#9d99a6','#9b9394','#bfb3a0','#c19468','#f4d394'],
} as const;
/** Original scale models for the five fictional control rooms. */
export function boat(k:Kit,g:T.Group,sub=false){
  const hull=sub?'#f2a83f':'#2d5264';
  k.ball(g,hull,0,.37,0,2.25,.50,.65);
  if(sub){
    k.ball(g,'#f5e4b9',.23,.66,0,1.43,.36,.51);
    for(const x of [-.65,0,.65]){k.ball(g,'#584c45',x,.75,.455,.19,.19,.07);k.ball(g,'#7ea7a4',x,.75,.51,.126,.126,.042);}
    for(const s of [-1,1]){k.beam(g,'#756356',[1.48,.34,.36*s],[1.86,.08,.85*s],.074);k.box(g,'#e1b44a',1.97,.10,.86*s,.35,.15,.2);}
    return;
  }
  k.box(g,'#b87854',-.02,.65,0,3.62,.13,.97);
  k.box(g,'#ebdec3',-.73,.96,0,.86,.51,.78);
  k.box(g,'#614f42',-.73,1.24,0,.95,.085,.85);
  for(let i=0;i<4;i++)k.box(g,'#415c65',-1.03+i*.195,1.04,.403,.136,.148,.024);
  k.cyl(g,'#ba5943',-1.35,1.06,0,.16,.7);k.cyl(g,'#494b4c',-1.35,1.45,0,.166,.11);
  for(const x of [.14,.78]){k.box(g,'#9d6f48',x,.81,0,.49,.18,.62);for(const d of [-.14,.14])k.box(g,'#ccc3a5',x+d,.913,0,.036,.019,.64);}
  k.cyl(g,'#bf9d69',1.46,1.39,0,.046,1.55);k.beam(g,'#826a53',[1.46,1.9,0],[.45,1.32,0],.026);
  for(const s of [-1,1]){k.beam(g,'#e2d6bd',[-1.50,.84,.54*s],[1.3,.84,.54*s],.018);for(let i=0;i<8;i++)k.cyl(g,'#ded4bd',-1.5+i*.40,.75,.54*s,.018,.19);}
}
export function rocket(k:Kit,g:T.Group){
  k.taper(g,'#43505b',0,.21,0,.38,.42,true);k.cyl(g,'#e6e5d1',0,1.40,0,.36,1.97);
  k.cyl(g,'#598096',0,1.63,0,.364,.15);k.taper(g,'#e1dfcb',0,2.58,0,.36,.40);
  k.cyl(g,'#c2cdd0',0,2.89,0,.201,.23);k.cone(g,'#e7e4d6',0,3.28,0,.21,.56);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+.31,x=.42*Math.cos(a),z=.42*Math.sin(a);
    k.cyl(g,'#c8d3d3',x,.82,z,.14,1.2);k.cone(g,'#eee9db',x,1.57,z,.14,.30);
    k.cyl(g,'#955d4c',x,.67,z,.143,.095);}
}
export function gantry(k:Kit,g:T.Group,x:number,z:number,height:number,color:string){
  for(const dx of [-.47,.47])for(const dz of [-.36,.36])k.box(g,color,x+dx,height/2,z+dz,.085,height,.085);
  for(let i=0;i<5;i++){const y=i*height/5,top=(i+1)*height/5;
    for(const dz of [-.36,.36])k.beam(g,color,[x-.47,y,z+dz],[x+.47,top,z+dz],.046);
    k.box(g,'#bbc3b8',x,top,z,1.13,.09,.89);}
}
const ease=(a:number,b:number,t:number)=>a+(b-a)*Math.min(1,Math.max(0,t));
export function buildDefenseMachine(k:Kit,root:T.Group,game:JanuaryDefense){
 const control=game.control!;
 root=k.group(root);root.name='machine-'+control.day;
 if(isNewyearDay(control.day))return buildNewyearDefense(k,root,game,control.day);
 if(isMonthendDay(control.day))return buildMonthDefense(k,root,game,control.day,rocket);
 if(isYearendDay(control.day))return buildYearendDefense(k,root,game,control.day);
 if(isMidDay(control.day))return buildMidDefense(k,root,game,control.day);
 if(winterDay(control.day))return buildWinterDefense(k,root,game,control.day);
 if(isDecemberDefense(control.day))return buildDecemberDefenseTable(k,root,game,control.day);
 const g=k.group(root,0,.03,-4.72),moving=k.group(g);
 const pieces:T.Group[]=[];
 const light=k.group(g);
 const lamp=(x:number,y:number,z:number)=>k.ball(light,'#ffdc82',x,y,z,.21,.23,.21,'glow');
 let update:(t:number,p:number,f:number)=>void;
 switch(control.day){
 case '1127':{
   for(const x of [-5.7,-2.3]){
     k.cyl(g,'#929e9d',x,1.03,0,1.35,2.06);k.ball(g,'#d6ddcf',x,1.92,0,1.39,1.16,1.39);
     for(let i=0;i<16;i++){const a=i*Math.PI/8;k.cyl(g,'#7b8f8f',x+1.35*Math.cos(a),.94,1.35*Math.sin(a),.052,1.84);}
     k.box(g,'#869b9c',x,.60,1.59,1.24,1.20,.81);k.box(g,'#516b71',x,.51,2.01,.62,.93,.055);
   }
   for(const x of [1.3,4.4,7.5]){
     gantry(k,g,x,-.42,2.80,'#53686b');
     for(const dz of [-.45,.45]){for(let i=0;i<4;i++)k.taper(g,'#86a69b',x,3.0+i*.12,dz-.42,.19,.12);}
     if(x<7)for(const dz of [-.45,.45]){
       k.beam(g,'#776952',[x,3.46,dz-.42],[x+1.55,3.16,dz-.42],.04);
       k.beam(g,'#776952',[x+1.55,3.16,dz-.42],[x+3.1,3.46,dz-.42],.04);}
     k.box(g,'#465e63',x,.66,1.35,1.3,1.32,.66);
     for(let i=0;i<6;i++)k.box(g,'#849b9c',x-.51+i*.20,.66,1.76,.078,1.06,.19);
     lamp(x,1.59,1.4);
   }
   for(const s of [-1,1]){const sw=k.group(g,2.9,1.28,.93+s*.45);k.beam(sw,'#bf7a48',[0,0,0],[1.06,.10,0],.10);pieces.push(sw);}
   update=(t,p)=>{pieces.forEach((b,i)=>b.rotation.z=control.side===i?.14:-.75);light.visible=p>.08||Math.sin(t*2)>0;};
   break;}
 case '1128':{
   for(const s of [-1,1]){
     for(let i=0;i<7;i++)k.rock(g,i%2?'#769192':'#59777f',s*(3.7+i*.62),.18,1.4-i*.21,.50,.37,.44,i);
     k.taper(g,'#e8d8b1',s*3.7,1.13,1.4,.49,2.20);k.cyl(g,s<0?'#b75a46':'#599886',s*3.7,1.72,1.4,.394,.34);
     k.cyl(g,'#566970',s*3.7,2.31,1.4,.44,.19);lamp(s*3.7,2.60,1.4);k.cone(g,'#a36049',s*3.7,2.95,1.4,.48,.35);}
   boat(k,moving,true);
   const tender=k.group(g,-4.9,.05,-1.35,0,-.26,0,1.03);boat(k,tender);
   update=(t,p,f)=>{moving.position.set(ease(3,-1.4,p),.06*Math.sin(t*2),.87-p*.36+Math.min(1,f)*.28);moving.rotation.y=-.2-p*.18;light.rotation.z=.012*Math.sin(t+control.side*2);};break;}
 case '1129':{
   const craft=k.group(g);rocket(k,craft);craft.scale.setScalar(1.43);
   gantry(k,g,-1.63,-.4,4.8,'#9b6558');
   for(const x of [-5.3,4.8]){k.taper(g,'#a8c5cd',x,.81,-.09,.76,1.58);k.ball(g,'#e2ece3',x,1.60,-.09,.75,.27,.75);
     k.beam(g,'#b2c0bf',[x,.32,.24],[x, .32,1.3],.13);}
   for(const s of [-1,1]){const a=k.group(g,s*.69,0,-.52);
     for(let n=0;n<4;n++){k.box(a,n%2?'#cdbf97':'#e7dbb2',0,.75+n*.79,.37,.60,.74,.27);k.box(a,'#8c826e',0,.76+n*.79,.52,.42,.08,.035);}
     pieces.push(a);}
   update=(t,p,f)=>{pieces.forEach((a,i)=>a.rotation.y=(i?1:-1)*(control.active>0?.21:1.33));craft.position.y=Math.min(3,f)*1.6;};break;}
 case '1130':{
   for(const s of [-1,1]){
     const pod=k.group(g,3.25*s,1.65,0,0,0,Math.PI/2);
     k.cyl(pod,'#b7cbcf',0,0,0,.87,3.94);
     for(const d of [-1.85,-1.05,.03,1.12,1.85])k.cyl(pod,'#687e8b',0,d,0,.91,.13);
     k.taper(pod,'#cfceba',0,2.25*s,0,.87,.62,s>0);
     for(const dz of [-1,1]){k.box(g,'#385773',s*5.95,2.05,dz*1.25,2.10,.13,1.50);
      for(let i=0;i<5;i++)k.box(g,'#c2ab76',s*5.95-.84+i*.42,2.13,dz*1.25,.036,.027,1.48);}
     const hatch=k.group(g,s*.63,1.65,0);k.cyl(hatch,'#819594',0,0,0,.63,.19);hatch.rotation.z=Math.PI/2;pieces.push(hatch);}
   k.box(g,'#a3b8b7',0,.63,0,2.6,.20,.88);lamp(0,2.59,0);
   update=(t,p)=>{pieces.forEach((a,i)=>a.position.x=(i?1:-1)*(.63+Math.min(1,p+control.active*.15)*.49));light.visible=control.active>0||p>.85;};break;}
 case '1201':{
   for(let i=0;i<25;i++){const a=i*2.4,r=1.2+(i%5)*1.07;k.rock(g,i%2?'#747685':'#bab1a2',Math.cos(a)*r,.16,Math.sin(a)*r*.31,.45+i%3*.19,.27+i%4*.09,.48,a);}
   k.taper(moving,'#c49a5e',0,.95,0,.82,.70,true);k.box(moving,'#dbd8c1',0,1.50,0,1.12,.52,.97);
   k.ball(moving,'#c7b18a',.12,1.97,.12,.48,.23,.51);
   for(let i=0;i<4;i++){const a=i*Math.PI/2+.58,x=Math.cos(a),z=Math.sin(a);
      k.beam(moving,'#c9b486',[x*.53,.98,z*.53],[x*1.04,.11,z*1.04],.064);
      k.beam(moving,'#8a897a',[x*.48,.64,z*.48],[x*.98,.16,z*.98],.035);
      k.cyl(moving,'#b9a06f',x*1.04,.085,z*1.04,.23,.15);}
   update=(t,p,f)=>{moving.position.set(1.38*(1-p),.10+(1-p)*2.5+(control.active>0?.25:0),.72);moving.rotation.z=(1-p)*.12*Math.sin(t);};break;}
 }
 // A second working assembly at the near rim puts the active control beside
 // the player. Its moving part is also the indication of charge or position.
 const inset=k.group(root); // side fascia and its recessed screw plates
 for(const side of [-1,1]){
   k.box(inset,'#5c6d69',0,-.16,side*6.295,20.12,.17,.09);
   k.box(inset,'#8d967f',side*10.045,-.16,0,.09,.17,12.5);
   for(let n=0;n<10;n++){
     const x=-9+n*2;k.ball(inset,'#c2ae82',x,-.18,side*6.351,.043,.043,.025);
   }
 }
 const fieldLights:T.Group[]=[];
 for(let i=0;i<game.map.pads.length;i++){
   const [x,z]=game.map.pads[i],fixture=k.group(inset,x+(i%2?.50:-.50),.006,z+.62);
   const bulb=k.group(fixture);fieldLights.push(bulb);
   if(control.day==='1127'){
     k.box(fixture,'#53675f',0,.15,0,.32,.29,.29);
     k.ring(fixture,'#a4ae8b',0,.32,0,.096,Math.PI/2);
     k.ball(bulb,'#f1bd6f',0,.40,0,.079,.083,.079,'glow');
   }else if(control.day==='1128'){
     k.taper(fixture,i%2?'#bb7360':'#719588',0,.19,0,.19,.32);
     k.cyl(fixture,'#dcceb0',0,.43,0,.039,.22);k.ball(bulb,'#ffe29a',0,.58,0,.074,.085,.074,'glow');
   }else if(control.day==='1129'){
     k.cyl(fixture,'#a28c79',0,.40,0,.048,.78);
     k.put('taperUp',bulb,'toon','#bc7555',.20,.78,0,.08,.42,.08,0,0,Math.PI/2);
   }else if(control.day==='1130'){
     k.box(fixture,'#455e6c',0,.22,0,.41,.44,.22);
     k.box(bulb,'#b5d6b9',0,.26,.127,.27,.12,.028);
   }else{
     k.beam(fixture,'#c7ad77',[-.16,.01,.12],[0,.48,0],.038);
     k.beam(fixture,'#c7ad77',[.16,.01,.12],[0,.48,0],.038);
     k.ball(bulb,'#ffe499',0,.50,0,.082,.078,.082,'glow');
   }
 }
 const bench=k.group(root,2.10,.02,3.92);
 const detail=k.group(bench);
 let nearUpdate:(time:number,p:number)=>void;
 if(control.day==='1127'){
   for(let n=0;n<3;n++){
     const x=-2+n*1.72;
     k.box(bench,'#556e70',x,.28,0,1.34,.54,1.04);
     k.put('round',bench,'toon','#ac8863',x,.75,0,.43,.93,.43,0,0,Math.PI/2);
     for(let ring=0;ring<8;ring++)k.ring(bench,'#d0ad78',x-.41+ring*.118,.75,0,.446,0,Math.PI/2);
     k.beam(bench,'#8a7156',[x,1.16,-.10],[x,1.42,-.10],.059);
     if(n<2)k.beam(bench,'#bd9562',[x,1.42,-.10],[x+1.72,1.42,-.10],.044);
   }
   detail.position.set(2.40,.58,.35);
   k.put('round',bench,'toon','#435b61',2.40,.58,.25,.57,.14,.57,Math.PI/2);
   k.put('round',bench,'toon','#e8d1a2',2.40,.58,.335,.48,.035,.48,Math.PI/2);
   k.beam(detail,'#9f483b',[0,0,.018],[0,.39,.018],.04);
   nearUpdate=t=>{detail.rotation.z=control.active>0?.63:-.7+Math.min(1,(4-control.lock)/4)*1.4;};
 }else if(control.day==='1128'){
   for(let n=0;n<16;n++)k.box(bench,n%3?'#97775b':'#b08c69',-4+n*.54,.23,.06,.522,.29,1.05);
   for(let n=0;n<6;n++){const x=-3.7+n*1.47;k.cyl(bench,'#675e50',x,.39,-.55,.12,.75);k.ring(bench,'#c4a274',x,.66,-.55,.14,Math.PI/2);}
   for(let n=0;n<5;n++)k.ring(bench,'#bc9e72',.68,.41+n*.052,.15,.31,Math.PI/2);
   detail.position.set(-1.48,.4,.06);
   k.cyl(detail,'#e6dab7',0,.58,0,.19,1.12);k.cyl(detail,'#bd6553',0,1.23,0,.24,.17);
   k.beam(detail,'#f6cf6c',[0,1.43,0],[.84,1.43,0],.064);
   nearUpdate=t=>{detail.rotation.y=(control.side?.74:-.74)+.03*Math.sin(t);};
 }else if(control.day==='1129'){
   for(let n=0;n<16;n++){const a=n*.66;k.rock(bench,'#cbdfe2',-4+n*.53,.03,.50*Math.sin(a),.61,.12+n%3*.12,.43,a);}
   k.box(bench,'#6b7679',0,.53,-.03,1.84,1.05,.89);k.box(bench,'#c8ae87',0,1.10,-.03,1.94,.13,.98);
   for(let i=0;i<6;i++)k.cyl(bench,i%2?'#a65042':'#d6c49d',-.74+i*.30,1.24,.05,.084,.15);
   k.cyl(bench,'#8e9b99',2,.85,.02,.07,1.70);detail.position.set(2,1.67,.02);
   for(let i=0;i<3;i++){const a=i*2.094;k.beam(detail,'#c6c9bb',[0,0,0],[.46*Math.cos(a),0,.46*Math.sin(a)],.035);k.ball(detail,'#b58553',.47*Math.cos(a),0,.47*Math.sin(a),.17,.11,.14);}
   nearUpdate=t=>{detail.rotation.y=t*(control.active>0?.74:2.52);};
 }else if(control.day==='1130'){
   for(const x of [-3.15,2.95]){
     k.put('round',bench,'toon','#98a9b0',x,.68,0,.67,1.94,.67,0,0,Math.PI/2);
     for(let i=0;i<4;i++)k.ring(bench,'#d5cfb5',x-.84+i*.55,.68,0,.685,0,Math.PI/2);
   }
   k.box(bench,'#768687',-.09,.13,0,4.15,.26,.51);
   detail.position.set(0,.28,.03);k.box(detail,'#ad986e',0,.31,0,.64,.60,.54);
   for(const x of [-.24,.24])k.box(detail,'#d7c7a3',x,.31,0,.057,.62,.57);
   nearUpdate=(t,p)=>{detail.position.x=-1.56+3.12*p+(control.active>0?.24*Math.sin(t*2):0);};
 }else{
   for(let n=0;n<17;n++){const a=n*2.40,r=1.52+(n%4)*.67;k.rock(bench,n%3?'#929098':'#bab5ac',r*Math.cos(a),.13,r*.33*Math.sin(a),.28+(n%4)*.12,.21+(n%3)*.13,.28,a);}
   k.ring(bench,'#797985',-.62,.065,.05,1.05,Math.PI/2);
   detail.position.set(-.62,.12,.05);
   for(let i=0;i<3;i++)k.ring(detail,'#cfac72',0,.095+i*.07,0,.35+i*.23,Math.PI/2);
   nearUpdate=t=>{detail.scale.setScalar(control.active>0?.75+Math.sin(t*4)*.23:.55);};
 }
 return {update(t:number,p:number,f:number){update(t,p,f);nearUpdate(t,p);
    fieldLights.forEach((bulb,i)=>{
      if(control.day==='1129'){bulb.rotation.y=Math.sin(t*2.6+i)*.27+control.side*.55;return;}
      bulb.visible=game.towers[i]!==null||i%2===control.side&&Math.sin(t*2.25)>.27;
    });}};
}
