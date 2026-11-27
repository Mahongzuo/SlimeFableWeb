import type * as T from 'three';
import type {Kit} from './folio-landmarks';
import {sample,type JanuaryDefense,type Point} from '../templates/january-defense';
import {type YearendDay,mailTones} from '../templates/yearend-defense';
import {brass,slate,steel,ivory,red,dish,unit,page,globe} from './winter-boards';
import {bark,green,copper,gold,canopy,desk,folio,wheel,satellite} from './yearend-boards';

export const yearendPalette={
 '1217':['#526e83','#cfdbd6','#acbfc4','#d0dad3','#8c8b76','#e3b779'],
 '1218':['#706d67','#dbbd95','#a79276','#c9b391','#866f55','#a7c2ae'],
 '1219':['#72665e','#dbbf9a','#b9a088','#d7bd98','#966e55','#bdc6a1'],
 '1220':['#3d5465','#bfc7b6','#7e999d','#acbcb0','#9c9175','#d3c38a'],
 '1221':['#373e55','#aaa5a5','#858f93','#abb6aa','#9b876c','#b6c19d'],
} as const;
export function buildYearendDefense(k:Kit,root:T.Group,g:JanuaryDefense,day:YearendDay){
 const c=g.control!,set=k.group(root,0,.04,-4.7),bench=k.group(root,2.1,.05,3.65),end=k.group(set);end.name='yearend-finale';
 let update:(t:number,p:number,f:number)=>void;
 if(day==='1217'){
   for(let i=0;i<24;i++){const x=-7.5+i*.65;k.rock(set,i%3?'#d8e1dc':'#acbfc0',x,.16,-2.1-.72*Math.sin(i*1.45),.50+i%4*.16,.16+i%4*.12,.36+i%3*.19,i);}
   const sail=k.group(set,-2.12,3.29,-.40,0,0,-.22);canopy(k,sail,1.70);
   k.taper(end,'#a67d60',0,.59,0,.89,1.12);k.cyl(end,'#564f4c',0,.11,0,.92,.20);
   k.cyl(end,ivory,0,1.20,0,.45,.12);k.put('round',end,'toon',slate,0,.79,.66,.18,.095,.18,1.26);
   for(let i=0;i<12;i++){const a=i*Math.PI/6;k.ball(end,brass,.79*Math.cos(a),.31,.79*Math.sin(a),.044);}
   const receiver=dish(k,set,4.02,-.35,1.23);k.box(set,'#8c9fa1',4.02,.29,1.08,2.20,.58,.96);
   for(let i=0;i<7;i++)k.box(set,i%2?ivory:steel,3.18+i*.28,.61,1.11,.19,.042,.68);
   const rings=[.24,.50].map((f,i)=>{const mark=k.group(root);
     for(const d of [-1,1]){k.box(mark,i?gold:'#91b7be',d*.47,.064,0,.32,.032,.15);k.box(mark,steel,d*.62,.077,-.16,.038,.058,.35);}return mark;});
   const point:Point=[0,0],ahead:Point=[0,0];const rx=dish(k,bench,0,0,.73);
   update=(t,p,f)=>{end.position.set(-1.39+.95*p,.045,.51);end.rotation.z=.31*(1-unit(f));const collapse=unit(f*.85);sail.rotation.z=-.23+.054*Math.sin(t*.64)*(1-collapse);sail.position.y=3.29-2.99*collapse;
     sail.scale.set(1+.16*collapse,1-.84*collapse,1+.10*collapse);sail.position.x=-2.12-.54*collapse;
     receiver.rotation.y=-.66+.30*Math.sin(t*.62);rx.rotation.y=c.side?.56:-.46;
     rings.forEach((r,i)=>{const track=g.tracks[g.sector],d=track.total*(i?.5:.24);sample(track,d,point);sample(track,d+.02,ahead);r.position.set(point[0],0,point[1]);r.rotation.y=Math.atan2(ahead[0]-point[0],ahead[1]-point[1]);});};
 }else if(day==='1218'){
   const press=k.group(set,-1.95,0,-.06);k.box(press,'#476760',0,.16,0,3.64,.32,2.35);
   for(const x of [-1.38,1.37]){k.taper(press,green,x,1.03,-.32,.42,1.62);k.beam(press,green,[x,.62,.66],[x,2.68,-.38],.16);}
   k.box(press,green,0,2.68,-.38,3.21,.32,.43);k.cyl(press,brass,0,2.54,-.38,.16,1.09);
   const platen=k.group(press,0,1.81,.15);k.box(platen,slate,0,0,0,2.27,.31,1.30);
   k.box(press,bark,0,1.00,.28,2.69,.21,1.66);
   for(let i=0;i<8;i++)for(let j=0;j<3;j++)k.box(press,steel,-.95+i*.27,1.13,-.08+j*.32,.18,.07,.22);
   const drive=k.group(press,-1.51,1.51,.77,0,-.44);wheel(k,drive,1.07,green);
   const rack=k.group(set,3.95,0,-.51);for(const x of [-.87,.87])k.box(rack,bark,x,1.28,0,.16,2.56,1.30);
   for(let i=0;i<5;i++){k.box(rack,bark,0,.29+i*.49,0,1.66,.082,1.24);page(k,rack,0,.36+i*.49,.10,1.44,.93,ivory);}
   desk(k,set,.68,.97,2.16,.77,1.42);end.position.set(.61,.86,.96);const cover=folio(k,end,'#8f4b41',1.38,1.02);
   const clamp=k.group(bench);k.box(bench,bark,0,.28,0,1.88,.55,.93);page(k,bench,.12,.58,0,1.28,.69,ivory);k.beam(clamp,steel,[-.70,0,0],[.71,0,0],.081);
   update=(t,p,f)=>{drive.rotation.z=-t*.64;platen.position.y=1.75+.26*Math.cos(t*1.81);cover.rotation.z=2.55*(1-unit(f));end.position.z=.89+unit(f)*.25;clamp.position.y=c.active>0?.64:.87;};
 }else if(day==='1219'){
   const wall=k.group(set,0,0,-1.57);
   k.box(wall,'#b99a74',0,1.78,0,11.7,3.56,.28);
   for(const x of [-4.9,-3.65,-2.39,2.39,3.65,4.9]){k.box(wall,bark,x,1.68,.17,.16,3.36,.12);k.box(wall,'#caaf83',x+.33,2.04,.22,.40,.81,.064);}
   for(const d of [-1,1]){k.box(wall,bark,d*.68,1.32,.25,1.30,2.64,.12);
    for(const y of [.83,1.79])k.box(wall,'#986d50',d*.69,y,.334,.94,.72,.042);
    k.ball(wall,gold,d*.17,1.19,.397,.057);}
   for(let j=0;j<15;j++){const a=j*Math.PI/14;k.box(wall,brass,1.51*Math.cos(a),2.63+.70*Math.sin(a),.28,.22,.18,.15);}
   k.box(set,'#9e5e4d',0,.031,.71,8.26,.055,2.66);
   for(const d of [-1,1]){desk(k,set,d*2.00,.38,3.78,.95,1.42);k.box(set,green,d*2.02,1.051,.38,3.24,.043,.98);
     k.cyl(set,brass,d*3.31,1.24,.07,.06,.37);k.ball(set,'#b5bea0',d*3.31,1.46,.07,.30,.12,.18);}
   const folders=[-1,1].map((s,i)=>{const b=i?k.group(set):end;return {b,lid:folio(k,b,i?'#987550':'#4c6972',1.16,.87)};});
   desk(k,bench,0,0,1.61,.50,.84);page(k,bench,-.28,.61,0,.64,.51,ivory);
   update=(t,p,f)=>{folders.forEach(({b,lid},i)=>{const d=i?1:-1;b.position.set(d*(1.68-.60*p-1.95*unit(f)),1.096+.12*Math.sin(unit(f)*Math.PI),.38+d*.20*Math.sin(unit(f)*Math.PI));
     lid.rotation.z=2.42*(1-unit(f));});};
 }else if(day==='1220'){
   const rack=k.group(set,0,0,-.56);k.box(rack,slate,0,.22,0,9.86,.44,1.24);
   const lamps:T.Group[]=[],tips:[number,number,number][]=[];
   for(let j=0;j<3;j++){
     const height=1.78+j*1.32,radius=2.15+j*1.27,z=.27-j*.39;
     const point=(a:number):[number,number,number]=>[radius*Math.cos(a),.36+height*Math.sin(a),z];
     for(let n=0;n<32;n++)k.beam(rack,mailTones[j],point(n*Math.PI/32),point((n+1)*Math.PI/32),.061);
     for(let i=0;i<3;i++){
       const angle=[.64,1.57,2.50][i]+(j%2?.13:-.075),[x,y,z]=point(angle);
       satellite(k,rack,x,y+.075,z,.83+j*.07);
       const signal=k.group(end,x,y+.03,z);signal.name='collection-received';
       k.ring(signal,gold,0,0,.23,.33,0,0,'lamp');lamps.push(signal);
       if(i===1)tips.push([x,y+.14,z-.56]);
     }
   }
   const relays=[-1,0,1].map((side,i)=>{const station:[number,number,number]=[side*3.45,.75,1.25],tip=tips[i];
     for(let j=0;j<14;j++){const p=(n:number):[number,number,number]=>station.map((v,h)=>v+(tip[h]-v)*n/14) as [number,number,number];
       if(j%2===0)k.beam(set,mailTones[i],p(j),p(j+.64),.025);}
     const flare=k.group(set);k.ball(flare,mailTones[i],0,0,0,.106,.106,.106,'lamp');return {flare,station,tip};});
   const receivers=[-1,0,1].map((d,i)=>{const pot=k.group(set,d*3.45,.03,1.25);k.cyl(pot,mailTones[i],0,.14,0,.63,.28);return dish(k,pot,0,0,.64);});
   const pointer=k.group(bench);k.box(bench,slate,0,.27,0,2.07,.54,1.10);for(let i=0;i<3;i++)k.box(bench,mailTones[i],-.66+i*.66,.568,0,.49,.045,.76);
   k.box(pointer,ivory,0,.68,.47,.27,.093,.10);
   update=(t,p,f)=>{end.position.z=-.56+.24*unit(f);lamps.forEach((v,i)=>v.visible=i<Math.floor(6*p+3*unit(f)+.001));
     relays.forEach(({flare,station,tip},i)=>{const v=(t*.52+i*.28)%1;flare.visible=i===Math.floor(c.focus/2);
       flare.position.set(station[0]+(tip[0]-station[0])*v,station[1]+(tip[1]-station[1])*v,station[2]+(tip[2]-station[2])*v);});
     receivers.forEach((r,i)=>r.rotation.y=(Math.floor(c.focus/2)===i?.86:-.42)+.05*Math.cos(t*.62));pointer.position.x=-.66+.66*Math.floor(c.focus/2);};
 }else{
   set.scale.setScalar(1.20);set.position.z=-4.80;
   const chart=k.group(set,.96,1.75,-.85,-.09);
   k.box(chart,slate,0,1.27,0,4.43,2.18,.15);
   for(let x=0;x<24;x++)for(let y=0;y<10;y++){const v=Math.sin(x*.29+y*.52)+.68*Math.cos(y*.93-x*.33);
     k.box(chart,v>.84?'#c8aa79':v>.12?'#95b08f':v>-.62?'#719f9e':'#7392a5',-2.016+x*.175,.39+y*.191,.089,.165,.177,.021);}
   for(const side of [-1,1]){k.box(chart,green,side*2.20,.48,-.07,.12,1.61,.14);k.ball(chart,gold,side*2.18,2.39,.02,.074);}
   desk(k,set,.53,0,7.15,1.10,2.72);const monitor=k.group(set,-2.43,1.20,-.54);
   k.box(monitor,slate,0,.99,0,2.03,1.98,.47);const earth=k.group(monitor,0,1.02,.32);globe(k,earth,.71);earth.scale.z=.58;
   const roll=k.group(set,.71,1.23,-.06);for(const x of [-.84,.84])k.box(roll,green,x,.57,-.42,.19,1.11,.94);
   k.put('round',roll,'toon',ivory,0,.87,-.45,.33,1.64,.33,0,0,Math.PI/2);
   end.position.set(.70,1.96,-.29);end.rotation.x=.53;k.box(end,ivory,0,.06,.52,1.45,.058,1.04);
   for(let j=0;j<12;j++)for(let i=0;i<7;i++){const v=Math.sin(i*.69+j*.57)+Math.sin(i-j*.40);
     k.box(end,v>.78?'#bd9e70':v>-.5?'#779872':'#71a59f',-.60+i*.199,.097,.065+j*.082,.178,.015,.069);}
   const film=k.group(set,3.20,1.20,-.33);for(let i=0;i<3;i++){
     k.put('round',film,'toon',i%2?brass:steel,-.28+i*.31,.37,-.22,.34,.12,.34,0,0,Math.PI/2);}
   for(const s of [-1,1]){k.beam(set,steel,[.70+s*.85,1.99,-.37],[.70+s*.85,1.19,1.02],.045);}
   const orbit=k.group(set,-2.43,2.20,-.23,.35,0,.32);k.ring(orbit,brass,0,0,.08,.94);
   const survey=k.group(orbit);satellite(k,survey,.90,0,.12,.40);
   const camera=dish(k,bench,0,0,.81);
   update=(t,p,f)=>{earth.rotation.y=t*.19;orbit.rotation.z=.26+.50*Math.sin(t*.36);end.scale.z=1.02+.31*p+.62*unit(f);end.position.z=-.37+.61*unit(f);camera.rotation.y=c.active>0?.81:-.43;};
 }
 return {update};
}

