import * as T from 'three';
import {Kit} from './folio-landmarks';
import type {YearendReception} from '../templates/yearend-skirmish';
import type {Vec} from '../slime/types';
const cream='#ece1c5',ink='#344954',brass='#cf9e60',blue='#638c9c',wood='#946c4f',red='#ba6d51',pale='#b7cbc1',gold='#ffdb86';
export const yearendGround:Record<string,string>={pennants:'#7c9b9c',roster:'#a2927d',pulseprint:'#667b72',samplebox:'#a6bab7',solstice:'#97a37c'};
export const yearendEyes:Record<string,Vec>={pennants:[4.2,3.3,10.3],roster:[-4.5,4,10.8],pulseprint:[3.5,3.4,10.1],samplebox:[5.2,4.35,10.4],solstice:[-4.2,3.66,10.8]};
export const yearendOutlines:Record<string,[number,number][]>={
 pennants:[[-1.94,7],[2.12,7],[2.12,4.05],[4.72,2.67],[4.72,-2.72],[2.37,-4.15],[2.37,-7],[-2.37,-7],[-2.37,-4.15],[-4.72,-2.72],[-4.72,2.67],[-1.94,4.05]],
 roster:[[-2.77,7],[2.77,7],[2.77,3.25],[4.80,3.25],[4.80,-3.42],[2.78,-3.42],[2.78,-7],[-2.78,-7],[-2.78,-3.42],[-4.80,-3.42],[-4.80,3.25],[-2.77,3.25]],
 pulseprint:[[-2.13,7],[2.13,7],[2.13,4],[4.78,2.52],[4.78,-2.12],[2.04,-4.33],[2.04,-7],[-2.04,-7],[-2.04,-4.33],[-4.78,-2.12],[-4.78,2.52],[-2.13,4]],
 samplebox:[[-2.45,7],[2.45,7],[2.45,3.2],[4.82,2.4],[4.82,-2.81],[2.52,-3.94],[2.52,-7],[-2.52,-7],[-2.52,-3.94],[-4.82,-2.81],[-4.82,2.4],[-2.45,3.2]],
 solstice:[[-1.97,7],[1.97,7],[2.3,3.18],[4.75,2.22],[4.75,-2.61],[2.07,-3.67],[2.07,-7],[-2.07,-7],[-2.07,-3.67],[-4.75,-2.61],[-4.75,2.22],[-2.3,3.18]]
};
export function paintYearendDeck(g:CanvasRenderingContext2D,c:YearendReception){
 const d=c.day;
 for(let i=0;i<24;i++){const y=i*39;g.fillStyle=d==='1218'?'#614a382f':d==='1220'?'#e1efea70':'#43545a4f';g.fillRect(0,y,640,2);
   for(let j=0;j<9;j++){const x=j*83+i%2*27;g.fillRect(x,y+2,d==='1219'?4:2,d==='1217'?36:8);}}
 g.strokeStyle=c.spec.trim;g.lineWidth=3;
 if(d==='1221'){for(let i=0;i<46;i++){g.fillStyle='#665640';g.fillRect(172+i*6.6,425,2,i%5?9:18);}g.strokeRect(174,404,297,43);}
 if(d==='1219'){for(let r=0;r<4;r++){g.beginPath();g.arc(320,360,39+r*40,0,Math.PI*2);g.stroke();}}
 if(d==='1218'||d==='1220'){for(const x of [200,440])g.strokeRect(x-8,159,16,489);}
 if(d==='1217'){for(const s of [-1,1]){g.beginPath();g.moveTo(320,625);g.quadraticCurveTo(320+s*250,500,320+s*175,355);g.stroke();}}
}
export function yearendPad(k:Kit,o:T.Group,c:YearendReception,_i:number){
 if(c.day==='1217'){k.cyl(o,wood,0,.11,0,.22,.22);k.beam(o,cream,[0,0,0],[0,.65,0],.05);k.ring(o,brass,0,.63,0,.141);}
 else if(c.day==='1218'){k.box(o,wood,0,.12,0,.71,.24,.42);k.cyl(o,cream,0,.39,0,.18,.35);k.cyl(o,brass,0,.60,0,.23,.08);}
 else if(c.day==='1219'){k.box(o,ink,0,.15,0,.64,.3,.47);for(let i=0;i<3;i++)k.box(o,i===1?gold:pale,(i-1)*.14,.36,.02,.058,.09+i*.05,.08);}
 else if(c.day==='1220'){k.box(o,cream,0,.14,0,.69,.28,.51);k.ring(o,blue,0,.45,0,.24);}
 else{k.box(o,'#ac9d81',0,.11,0,.71,.22,.49);k.beam(o,brass,[0,.18,0],[.15,.63,0],.048);}
}
export function buildYearendVenue(k:Kit,r:T.Group,c:YearendReception){
 const effects:((t:number,f:number)=>void)[]=[];const move=(x:number,y:number,z:number)=>{const g=k.group(r,x,y,z);g.userData.hinged=true;return g;};
 const rod=(o:T.Group,col:string,a:Vec,b:Vec,w:number)=>k.beam(o,col,a,b,w);
 const box=(o:T.Group,col:string,x:number,y:number,z:number,w:number,h:number,d:number)=>k.box(o,col,x,y,z,w,h,d);
 function island(col:string,w:number,z=-10.62){box(r,col,0,-.97,z,w,1.90,6.48);}
 function reel(o:T.Group,x:number,y:number,z:number,rad:number){
   k.cyl(o,brass,x,y+.34,z,rad*1.14,.12);k.cyl(o,wood,x,y-.34,z,rad*1.14,.12);k.cyl(o,cream,x,y,z,rad,.55);}
 // Each viewing walkway has a grounded substructure all the way down to its landscape.
 for(const [x,z] of [[-1.47,6.06],[1.47,6.06],[-3.91,.88],[3.91,.88],[-1.54,-5.42],[1.54,-5.42]]){
   if(c.day==='1217'){k.cyl(r,wood,x,-1.08,z,.18,1.87);rod(r,ink,[x,-1.26,z],[x*.59,-.34,z-.36],.073);}
   else{box(r,c.day==='1220'?blue:c.day==='1218'?wood:'#7e8174',x,-1.08,z,.53,1.88,.61);}
 }
 if(c.day==='1217'){
   for(const side of [-1,1]){const x=side*6.34;
     for(let i=0;i<4;i++){const z=4.64-i*4.14;box(r,blue,x,.82,z,.31,5.48,.36);
       if(i<3){rod(r,cream,[x,3.35,z],[x,3.35,z-4.14],.101);box(r,pale,x,1.02,z-2.07,.14,.23,4.01);}
       box(r,cream,x,3.63,z,1.06,.17,.61);}
     for(const z of [2.56,-5.72]){box(r,blue,x,.36,z,.19,2.77,3.50);
       box(r,'#bac8b8',x-side*.124,.48,z,.046,2.04,2.93);rod(r,cream,[x-side*.154,-.35,z-1.23],[x-side*.154,1.32,z+1.23],.039);}
   }
   for(const side of [-1,1])for(const z of [-9.80,-.96,4.44])k.cyl(r,wood,side*(z===-9.80?3.89:5.32),-1.13,z,.25,1.75);
   island('#908a79',12.1);
   // A plinth, railings and bunting frame a stationary festival exhibit.
   box(r,ink,0,.24,-10.95,6.55,.48,2.33);box(r,cream,0,.56,-10.95,6.25,.14,2.21);
   k.ball(r,blue,0,1.06,-11.05,2.69,.52,.70);box(r,cream,0,1.46,-11.05,4.80,.11,1.16);
   box(r,ink,-.45,1.71,-11.05,1.36,.39,.72);box(r,cream,-.49,1.98,-11.05,1.55,.14,.86);
   for(let i=0;i<5;i++)box(r,blue,-1+i*.25,1.77,-10.672,.16,.15,.03);
   box(r,brass,.13,.59,-9.746,2.55,.56,.13);
   // Brass inlay of a hull and waves remains legible on the uncovered plaque.
   k.beam(r,ink,[-.61,.65,-9.66],[.66,.65,-9.66],.023);k.beam(r,ink,[-.61,.65,-9.66],[-.40,.49,-9.66],.023);k.beam(r,ink,[-.40,.49,-9.66],[.43,.49,-9.66],.023);k.beam(r,ink,[.43,.49,-9.66],[.66,.65,-9.66],.023);
   const curtain=move(.13,.64,-9.59);box(curtain,red,0,0,0,2.58,.68,.075);
   for(let j=0;j<9;j++)box(curtain,'#d18b63',(j-4)*.26,0,.049,.053,.61,.028);
   for(const sx of [-1,1])for(let q=0;q<3;q++){const x=sx*(q===0?3.89:5.32),z=q===0?-9.80:q===1?-.96:4.44;
     k.cyl(r,ink,x,.02,z,.34,1.09);k.taper(r,cream,x,1.45,z,.13,2.36);k.ball(r,brass,x,2.68,z,.14);}
   for(const z of [-9.80,4.44]){const span=z<0?3.89:5.32;for(let i=0;i<13;i++){const x=-span+i*2*span/13,xx=-span+(i+1)*2*span/13;
     const y=(a:number)=>2.55-.58*(1-(a/span)**2);rod(r,cream,[x,y(x),z],[xx,y(xx),z],.025);
     const flag=k.group(r,x+.12,y(x)-.18,z,0,0,i%2?.1:-.08);
     k.put('cone',flag,'toon',[red,blue,brass,cream][i%4],0,0,0,.14,.35,.051,Math.PI,0,0);}}
   for(const s of [-1,1]){const x=s*4.12;rod(r,ink,[x,-1.83,1.2],[x,.75,1.2],.077);k.ring(r,brass,x,.88,1.2,.18);}
   const hanging=move(0,0,0);
   for(let i=0;i<9;i++){const x=-2.55+i*.62,y=1.66+.06*x*x;rod(hanging,cream,[x,y,-10.09],[x+.62,1.66+.06*(x+.62)**2,-10.09],.019);
     k.put('cone',hanging,'toon',[red,brass,blue][i%3],x+.21,y-.11,-10.08,.13,.23,.048,Math.PI,0,0);}
   effects.push((t,f)=>{hanging.scale.x=.16+.20*c.hooks+.44*Math.min(1,f);hanging.position.y=.04*Math.sin(t*2.2);
     curtain.position.y=.64+.58*Math.min(1,f);curtain.scale.y=Math.max(.015,1-f/1.08);});
 }else if(c.day==='1218'){
   island('#948572',12);
   box(r,wood,0,1.98,-11.42,6.09,3.97,.53);box(r,ink,0,2.01,-11.10,5.60,3.61,.085);
   for(let i=0;i<100;i++){const x=(i%10-4.5)*.53,y=.56+Math.floor(i/10)*.321;
     box(r,i%4===0?'#d4b87c':i%3?'#b6aa8d':'#9da99f',x,y,-11.026,.45,.251,.062);
     box(r,wood,x,y-.049,-10.985,.23-(i%3)*.04,.035,.018);}
   for(const s of [-1,1]){const o=move(s*1.15,2,-10.89);box(o,s<0?'#9c7050':'#b0815f',0,0,0,2.34,3.47,.091);
     for(let j=0;j<8;j++)box(o,brass,(j-3.5)*.29,0,.061,.025,3.41,.024);
     const roll=move(s*2.6,1.94,-10.72);k.cyl(roll,cream,0,0,0,.28,3.54);box(roll,brass,0,0,.289,.055,3.45,.027);for(const a of [-1,1])k.cyl(roll,brass,0,a*1.84,0,.34,.15);
     effects.push((_,f)=>{const feeding=c.first===(s<0?1:2)&&!c.token?Math.min(1,c.progress/1.55)*.29:0;
       const q=Math.min(1,(c.done.size-1)*.1+feeding+f*.78),v=Math.max(0,q);
       o.position.x=s*(2.07+.45*v);o.scale.x=Math.max(.02,.39*(1-v));roll.rotation.y=c.progress*3+f*2;});}
   // Entry vignette: an unrolled sheet bends between two large rollers in a walnut reading stand.
   const lectern=k.group(r,-4.05,0,3.85,0,.30,0);box(lectern,wood,0,-.79,0,1.65,2.30,1.09);
   const sheet=k.group(lectern,0,1.08,0,-.29,0,0);box(sheet,cream,0,0,0,1.97,1.14,.09);
   for(let row=0;row<3;row++)for(let col=0;col<5;col++)box(sheet,col%2?'#a49978':'#b8ac87',(col-2)*.31,(row-1)*.29,.055,.25,.18,.025);
   for(const x of [-1.03,1.03]){k.cyl(sheet,brass,x,0,.04,.14,1.32);k.cyl(sheet,cream,x,0,.04,.153,1.09);}
   for(const [x,z] of [[5.35,3.41],[-5.62,-2.86],[5.62,-3.32]]){
     const o=k.group(r,x,.26,z);box(o,wood,0,-.93,0,1.19,2.53,1.52);box(o,cream,0,.44,0,1.41,.18,1.69);
     reel(o,0,.88,0,.32);}
   for(const x of [-6.35,6.35]){for(let j=0;j<4;j++){const z=3.6-j*4.41;box(r,'#8e7459',x,.98,z,.36,5.83,.38);
     if(j<3){box(r,'#ccba98',x,2.28,z-2.2,.22,2.31,4.02);for(let n=0;n<3;n++)box(r,wood,x,3.50,z-.42-n*1.49,.31,.17,1.28);}}}
 }else if(c.day==='1219'){
   for(let i=0;i<47;i++){const x=(i%2?1:-1)*(8+i*5%18),z=9-i*13%38;k.put('rock',r,'toon',i%3?'#71877c':'#586f6b',x,-1.45,z,1.7+i%5,.6+i%4*.54,2.2+i%3);}
   const dish=k.group(r,-5.65,.07,-4.51,.25,0,-.11);
   for(let n=1;n<=6;n++){const radius=n*.56;k.ring(dish,n%2?blue:pale,0,-.48+radius*radius*.135,0,radius,Math.PI/2);}
   for(let i=0;i<22;i++){const a=i*Math.PI/11;for(let j=0;j<6;j++){const v=j*.56,w=v+.56;
     rod(dish,cream,[v*Math.cos(a),-.48+v*v*.135,v*Math.sin(a)],[w*Math.cos(a),-.48+w*w*.135,w*Math.sin(a)],.035);}}
   for(const a of [0,2.094,4.189])rod(dish,brass,[3.1*Math.cos(a),.98,3.1*Math.sin(a)],[0,2.48,0],.059);
   k.ball(dish,ink,0,2.47,0,.37,.21,.33);
   island('#758178',8.6);box(r,ink,.52,1.20,-10.9,3.36,2.24,1.59);box(r,blue,.52,2.41,-10.86,3.58,.16,1.82);
   const sheet=move(.52,2.09,-10.04);box(sheet,cream,0,-.76,0,2.47,1.52,.083);
   for(let i=0;i<30;i++){const x=(i%15-7)*.15,y=-.51-Math.floor(i/15)*.56;
     box(sheet,i<15?blue:red,x,y,.055,.045,.10+(i*19%11)*.032,.022);}
   for(let j=0;j<8;j++){const x=.52+(j-3.5)*.36;box(r,j%2?brass:pale,x,1.75,-10.04,.23,.15,.065);}
   for(const side of [-1,1]){const m=move(side*3.13,.25,-1.51);k.box(m,brass,0,.16,0,.36,.09,.16);
     effects.push(()=>{m.position.y=.25+(side<0?1-c.signal:c.signal)*.56;});}
   effects.push((_,f)=>sheet.scale.y=.13+c.done.size*.095+Math.min(1,f/1.42)*.56);
 }else if(c.day==='1220'){
   island('#9aada7',10.4);box(r,ink,0,.79,-11.19,5.62,1.60,2.36);
   const caseZ=-11.26;for(const x of [-2.63,2.63])for(const z of [caseZ-.98,caseZ+.98])k.cyl(r,cream,x,2.47,z,.069,1.94);
   box(r,pale,0,3.51,caseZ,5.62,.17,2.27);box(r,'#abc4be',0,2.48,caseZ-1.10,5.18,1.74,.11);
   const drawer=move(0,1.67,-11.42);box(drawer,brass,0,0,0,3.49,.18,1.55);box(drawer,'#66777b',0,.13,0,3.25,.09,1.41);
   for(let i=0;i<17;i++)k.put('rock',drawer,'toon',i%3?'#9c9181':'#ad9a81',i*13%27/10-1.25,.26+(i%3)*.025,i*7%9/10-.40,.13+i%3*.048,.08+i%3*.035,.13);
   for(const side of [-1,1]){const ring=move(side*1.91,1.99,caseZ);k.ring(ring,cream,0,0,0,.70,0,Math.PI/2);k.ring(ring,blue,0,0,0,.51,0,Math.PI/2);
     effects.push((_,f)=>ring.rotation.y=side*(.52*(1-c.progress)-Math.min(1,f)*.42));}
   const near=k.group(r,-3.48,.04,3.64,0,.48,0);box(near,blue,0,-.59,0,1.95,2.54,1.21);
   box(near,cream,0,.76,0,2.12,.17,1.46);box(near,ink,0,1.42,-.49,2.03,1.19,.15);
   box(near,'#a8c5c0',0,1.44,-.388,1.83,.96,.04);box(near,blue,0,2.10,-.13,2.17,.12,.86);
   for(const side of [-1,1]){const x=side*.52;box(near,cream,x,.94,0,.73,.18,.62);k.ring(near,blue,x,1.36,.024,.42);k.ring(near,brass,x,1.36,.10,.29);
     k.ball(near,'#98a9a1',x,1.36,-.04,.13,.13,.09);}
   for(const s of [-1,1])for(let j=0;j<4;j++){const x=s*5.72,z=4.03-j*3.56;
     box(r,blue,x,.32,z,.21,4.37,.20);box(r,cream,x,2.62,z,.74,.19,.45);
     if(j<3){box(r,pale,x,.75,z-1.78,.13,.16,3.36);box(r,blue,x,2.61,z-1.78,.18,.18,3.35);}
     if(s>0&&j>0){box(r,'#a4bfbb',x+.11,.53,z-1.48,.074,2.49,2.80);
       for(let n=0;n<3;n++)box(r,cream,x+.032,1.35+n*.14,z-1.48,.033,.043,2.28);}}
   effects.push((_,f)=>drawer.position.z=-11.42+Math.min(1,f/1.65)*1.63);
 }else{
   island('#a89d80',10.33);
   for(const s of [-1,1])for(let j=0;j<5;j++){const x=s*6.03,z=4.31-j*3.41;
     box(r,'#aa987a',x,-.91,z,.67,2.0,3.24);box(r,cream,x,.15,z,.88,.13,3.30);
     if(j%2===0){k.taper(r,'#927e61',x,.51,z,.22,.61);k.ball(r,cream,x,.87,z,.23,.18,.23);}
     if(s>0||j%2){const xx=x+s*(1.29+j%2),y=.30+j%3*.24;rod(r,wood,[xx,-1.89,z],[xx,y+1.02,z],.13);
       for(let k0=0;k0<4;k0++)k.put('rock',r,'toon',k0%2?'#859978':'#a2a477',xx+(k0%2-.5)*.88,y+.83+.37*(k0%3),z+(k0%3-.8)*.52,.97,.54,.82);}}
   const near=k.group(r,-3.86,.03,3.20,0,.12,0);box(near,'#b4a083',0,-.53,0,1.18,2.82,3.27);
   box(near,'#d6c2a1',0,.95,0,1.24,.13,3.37);box(near,brass,0,1.75,-1.05,.16,1.53,.15);box(near,brass,.26,2.56,-1.05,.70,.09,.13);
   for(let i=0;i<20;i++)box(near,ink,.29,1.024,-1.29+i*.134,i%5?.16:.32,.014,.025);
   const hand=k.group(near,0,1.043,-1.04);hand.userData.hinged=true;box(hand,'#695f4d',0,0,.64,.095,.022,1.28);
   effects.push(()=>hand.scale.z=.41+c.signal*1.12);
   box(r,'#b4a786',0,.26,-10.68,4.85,.54,2.60);box(r,'#d1bea0',0,.63,-10.68,4.53,.19,2.38);
   for(let j=0;j<22;j++)box(r,ink,-1.94+j*.181,.738,-10.03,.032,.018,j%5?.20:.39);
   const poleX=-1.32;box(r,brass,poleX,2.17,-11.02,.22,2.95,.21);box(r,brass,poleX+.32,3.73,-11.02,.86,.12,.15);
   const shadow=move(poleX,.754,-10.76);box(shadow,'#635f51',.91,0,0,1.82,.026,.12);
   const rubbing=move(.88,.78,-10.31);box(rubbing,cream,0,0,0,1.59,.08,1.01);for(let i=0;i<8;i++)box(rubbing,brass,-.58+i*.16,.053,0,.023,.018,.31+i%3*.09);
   effects.push((_,f)=>{shadow.scale.x=.34+1.27*(f?1:c.signal);rubbing.position.y=.78+Math.min(1,f)*.52;rubbing.rotation.x=-Math.min(1,f/1.45)*1.05;});
 }
 return (t:number,f:number)=>effects.forEach(fn=>fn(t,f));
}
