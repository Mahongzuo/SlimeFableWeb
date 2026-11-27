import type * as T from 'three';
import type {Kit} from './folio-landmarks';
import {sample,type Point,type JanuaryDefense} from '../templates/january-defense';
import type {MonthendDay} from '../templates/monthend-defense';
import {brass,slate,ivory,steel,unit,tripod,globe,page} from './winter-boards';
import {bark,green,desk,folio,wheel} from './yearend-boards';
import {karst,channel} from './midwinter-boards';
import {canopyRoof,pavilion,palm,panda,bamboo,bridge,flag,floatplane,lantern,train,track,water,gold,rust,leaf,ink,plaster} from './monthend-boards';
export const monthPalette={
 '1222':['#6ea4af','#ddcfaa','#a6b89e','#a2bfad','#aa8f72','#efcd8b'],
 '1223':['#70948a','#c6cba8','#899d78','#a6ba88','#8d7958','#d7c997'],
 '1224':['#6898a9','#d7d0ac','#7ea7a6','#a4bdb0','#a19878','#e3ca94'],
 '1225':['#78979a','#d9c6a5','#a3a18b','#c1b38d','#998065','#dfbf89'],
 '1226':['#648692','#cfc6ac','#94a3a1','#b4b9a2','#947b60','#ddba87'],
 '1227':['#374251','#858c96','#76858d','#a9ada1','#a28665','#d8af7d'],
 '1228':['#728e81','#c8c3a3','#8d9d81','#a3b58d','#937b5f','#d9bd8c'],
 '1229':['#615c73','#c8aa98','#878992','#b1aa98','#a08260','#e4c48f'],
 '1230':['#638292','#cfd2c3','#9daeb0','#bac6b6','#98816e','#d9c59a'],
 '1231':['#618b92','#c6c8ac','#95a8a0','#b0bda5','#957f66','#c7d59f'],
} as const;
export function monthGround(g:CanvasRenderingContext2D,day:MonthendDay,w:number,h:number){
 g.save();g.lineWidth=1.6;
 const coast=day==='1222'||day==='1224',wood=day==='1223'||day==='1230',rail=['1226','1228','1231'].includes(day);
 if(coast){
   const beach=day==='1222',edge=(x:number)=>h*(beach?.33:.47)+h*.061*Math.sin(x/w*6.35)-h*.031*Math.cos(x/w*15);
   g.beginPath();g.moveTo(0,0);g.lineTo(w,0);for(let i=80;i>=0;i--){const x=w*i/80;g.lineTo(x,edge(x));}g.closePath();g.fillStyle=beach?'#76aba9':'#7facae';g.fill();
   for(let j=0;j<11;j++){g.strokeStyle=j===0?'#e5dcba':'#b8d5c68c';g.beginPath();for(let i=0;i<=90;i++){const x=w*i/90,y=edge(x)-j*18+2*Math.sin(x*.018+j);
     if(i)g.lineTo(x,y);else g.moveTo(x,y);}g.stroke();}
 }else if(wood){const s=day==='1223'?37:78;
   for(let j=0;j<h/s;j++){const y=j*s;g.fillStyle=j%2?'#b2a07a38':'#d3c4a139';g.fillRect(0,y,w,s-2);g.strokeStyle='#786d5655';g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();
     for(let i=0;i<5;i++){const x=((i*287+j*97)%w);g.fillRect(x,y+2,2,s-4);}}
 }else if(rail){for(const v of [.16,.76]){g.strokeStyle='#7e878489';g.lineWidth=4;g.beginPath();g.moveTo(0,h*v);g.bezierCurveTo(w*.31,h*(v-.10),w*.62,h*(v+.07),w,h*v);g.stroke();}
   for(let n=0;n<28;n++){g.strokeStyle='#b3ad9488';g.beginPath();g.moveTo(n*w/28,0);g.lineTo(n*w/28+17,h*.10);g.stroke();}
 }else if(day==='1225'||day==='1228'){for(let j=0;j<17;j++){g.strokeStyle='#c4c19a81';g.beginPath();for(let i=0;i<=80;i++){
   const x=w*i/80,y=h*(j/16)+14*Math.sin(i*.14+j*.20);if(i)g.lineTo(x,y);else g.moveTo(x,y);}g.stroke();}}
 else{g.strokeStyle=day==='1229'?'#9bb6b790':'#a8b9ac72';for(let j=0;j<12;j++){g.beginPath();g.ellipse(w*.48,h*.49,36+j*48,16+j*27,-.31,.12,5.74);g.stroke();}}
 g.restore();
}
export function monthBackdrop(k:Kit,g:T.Group,day:MonthendDay){
 if(day==='1222'||day==='1224'){
   k.box(g,'#7ea9a7',0,-.63,-25,90,.30,36);
   for(let i=0;i<8;i++){const x=-32+i*8.47;k.rock(g,'#92a99a',x,-.47,-24+i%3*2,3.7+i%3,.70+i%2*.63,3,i);}
 }else if(['1226','1227','1230','1231'].includes(day)){
   const night=day==='1227';k.box(g,night?'#495762':'#9ca9a5',0,2.19,-15.2,45,6.2,.36);
   for(let n=0;n<16;n++){const x=-21+n*2.71;k.box(g,night?'#707a79':'#7b9290',x,2.41,-14.96,.13,5.51,.14);
     if(!night)for(let j=0;j<2;j++)k.box(g,day==='1230'?(n<8?'#b8cbd0':'#d0bd9f'):'#bfcec3',x+1.31,1.69+j*1.62,-14.97,2.41,1.46,.094);
     else for(let j=0;j<3;j++)k.ball(g,j%2?ivory:gold,x+.54+j*.43,1.45+(j*11+n*3)%14*.20,-14.94,.036);}
 }else{
   for(let i=0;i<12;i++){const x=-23+i*4.41,h=day==='1229'?1.35+(i*3%5)*.53:1.1+(i*4%7)*.48;
     if(day==='1229'){k.box(g,'#909496',x,h*.48,-18,3.34,h,2.2);for(let j=0;j<4;j++)k.box(g,gold,x-1.03+j*.65,h*.69,-16.87,.28,.20,.038);}
     else k.rock(g,i%2?'#899e8b':'#9eac8c',x,-.35,-18-i%3,3.65,h,3.1,i);}
 }
}
type Motion=(t:number,p:number,f:number)=>void;
export function buildMonthDefense(k:Kit,root:T.Group,g:JanuaryDefense,day:MonthendDay,rocket:(k:Kit,g:T.Group)=>void){
 const c=g.control!,set=k.group(root,0,.035,-4.76),deskTop=k.group(root,2.12,.03,3.79),end=k.group(set);end.name='monthend-finale';
 let motion:Motion;
 if(day==='1222'){
   k.box(set,'#749f9f',0,.064,-.70,12.4,.11,2.48);
   for(let i=0;i<24;i++)k.box(set,'#b8cec0',-5.8+i*.48,.136,-.94+.26*Math.sin(i),.30,.021,.055);
   for(const x of [-4.90,4.54])palm(k,set,x,.05,x<0?1.42:1.18);
   const display=k.group(set,-2.30,.10,-.65,0,0,0,1.12);rocket(k,display);
   const booth=pavilion(k,set,.86,.16,1.40,'#76a296');k.box(booth,green,0,.83,.39,2.4,.16,.89);
   for(let i=0;i<5;i++)k.box(booth,ivory,-.81+i*.39,.944,.42,.32,.050,.27);
   end.position.set(.83,1.38,1.10);k.box(end,'#b78a68',0,0,0,2.75,.75,.10);
   for(let j=0;j<4;j++)k.box(end,'#d1aa7f',0,-.26+j*.17,.071,2.63,.045,.025);
   const flags=[0,1].map(i=>{const f=k.group(set,2.84,1.22,.76,0,0,0,1.1);flag(k,f,i?gold:'#73a7b3');return f;});
   desk(k,deskTop,0,0,1.65,.51,.87);for(let i=0;i<2;i++)k.box(deskTop,i?gold:'#93bccc',-.39+i*.78,.628,0,.61,.039,.43);
   motion=(t,p,f)=>{end.position.y=1.38+.88*unit(f);flags.forEach((a,i)=>{a.visible=i===c.side;a.rotation.y=.15*Math.sin(t*2);});};
 }else if(day==='1223'){
   for(let i=0;i<18;i++){const x=-5.6+i*.65,z=-.86-.44*Math.cos(i*1.76);bamboo(k,set,x,z,1.6+(i%5)*.43);}
   for(const d of [-1,1]){pavilion(k,set,d*2.79,-.03,1.16,leaf);k.box(set,'#b3a47b',d*1.35,.17,.82,2.42,.33,1.13);}
   const bears=[-1,1].map((d,i)=>{const body=i?k.group(set):end;panda(k,body);body.scale.setScalar(1.30);return body;});
   k.taper(deskTop,bark,0,.32,0,.59,.62,true);for(let j=0;j<7;j++)k.beam(deskTop,leaf,[-.34+j*.10,.37,0],[-.51+j*.16,.98+.13*(j%2),-.05],.038);
   motion=(t,p,f)=>{bears.forEach((b,i)=>{const d=i?1:-1;b.position.set(d*(2.86-.67*p-.68*unit(f)),.18+.27*unit(f),.20+.55*unit(f));b.rotation.z=d*.085*Math.cos(t*.78+i)*(1-unit(f));b.rotation.y=-d*.32;});};
 }else if(day==='1224'){
   channel(k,set,[[-6,.19,-.21],[-3,.19,.08],[0,.19,.33],[3,.19,.39],[6,.19,.04]],2.16,water,'#b1af8c');
   const wing=k.group(end,0,0,0,0,-.67,0,1.42);floatplane(k,wing);
   const wake=k.group(set);for(let j=0;j<4;j++)for(const d of [-1,1])k.beam(wake,'#cee3d1',[-.18-j*.36,.24,d*.11],[-.72-j*.36,.24,d*(.35+j*.12)],.028,'lamp');
   for(const x of [-4.25,4.51]){k.box(set,bark,x,.33,-.72,1.09,.65,1.6);for(let j=0;j<5;j++)k.box(set,plaster,x,.69,-1.31+j*.27,1.13,.058,.22);}
   const buoys=[0,1].map(i=>{const q=k.group(set,-2.6+i*4.80,.17,.66);k.ball(q,'#d98b60',0,0,0,.25,.19,.25);k.cyl(q,ivory,0,.30,0,.055,.45);return q;});
   const front=k.group(deskTop);floatplane(k,front);front.scale.setScalar(.47);
   motion=(t,p,f)=>{end.position.set(-2.75+p*1.88+unit(f)*2.54,.30+.078*Math.sin(t*2)*(1-unit(f))+unit(f)*1.28,.26-.32*p);
     end.rotation.z=unit(f)*.18;wake.position.x=end.position.x-.56;wake.position.z=end.position.z;wake.scale.z=1-.76*unit(f);buoys.forEach((b,i)=>{b.position.z=.66+(c.focus%2===i?.35:0);b.rotation.z=.16*Math.sin(t*1.54+i);});};
 }else if(day==='1225'){
   for(let i=0;i<8;i++)karst(k,set,-6+i*1.61,-1.40,.86+(i%3)*.19,1.37+(i%4)*.55,i);
   for(const d of [-1,1]){const path=k.group(set,d*2.90,.12,.35,0,d*.32);k.box(path,'#b39c78',0,0,0,4.93,.19,.61);
     for(let j=0;j<7;j++)k.box(path,ivory,-1.98+j*.64,.106,0,.24,.025,.058);}
   const post=pavilion(k,set,0,-.12,1.41,rust);end.position.set(.05,.12,1.10);
   for(const d of [-1,1]){const x=d*.65,col=d<0?'#79a4a3':'#d0ab72';k.box(post,col,x,1.20,-.46,.88,.65,.09);
     for(let j=0;j<4;j++)k.box(post,ivory,x-.23+j*.14,1.15+.12*Math.sin(j+d),-.397,.107,.046,.021);
     k.box(set,bark,d*2.39,.70,.59,.10,1.40,.10);k.put('box',set,'toon',col,d*2.39,1.30,.59,1.20,.31,.17,0,0,d*.095);
     for(let j=0;j<3;j++)k.box(set,ivory,d*2.39-.22+j*.17,1.31,.693,.055,.11,.021);}
   k.taper(end,'#9d9782',0,.43,0,.44,.85);k.box(end,ivory,0,.67,.23,.57,.50,.061);
   for(let j=0;j<5;j++)k.box(end,bark,0,.52+j*.066,.27,.32-(j%2)*.10,.028,.018);
   const rack=k.group(deskTop);desk(k,rack,0,0,1.74,.49,.98);for(const d of [-1,1])page(k,rack,d*.39,.61,0,.61,.55,d<0?'#9bbcb9':'#dac294');
   motion=(t,p,f)=>{end.rotation.y=-1.55*(1-unit(f));end.position.y=.12+.25*unit(f);};
 }else if(day==='1226'){
   const rail=k.group(set,0,.07,-.11);track(k,rail,.24,10.9);
   for(const x of [-4.4,-2.18,0,2.18,4.4]){k.box(set,green,x,1.22,-.88,.14,2.44,.22);k.beam(set,steel,[x,1.75,-.88],[x,2.42,.33],.058);}
   canopyRoof(k,set,0,2.56,-.51,10.1,1.34,'#688b89');k.box(set,'#bda88b',0,.31,.90,10,.58,.91);
   for(const x of [-4.1,3.8]){k.box(set,slate,x,1.75,-.30,1.19,.56,.13);for(let j=0;j<3;j++)k.box(set,gold,x-.35+j*.32,1.78,-.217,.16,.14,.028);}
   k.box(end,bark,0,.36,0,1.84,.17,.96);for(const x of [-.63,.63])for(const z of [-.42,.42])k.put('round',end,'toon',ink,x,.18,z,.18,.12,.18,Math.PI/2);
   for(let i=0;i<4;i++){const x=-.62+i*.39;k.box(end,[rust,leaf,gold,water][i],x,.62,i%2*.08,.33,.47,.45);k.ring(end,steel,x,.895,.03,.093);}
   desk(k,deskTop,0,0,1.42,.53,.86);for(let j=0;j<3;j++)k.box(deskTop,[water,gold,leaf][j],-.43+j*.43,.64,0,.31,.065,.46);
   motion=(t,p,f)=>{end.position.set(-2.55+1.75*p+unit(f)*2.05,.61,.92);};
 }else if(day==='1227'){
   const model=k.group(set,-1.55,.16,-.21,0,0,0,1.21);rocket(k,model);
   k.cyl(set,'#969d9a',-1.55,.12,-.21,1.32,.24);
   const ring=k.group(set,-1.55,2.62,-.48);k.ring(ring,brass,0,0,0,1.92);
   const lights:T.Group[]=[];for(let i=0;i<9;i++){
     const x=-5+i*1.22,z=.78+.31*Math.cos(i*.53);k.taper(set,steel,x,.41,z,.18,.78);k.ball(set,slate,x,.84,z,.22,.25,.22);
     const light=k.group(end,x,.87,z+.11);light.name='month-lamp';k.ball(light,gold,0,0,0,.172,.20,.138,'lamp');lights.push(light);}
   for(let i=0;i<14;i++){const a=i*.195;k.beam(set,steel,[1.2+i*.21,.16,-.26],[1.2+i*.21,.40+.38*Math.sin(a),-.26],.029);}
   const clock=k.group(deskTop,0,.75,0);wheel(k,clock,.53,brass);tripod(k,deskTop,0,0,.70,steel);
   motion=(t,p,f)=>{clock.rotation.z=(c.side?-.69:.58);lights.forEach((l,i)=>l.visible=i<Math.floor(6*p+3*unit(f)+.001));end.position.z=.05*unit(f);};
 }else if(day==='1228'){
   for(let i=0;i<6;i++)karst(k,set,-4.91+i*1.64,-.84,1.05+i%2*.37,1.29+i*.39,i+2);
   const viaduct=k.group(set,-.14,.16,.48,0,0,.137);bridge(k,viaduct,0,1.14,0,9.9,green);
   const office=k.group(set,3.98,1.35,.08,0,0,0,.88);pavilion(k,office,0,0,.98,rust);
   k.box(set,bark,3.33,2.40,.81,.11,2.88,.11);k.box(end,plaster,0,0,0,.82,.55,.093);
   k.box(end,rust,0,.01,.059,.49,.26,.021);k.beam(end,ivory,[-.18,-.08,.073],[0,.04,.073],.017);k.beam(end,ivory,[0,.04,.073],[.18,-.08,.073],.017);
   const sack=k.group(viaduct);k.ball(sack,'#ac976e',0,.30,0,.25,.33,.21);k.cyl(sack,bark,0,.54,0,.14,.084);
   const seal=k.group(deskTop);k.taper(seal,bark,0,.31,0,.29,.57,true);k.ball(seal,brass,0,.65,0,.22);
   motion=(t,p,f)=>{end.position.set(3.79,1.86+1.07*unit(f),.81);sack.position.set(-4.43+7.57*p,1.25,.01);};
 }else if(day==='1229'){
   k.box(set,'#84a6aa',0,.06,.11,12.0,.11,2.93);bridge(k,set,0,1.07,0,10.42,'#637c78');
   for(let i=0;i<6;i++)lantern(k,set,-4.38+i*1.73,1.17,-.42,.90);
   const crown=k.group(set,.62,1.20,.43);k.cyl(crown,green,0,.91,0,.085,1.82);crown.add(end);end.position.y=1.75;const petals:T.Group[]=[];
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5,base=k.group(end,0,0,0,0,a),petal=k.group(base);k.ball(petal,i%2?'#e5cda5':'#f4e2bc',0,.28,.15,.16,.36,.14);petals.push(petal);}
   k.ball(end,gold,0,.21,0,.14,.20,.14,'lamp');lantern(k,deskTop,0,0,0,.97);
   motion=(t,p,f)=>{petals.forEach(v=>v.rotation.x=.16+.78*unit(f));end.rotation.y=.28*unit(f);};
 }else if(day==='1230'){
   for(const d of [-1,1]){const x=d*2.48,col=d<0?'#8faebc':'#bc9476';
     k.box(set,col,x,1.20,-.63,4.62,2.40,.23);k.box(set,'#9b9d90',x,.18,.12,4.60,.35,1.65);
     for(let i=0;i<4;i++){k.box(set,d<0?'#cfdbd3':'#e6cba0',x-1.72+i*1.13,1.36,-.48,.73,1.51,.045);
       k.box(set,steel,x-1.72+i*1.13,.98,-.446,.60,.047,.018);}}
   const capsule=k.group(set,-2.59,.36,.18);k.taper(capsule,ivory,0,.75,0,.86,1.49);k.cyl(capsule,ink,0,.11,0,.91,.19);
   k.put('round',capsule,'toon',slate,0,.73,.69,.22,.063,.22,Math.PI/2);desk(k,set,1.01,.67,2.30,.85,1.12);
   end.position.set(.99,.95,.64);const lid=folio(k,end,'#896759',1.57,.96);
   const gauge=k.group(set,3.18,.42,.34);k.box(gauge,plaster,0,.82,0,.55,1.65,.18);
   k.cyl(gauge,rust,0,.80,.122,.049,1.04);k.ball(gauge,rust,0,.25,.13,.12);for(let i=0;i<9;i++)k.box(gauge,slate,.17,.34+i*.13,.10,.11,.022,.020);
   desk(k,deskTop,0,0,1.35,.41,.77);page(k,deskTop,0,.52,0,1.03,.58,ivory);
   motion=(t,p,f)=>{lid.rotation.z=2.36*(1-unit(f));end.position.z=.64+.18*unit(f);};
 }else{
   for(const x of [-4.82,-2.39,0,2.39,4.82])k.taper(set,'#a8ada1',x,.49,0,.34,.98);
   k.box(set,'#b4b9a9',0,1.01,0,10.99,.23,1.18);for(const d of [-1,1])k.box(set,steel,0,1.21,d*.36,10.92,.17,.12);
   for(const x of [2.44,4.65]){k.box(set,green,x,1.96,-.69,.15,1.82,.22);k.beam(set,steel,[x,2.32,-.69],[x,2.80,.41],.049);}
   canopyRoof(k,set,3.52,2.86,-.23,3.50,1.45,'#8daba4');const car=k.group(end,0,0,0,0,0,0,1.46);train(k,car,'#6b9c90');
   const bar=k.group(deskTop,0,.59,0);k.box(bar,brass,0,0,0,1.73,.13,.29);k.taper(deskTop,slate,0,.26,0,.19,.52);
   motion=(t,p,f)=>{end.position.set(-3.23+2.31*p+unit(f)*3.68,1.29,0);end.rotation.z=.09*(1-unit(f))*Math.cos(t*1.55);bar.rotation.z=end.rotation.z;};
 }
 if(day==='1224'||day==='1227'){
   const marks=[-1,1].map(()=>{const q=k.group(root);for(const side of [-1,1]){
     k.beam(q,day==='1224'?'#e8c5a0':'#dec090',[side*.37,.093,0],[side*.68,.093,0],.037);
     k.cyl(q,day==='1224'?'#e5ac75':brass,side*.65,.17,0,.059,.18);}
     return q;});
   const pos:Point=[0,0],next:Point=[0,0],landmark=motion;
   motion=(t,p,f)=>{landmark(t,p,f);const track=g.tracks[g.sector],center=day==='1224'?(c.focus%2?.68:.28):(c.side?.64:.34);
     marks.forEach((m,i)=>{const d=track.total*(center+(i?1:-1)*(day==='1224'?.18:.14));sample(track,d,pos);sample(track,d+.02,next);
       m.position.set(pos[0],0,pos[1]);m.rotation.y=Math.atan2(next[0]-pos[0],next[1]-pos[1]);m.visible=g.phase==='wave'||g.phase==='interval';});};
 }
 return {update:motion};
}
