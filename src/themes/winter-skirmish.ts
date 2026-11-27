import * as T from 'three';
import {Kit} from './folio-landmarks';
import type {WinterReception} from '../templates/winter-skirmish';
import type {Vec} from '../slime/types';
const blue='#597e93',steel='#446777',cream='#eae4cf',copper='#be7052',ink='#303f50',brass='#d5a24c',light='#ffe296';
export const winterEyes:Record<string,Vec>={shiplink:[6,4,11],winterlight:[4,4.1,10.8],starboard:[4.7,4.1,11],counter:[5,4.7,11],cableway:[3,3.1,11]};
export const winterOutlines:Record<string,[number,number][]>={
 shiplink:[[-1.8,7],[1.8,7],[1.8,3.2],[4.88,2.3],[4.88,-3.4],[2,-3.7],[2,-7],[-2,-7],[-2,-3.8],[-4.8,-2.8],[-4.8,1.9],[-1.8,3.1]],
 winterlight:[[-2.6,7],[2.6,7],[2.6,3.8],[4.7,3.8],[4.7,-4.2],[2.8,-4.2],[2.8,-7],[-2.5,-7],[-2.5,-3.8],[-4.9,-3.8],[-4.9,2.8],[-2.6,2.8]],
 starboard:[[-2.8,7],[2.8,7],[4.7,2.2],[4.7,-2.4],[2.9,-5.7],[.8,-7],[-.8,-7],[-3,-5.7],[-4.7,-2.4],[-4.7,2.2]],
 counter:[[-2.3,7],[2.3,7],[2.3,3.1],[4.8,2.1],[4.8,-2.7],[2.3,-3.7],[2.3,-7],[-2.3,-7],[-2.3,-3.7],[-4.8,-2.7],[-4.8,2.1],[-2.3,3.1]],
 cableway:[[-1.9,7],[1.9,7],[1.9,2.4],[4.8,2.4],[4.8,-3.3],[2,-3.3],[2,-7],[-2,-7],[-2,-3.3],[-4.8,-3.3],[-4.8,2.4],[-1.9,2.4]]
};
export function paintWinterDeck(g:CanvasRenderingContext2D,c:WinterReception){
 const kind=c.spec.kind;
 for(let n=0;n<25;n++){const wood=kind==='counter'||kind==='shiplink',y=n*(wood?41:53);g.fillStyle=wood?'#59463960':'#dbe6d63a';g.fillRect(0,y,640,wood?2:3);
   for(let j=0;j<8;j++){const x=j*92+(n%2)*33;g.fillRect(x,y+3,wood?1:3,wood?38:3);}
 }
 g.lineWidth=4;g.strokeStyle=c.spec.trim;
 for(const side of [-1,1]){g.beginPath();g.moveTo(320,620);g.bezierCurveTo(320+side*75,520,320+side*215,483,320+side*180,362);g.lineTo(320,138);g.stroke();}
 if(kind==='cableway'){g.fillStyle='#eeb65e';for(let i=0;i<20;i++)g.fillRect(125+i*18,374,8,4);}
}
export function winterPad(k:Kit,o:T.Group,c:WinterReception,i:number){
 const kind=c.spec.kind;
 if(kind==='shiplink'){k.cyl(o,ink,0,.16,0,.27,.32);k.ring(o,cream,0,.58,0,.31,-.4);k.beam(o,brass,[0,.23,0],[.1,.75,.14],.039);}
 else if(kind==='winterlight'){k.taper(o,steel,0,.25,0,.2,.5);k.ball(o,light,0,.58,0,.19,.29,.19,'lamp');k.taper(o,ink,0,.85,0,.25,.13);}
 else if(kind==='starboard'){k.cyl(o,steel,0,.11,0,.37,.22);for(let j=0;j<3;j++)k.beam(o,cream,[(j-1)*.16,.22,0],[(j-1)*.23,.57,.05],.05);}
 else if(kind==='counter'){k.box(o,copper,0,.16,0,.63,.32,.45);k.box(o,cream,0,.38,-.08,.44,.21,.11);for(let n=0;n<=i;n++)k.box(o,ink,(n-i/2)*.07,.39,-.005,.033,.1,.013);}
 else{k.box(o,steel,0,.15,0,.67,.30,.42);k.ring(o,brass,0,.46,0,.24);k.beam(o,ink,[-.32,.44,0],[.32,.44,0],.039);}
}
export function buildWinterVenue(k:Kit,root:T.Group,c:WinterReception){
 const kind=c.spec.kind,move=(x:number,y:number,z:number)=>{const o=k.group(root,x,y,z);o.userData.hinged=true;return o;};
 const effects:((t:number,f:number)=>void)[]=[];
 const box=(o:T.Group,cl:string,x:number,y:number,z:number,w:number,h:number,d:number)=>k.box(o,cl,x,y,z,w,h,d);
 function vessel(o:T.Group,blue:boolean){
   const hull=blue?'#37526e':'#a45a48';
   k.ball(o,hull,0,-.02,0,3.1,.75,.93);box(o,cream,0,.52,0,5.34,.14,1.52);
   box(o,steel,-.88,1.04,0,1.3,.87,1.12);box(o,cream,-.88,1.53,0,1.61,.14,1.31);
   for(let i=0;i<5;i++)box(o,'#9ec7ca',-1.38+i*.25,1.18,.571,.17,.26,.04);
   for(let i=0;i<9;i++)k.cyl(o,cream,-2.3+i*.57,.81,.71,.035,.5);
   k.beam(o,cream,[-2.3,1.05,.71],[2.26,1.05,.71],.034);
   k.beam(o,ink,[-.85,1.61,0],[-.85,3.07,0],.063);k.beam(o,brass,[-1.4,2.62,0],[-.28,2.62,0],.046);
 }
 if(kind==='shiplink'||kind==='starboard'||kind==='cableway'){
   for(let j=0;j<110;j++){const x=-34+j*73%69,z=-32+j*17%46;
     k.box(root,j%3?'#8ebbbd':'#c1cebc',x,-1.79,z,.32+j%6*.42,.04,.063);}
 }
 if(kind==='shiplink'){
   const ship=move(0,-.82,-10.2);vessel(ship,false);
   for(const side of [-1,1]){
     const x=side*6.15;k.taper(root,cream,x,.65,-4,.45,3.5);k.ring(root,steel,x,2.65,-4,.74,-.49);
     k.beam(root,copper,[x,1.82,-4],[x,2.83,-3.74],.062);
   }
   // Rockbound coastal receiving station, with its own rotating dish and a passing orbiter.
   for(let i=0;i<20;i++){const x=(i%2?-1:1)*(7.8+i*3%9),z=-7-i%7*1.98;
     k.ball(root,i%3?'#758b80':'#a09a80',x,-1.56,z,.9+i%4*.36,.42+i%3*.36,1.2+i%5*.21);}
   k.taper(root,cream,8.1,.28,-12.3,.63,3.72);k.cyl(root,copper,8.1,1.37,-12.3,.48,.57);
   k.cyl(root,ink,8.1,2.23,-12.3,.64,.17);k.ball(root,light,8.1,2.61,-12.3,.33,.39,.33,'lamp');k.taper(root,copper,8.1,3.08,-12.3,.63,.40);
   const dome=k.group(ship,.94,.68,0);k.taper(dome,ink,0,.22,0,.23,.45);k.ring(dome,cream,0,.7,0,.52,-.74);
   for(let j=0;j<8;j++){const a=j*Math.PI/4;k.beam(dome,cream,[0,.43,0],[.48*Math.cos(a),.71+.23*Math.sin(a),.36*Math.sin(a)],.025);}
   const craft=move(0,5.5,-17.6);k.box(craft,brass,0,0,0,.4,.45,.46);
   for(const side of [-1,1]){k.box(craft,steel,side*.74,.06,0,.98,.065,.48);for(let j=0;j<4;j++)k.box(craft,'#89adc2',side*(.34+j*.23),.104,0,.17,.015,.38);}
   effects.push((t,f)=>{craft.position.x=-2.6+Math.sin(t*.225)*1.65+Math.min(1,f)*1.2;craft.rotation.z=.28;});
   const signal=move(0,0,0);k.ball(signal,light,0,0,0,.2,.2,.2,'glow');
   effects.push((t,f)=>{ship.rotation.z=Math.sin(t*.91)*.047;ship.position.x=Math.min(2.2,f*.85);const q=f?Math.min(1,f/.92):(t*.27)%1;
     signal.visible=c.done.has(0);signal.position.set(-6.15*(1-q),2.75+Math.sin(q*Math.PI)*2.9-q,-4-q*6.2);});
 }else if(kind==='winterlight'){
   const lamps:T.Group[]=[];
   for(let i=0;i<10;i++){const x=(i%2?1:-1)*(5.75+(i%3)*.64),z=3-Math.floor(i/2)*3.9,y=1+i%3*.28;
     box(root,i%2?'#8791a3':'#a47769',x,y-.78,z,1.85,2*y,1.98);
     const roof=k.group(root,x,y*2-.76,z);for(const side of [-1,1]){const half=k.group(roof,side*.51,0,0,0,0,side*-.45);box(half,cream,0,0,0,1.27,.15,2.3);}
     const win=move(x,y-.65,z+1.005);box(win,light,0,0,0,.72,.48,.055);lamps.push(win);box(root,steel,x,y-.65,z+1.047,.055,.54,.025);
   }
   for(const x of [-2.5,.1,2.6]){const z=-10.8-Math.abs(x)*.65;k.taper(root,cream,x,1.55,z,.28,4.4);
     const blades=move(x,3.76,z+.12);for(let j=0;j<3;j++){const b=k.group(blades,0,0,0,0,0,j*2.094);k.beam(b,cream,[0,0,0],[.13,1.28,0],.092);k.ball(b,copper,.13,.99,0,.10,.32,.05);}
     effects.push(t=>blades.rotation.z=t*(.52+x*.04));}
   effects.push((_,f)=>lamps.forEach((l,i)=>{l.visible=i<Math.floor(c.charge*3)||f>.13+i*.12;}));
 }else if(kind==='starboard'){
   const ship=move(0,-.75,-10.6);vessel(ship,true);ship.scale.setScalar(1.32);
   // Twin launch cradles, an open truss gantry and the tug waiting behind the work ship.
   k.box(ship,blue,1.18,.74,0,1.89,.31,1.36);
   for(const side of [-1,1]){const x=side*1.17;k.beam(ship,copper,[x,.65,-.67],[x*.76,2.78,-.67],.11);
     k.beam(ship,cream,[x,.67,.61],[x*.76,2.78,-.67],.084);}
   k.beam(ship,copper,[-.93,2.8,-.67],[.93,2.8,-.67],.12);
   for(let j=0;j<4;j++)k.beam(ship,cream,[-.9+j*.45,2.57,-.67],[-.49+j*.45,2.91,-.67],.034);
   for(const side of [-1,1]){const rack=k.group(root,side*4.85,-.63,1.12,0,-side*.12,0);
     box(rack,blue,0,.38,-.74,.43,.77,3.5);for(let i=0;i<7;i++){k.beam(rack,cream,[0,.76,.8-i*.45],[side*.39,1.36,.6-i*.45],.064);}}
   const tug=k.group(root,-8.5,-1.37,-14.5,0,-.57,0,0.63);k.ball(tug,ink,0,.37,0,2.75,.55,1.12);box(tug,cream,.35,1.01,0,1.54,.78,1.31);
   box(tug,copper,.35,1.49,0,1.72,.13,1.53);k.cyl(tug,steel,-.8,1.04,0,.22,1.12);
   for(const s of [-1,1])for(let i=0;i<7;i++){
     const star=move(0,0,0);k.box(star,brass,0,0,0,.18,.19,.18);for(const side of [-1,1])k.box(star,'#689bc5',side*.19,0,0,.17,.055,.26);
     effects.push((t,f)=>{const q=Math.min(1,Math.max(0,(f-i*.075)/1.55)),active=c.done.has(s<0?1:2);
       star.visible=active;star.position.set(s*(.35+i*.32+q*(.3+i*.19)),.32+.095*i+q*(1.35+2.65*Math.sin(i*.38)), -9.94-q*i*.32);star.rotation.y=t*.35+i;});
   }
   effects.push(t=>ship.rotation.z=(c.sweep-.5)*.14+Math.sin(t*.31)*.015);
 }else if(kind==='counter'){
   const frame=move(0,0,-9.65);
   box(frame,ink,0,1.79,-.55,6.18,3.32,.8);box(frame,copper,0,.06,0,6.7,.44,1.9);
   const segments=[[0,.54,.59,.10],[.31,.29,.095,.4],[.31,-.29,.095,.4],[0,-.54,.59,.1],[-.31,-.29,.095,.4],[-.31,.29,.095,.4],[0,0,.59,.10]];
   const digits=['1111110','0110000','1101101','1111001','0110011','1011011','1011111','1110000','1111111','1111011'];
   for(let d=0;d<3;d++){const x=(d-1)*1.4;box(frame,steel,x,1.99,0,1.21,1.85,.32);
     segments.forEach(([xx,y,w,h],j)=>{const seg=move(x+xx,1.99+y,-9.44);box(seg,light,0,0,0,w,h,.075);
       effects.push(()=>{const val=c.aligned?400:c.face;seg.visible=digits[Number(String(val)[d])][j]==='1';});});}
   const drawer=move(0,.64,-9.45);box(drawer,brass,0,0,0,3.56,.24,1.37);box(drawer,cream,0,.17,0,2.95,.075,.98);
   effects.push((_,f)=>drawer.position.z=-9.45+Math.min(1,f*.78)*1.95);
 }else{
   const z=-10.5;k.box(root,steel,0,.73,z,11.5,.26,1.64);
   for(const x of [-3.7,3.7])for(const zz of [z-.91,z+.91])k.taper(root,'#c47f5b',x,1.35,zz,.24,4.3);
   for(const zz of [z-.91,z+.91])for(let i=0;i<18;i++){
     const x=-5.7+i*.64, y=(x:number)=>1.5+1.96*Math.max(0,1-Math.abs(Math.abs(x)-3.7)/3.7)**1.65;
     k.beam(root,ink,[x,y(x),zz],[x+.64,y(x+.64),zz],.048);k.beam(root,cream,[x,.9,zz],[x,y(x),zz],.026);}
   const car=move(-4.2,.90,z);box(car,copper,0,.41,0,1.18,.49,.62);box(car,cream,.18,.75,0,.6,.26,.57);
   for(const x of [-.38,.38])for(const zz of [-.3,.3])k.ball(car,ink,x,.18,zz,.16,.16,.07);
   const trolley=move(-3,.18,-.76);box(trolley,brass,0,.04,0,.52,.16,.44);
   effects.push((_,f)=>{car.position.x=-4.2+Math.min(1,f/2)*8.4;trolley.position.x=-3+6*c.crossing;});
 }
 return (t:number,f:number)=>effects.forEach(fn=>fn(t,f));
}
