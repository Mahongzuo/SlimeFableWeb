import * as T from 'three';
import {Kit} from './folio-landmarks';
import type {MonthendReception} from '../templates/monthend-skirmish';
import {monthendRelayMaps} from '../templates/monthend-skirmish';
import type {Vec} from '../slime/types';
const dark='#354952',cream='#eee2c5',sea='#719ba7',wood='#926b4f',gold='#e6b875',red='#b76551',leaf='#78937d',snow='#e0e6dc';
type Point=[number,number];
const deckProfiles:Point[][]=[
 [[2.5,7],[2.5,3.7],[4.7,3.7],[4.7,-3.3],[2.8,-3.3],[2.8,-7]],
 [[1.95,7],[2.25,3.7],[4.66,2.1],[4.66,-2.45],[2.65,-4.55],[1.95,-7]],
 [[2.25,7],[2.97,3.8],[4.79,2.7],[4.56,-.6],[4.8,-2.62],[2.86,-4.43],[2.35,-7]],
 [[2.73,7],[2.73,3.4],[4.10,3.1],[4.93,1.35],[4.86,-2.22],[3.52,-3.52],[2.23,-4.68],[2.23,-7]]
];
export const monthendOutlines:Record<string,Point[]>={},monthendGround:Record<string,string>={},monthendEyes:Record<string,Vec>={};
const skies=['#82938c','#70979c','#9db7bf','#aab6a7','#9ba196','#958574','#8da1b7','#94a3a2','#697988','#9e8875'];
Object.values(monthendRelayMaps).forEach((m,i)=>{const a=deckProfiles[i%4],b=deckProfiles[(i+3)%4];
 monthendOutlines[m.kind]=[...a,...[...b].reverse().map(([x,z]):Point=>[-x,z])];monthendGround[m.kind]=skies[i];
 monthendEyes[m.kind]=[i%3===1?-3.65:3.66,3.06+i%4*.33,10.36+i%3*.3];});
export function paintMonthendDeck(g:CanvasRenderingContext2D,c:MonthendReception){
 const d=c.day,idx=Number(d)-1222;g.strokeStyle='#59646177';g.fillStyle='#eee3c156';g.lineWidth=2;
 for(let j=0;j<26;j++){const y=j*35;g.beginPath();g.moveTo(0,y);g.lineTo(640,y+idx%3*3);g.stroke();
   for(let i=0;i<7;i++)g.fillRect(i*98+j%2*39,y+4,4,4);}
 g.strokeStyle=c.spec.trim;g.lineWidth=3;
 if(d==='1222'){for(let j=0;j<28;j++)for(let i=0;i<6;i++){if((i+j)%4)g.fillRect(257+i*21,j*35,9,6);}}
 else if(['1223','1226','1229','1231'].includes(d)){for(const x of [264,376]){g.beginPath();g.moveTo(x,840);g.bezierCurveTo(x+78,514,x-79,357,x,0);g.stroke();}}
 else if(d==='1227'||d==='1230'){for(let i=0;i<29;i++){const x=40+i*167%555,y=24+i*223%792;g.fillRect(x,y,5+i%4,5+i%4);if(i%3) {g.beginPath();g.moveTo(x,y);g.lineTo(x+23,y-12);g.stroke();}}}
 else for(let i=0;i<5;i++){g.beginPath();g.ellipse(320,424,87+i*36,123+i*38,idx*.08,0,Math.PI*2);g.stroke();}
}
export function monthendPad(k:Kit,o:T.Group,c:MonthendReception,i:number){
 const col=c.spec.trim;k.box(o,dark,0,.10,0,.59,.18,.43);
 if(c.day==='1222'||c.day==='1226'||c.day==='1231'){k.box(o,cream,0,.23,.014,.4,.065,.26);k.cyl(o,col,.11,.39,-.08,.10,.22);}
 else if(c.day==='1223'||c.day==='1224'){k.box(o,col,0,.34,-.08,.44,.33,.095);k.box(o,sea,0,.35,-.016,.33,.23,.028);}
 else if(c.day==='1229'){for(let j=0;j<5;j++)k.box(o,j===i?col:cream,(j-2)*.10,.21+j*.045,0,.056,.12+j*.088,.12);}
 else {k.ring(o,col,0,.39,0,.205);k.ball(o,cream,0,.39,0,.08);}
}
export function buildMonthendVenue(k:Kit,r:T.Group,c:MonthendReception){
 const d=c.day, anim:((t:number,f:number)=>void)[]=[];
 const obj=(x:number,y:number,z:number,ry=0,s=1)=>k.group(r,x,y,z,0,ry,0,s);
 const moving=(x:number,y:number,z:number)=>{const o=obj(x,y,z);o.userData.hinged=true;return o;};
 const rect=(p:T.Group,col:string,x:number,y:number,z:number,w:number,h:number,l:number)=>k.box(p,col,x,y,z,w,h,l);
 const bar=(p:T.Group,col:string,a:Vec,b:Vec,w=.055)=>k.beam(p,col,a,b,w);
 const disc=(o:T.Group,col:string,x:number,y:number,z:number,rad:number,w:number)=>k.put('round',o,'toon',col,x,y,z,rad,w,rad,Math.PI/2);
 function shelf(o:T.Group,w:number,h:number,l:number,col=wood){
   rect(o,col,0,h,0,w,.18,l);for(const s of [-1,1])for(const v of [-1,1])rect(o,col,s*(w/2-.15),(h-1.9)/2,v*(l/2-.14),.18,h+1.78,.18);
 }
 function house(o:T.Group,x:number,z:number,s:number,col=cream){const c=k.group(o,x,0,z,0,0,0,s);
   rect(c,col,0,.86,0,1.72,1.72,1.14);for(const sx of [-1,1])k.put('box',c,'toon',dark,sx*.47,1.86,0,1.07,.13,1.43,0,0,-sx*.30);
   for(const sx of [-.51,.51]){rect(c,wood,sx,.82,.61,.43,.75,.095);rect(c,sea,sx,.94,.669,.30,.40,.032);rect(c,cream,sx,.94,.693,.027,.40,.015);}
 }
 function backing(x:number,z:number,w:number,h:number){rect(r,dark,x,h*.5,z,w,h,.24);rect(r,'#627877',x,h*.50,z+.153,w-.32,h-.30,.048);}
 function contour(o:T.Group,col:string,points:Vec[],w:number){for(let i=1;i<points.length;i++)bar(o,col,points[i-1],points[i],w);}
 function cabinet(o:T.Group){
   rect(o,'#748d88',0,1.11,0,1.35,2.22,.79);rect(o,dark,0,1.65,.42,1.13,.85,.073);
   for(let i=0;i<18;i++)k.ball(o,i%5?leaf:gold,(i%6-2.5)*.16,1.43+Math.floor(i/6)*.21,.469,.037);
   for(let i=0;i<7;i++)rect(o,cream,0,.35+i*.13,.423,1.02,.036,.042);
 }
 function holeTape(o:T.Group,w:number,h:number){rect(o,cream,0,0,0,w,h,.077);
   for(let j=0;j<5;j++)for(let i=0;i<17;i++)if((i*3+j*7)%5>1)disc(o,dark,(i-8)*w*.054,(j-2)*h*.181,.047,h*.046,.028);}
 function strip(o:T.Group,i:number){rect(o,i%2?cream:'#d2b792',0,0,0,1.27,.80,.073);
   for(let j=0;j<8;j++)rect(o,j%3?sea:red,-.48+j*.14,.18-.1*(j%4),.053,.066,.16,.028);}
 function railModel(o:T.Group){
   k.ball(o,cream,.07,.55,0,2.31,.45,.59);k.ball(o,dark,1.20,.67,.10,.79,.25,.47);rect(o,red,-.22,.43,.53,3.42,.092,.068);
   for(let i=0;i<7;i++)rect(o,sea,-1.66+i*.34,.66,.542,.23,.23,.062);
   for(const x of [-1.23,1.12])for(const z of [-.36,.36])disc(o,dark,x,.20,z,.17,.12);
 }
 function star(o:T.Group,x:number,y:number,z:number,n:number){k.ball(o,n%2?gold:cream,x,y,z,.096+n%3*.016,.096,.069,'glow');}
 function starBody(o:T.Group,col:string){
   k.rock(o,col,0,0,0,.49,.49,.49);
   for(const s of [-1,1]){bar(o,gold,[s*.31,0,0],[s*1.28,0,0],.044);rect(o,sea,s*.99,0,0,.83,.55,.08);
     for(let j=0;j<3;j++)rect(o,cream,s*.99+(j-1)*.21,0,.054,.018,.53,.015);}
 }
 function perimeter(col:string){for(const s of [-1,1])for(let j=0;j<5;j++){const x=s*5.62,z=4.43-j*3.67;
   rect(r,col,x,-.39,z,.21,2.99,.24);if(j<4)bar(r,col,[x,1.08,z],[x,1.08,z-3.67],.055);}}
 for(const [x,z] of [[-1.65,5.91],[1.65,5.91],[-3.82,0],[3.82,0],[-1.71,-5.92],[1.71,-5.92]])rect(r,d==='1224'?sea:wood,x,-1.10,z,.34,1.85,.42);
 rect(r,c.spec.stone,0,-1.03,-10.90,12.25,1.76,6.84);
 if(d==='1222'){
   for(const s of [-1,1])for(let j=0;j<5;j++){const o=obj(s*5.24,-.04,3.54-j*3.16,-s*.72,1.24);cabinet(o);rect(o,dark,0,-.90,0,1.59,1.76,.94);}
   const near=obj(-3.80,.03,3.72,.28);shelf(near,1.73,1.05,1.12);const roller=k.group(near,0,1.80,0);
   for(const s of [-1,1]){disc(roller,wood,s*.55,.28,0,.41,.18);disc(roller,gold,s*.55,.28,.13,.24,.08);}holeTape(roller,1.44,.39);
   backing(0,-11.50,5.45,2.95);const paper=moving(0,1.32,-10.79);holeTape(paper,4.69,1.30);
   for(const s of [-1,1]){disc(r,wood,s*2.43,1.35,-10.58,.74,.52);disc(r,gold,s*2.43,1.35,-10.27,.39,.12);}
   anim.push((_,f)=>{paper.scale.x=.47+.12*c.done.size+.23*Math.min(1,f);paper.position.y=1.35+.19*c.signal*(f?0:1);});
 }else if(d==='1223'){
   const canal=obj(0,-1.23,0);for(let j=0;j<12;j++)for(const s of [-1,1])house(canal,s*(6.1+j%3*.83),5.9-j*2.83,.87+j%2*.18);
   const frame=(o:T.Group,w:number,h:number)=>{for(const s of [-1,1]){rect(o,wood,s*w/2,h/2,0,.22,h+.28,.33);rect(o,wood,0,h*(s+1)/2,0,w+.2,.22,.31);}rect(o,sea,0,.29,.02,w-.19,.13,.15);};
   const close=obj(-3.73,.24,4.26,.42);frame(close,2.45,1.63);rect(close,dark,0,-.84,0,2.78,1.72,.41);
   frame(obj(0,.09,-9.62),6.51,3.34);
   const scroll=moving(0,.02,-11.24);for(let j=0;j<6;j++)house(scroll,-5.4+j*1.91,j%2*.22,.92+j%2*.25);
   const arch=obj(5.70,-.91,1.25,.94,1.4);k.ring(arch,cream,0,0,0,1.31);rect(arch,wood,0,1.46,0,3.35,.16,1.15);
   anim.push((_,f)=>{scroll.position.x=-.7+c.steps*.28+Math.min(1,f/1.70)*1.64;});
 }else if(d==='1224'){
   for(let j=0;j<45;j++){const x=(j%2?1:-1)*(6.18+j*7%18),z=7-j*13%39;k.rock(r,j%4?snow:'#9db8c6',x,-1.73,z,1.70+j%4,.46+j%5*.40,2.37+j%3);}
   const hut=(o:T.Group,w:number)=>{rect(o,'#a65747',0,1.02,0,w,1.90,1.77);k.put('box',o,'toon',snow,0,2.10,0,w+.39,.24,2.19,0,0,-.04);
     for(let i=0;i<5;i++){const x=(i-2)*w*.17;rect(o,cream,x,1.18,.919,w*.14,.81,.077);rect(o,dark,x,1.18,.976,w*.109,.62,.030);}
     for(const s of [-1,1])bar(o,dark,[s*w*.41,-1.87,0],[s*w*.41,.14,0],.11);};
   hut(obj(-4.71,.12,3.08,.49,.82),3.22);hut(obj(0,.25,-10.87),6.81);
   for(let i=0;i<5;i++){const slot=moving((i-2)*6.81*.17,1.43,-9.87);rect(slot,gold,0,0,0,.72,.62,.032);anim.push((_,f)=>slot.scale.y=.09+.21*Math.min(i%2?c.fill:1,c.done.size*.35)+.67*Math.min(1,f*(.73+i*.06)));}
   const vane=obj(4.62,0,2.54);bar(vane,wood,[0,-1.87,0],[0,2.3,0],.095);k.put('cone',vane,'toon',red,.42,2.13,0,.22,.91,.22,0,0,Math.PI/2);
 }else if(d==='1225'){
   perimeter(sea);const weather=(o:T.Group,i:number)=>{if(i===0){disc(o,gold,0,0,0,.35,.09);for(let j=0;j<8;j++){const a=j*Math.PI/4;bar(o,gold,[.44*Math.cos(a),.44*Math.sin(a),0],[.60*Math.cos(a),.60*Math.sin(a),0],.032);}}
    else if(i===1||i===3){for(let j=0;j<3;j++)k.ball(o,cream,(j-1)*.26,-.08+j%2*.18,0,.31,.24,.12);
      if(i===3)for(let j=0;j<3;j++)bar(o,sea,[(j-1)*.28,-.31,0],[(j-1)*.28-.08,-.54,0],.035);}
    else{for(let j=0;j<3;j++)contour(o,sea,[[-.49,.19*j-.23,0],[.21,.19*j-.23,0],[.39,.19*j-.12,0],[.23,.19*j+.01,0]],.044);}};
   for(let i=0;i<4;i++){const g=obj(i%2?4.70:-4.78,.03,3.19-Math.floor(i/2)*5.66,i%2?-.25:.26);
     shelf(g,1.53,.78,.98);rect(g,wood,0,1.54,0,1.37,1.53,.14);const tile=k.group(g,0,1.56,.13);weather(tile,i);}
   k.cyl(r,wood,0,.34,-10.59,2.57,.64);const carousel=moving(0,.70,-10.59);
   for(let j=0;j<4;j++){const a=j*Math.PI/2,g=k.group(carousel,1.2*Math.sin(a),0,1.2*Math.cos(a),0,a);rect(g,'#648587',0,1.16,0,2.16,2.29,.15);
     const card=k.group(g,0,1.17,.12,0,0,0,1.31);weather(card,j);}
   k.cone(carousel,red,0,2.63,0,2.05,.66);anim.push((_,f)=>carousel.rotation.y=c.steps*.12+Math.min(1,f/1.65)*1.65);
 }else if(d==='1226'){
   for(let j=0;j<7;j++)house(r,(j%2?1:-1)*(6.84+j%3*.42),4.8-j*2.94,1.16,j%2?cream:'#c4aa86');
   const counter=obj(-4.03,.01,3.86,.28);shelf(counter,2.57,.96,1.14);for(const s of [-1,1])rect(counter,wood,s*.98,1.90,-.35,.12,1.93,.13);rect(counter,leaf,0,2.90,-.19,2.48,.18,.95);
   for(let j=0;j<3;j++){const q=k.group(counter,(j-1)*.55,1.21,0,0,0,.10*j,.40);strip(q,j);}
   const press=obj(0,.07,-10.86);shelf(press,6.62,.69,2.02);
   for(let j=0;j<3;j++){const o=moving((j-1)*1.67,.86,-10.32);const ticket=k.group(o,0,.80,0,0,0,0,1.35);strip(ticket,j);
     for(let n=0;n<3;n++)k.ring(ticket,red,(n-1)*.36,-.26,.08,.081);
     anim.push((_,f)=>{o.rotation.x=-1.13+Math.min(1,f/1.45)*1.03;o.position.y=.86+.06*c.done.size;});}
 }else if(d==='1227'){
   const table=obj(-3.60,.05,3.71,.42);shelf(table,2.71,.92,1.42);for(let j=0;j<5;j++){rect(table,cream,-.42+j*.09,1.07+j*.061,0,1.64,.048,.89);}
   k.put('round',table,'toon',wood,.84,1.31,-.14,.15,.72,.15,0,0,-.70);perimeter(wood);
   for(const s of [-1,1])for(let j=0;j<4;j++){const o=obj(s*6.60,.16,3.7-j*4.18);rect(o,wood,0,.99,0,1.64,2.15,.28);rect(o,cream,0,1.04,.155,1.40,1.87,.045);
    for(let n=0;n<6;n++)rect(o,dark,0,.47+n*.17,.190,.80+(n%3)*.11,.024,.018);}
   backing(0,-11.22,6.21,3.68);const map=moving(0,0,-10.96);for(let j=0;j<11;j++){const x=(j-5)*.47,y=1.76+.78*Math.cos(j*.96);
     star(map,x,y,0,j);if(j)bar(map,gold,[x-.47,1.76+.78*Math.cos((j-1)*.96),0],[x,y,0],.030);}
   anim.push((_,f)=>{map.scale.y=.52+.10*c.steps+.21*Math.min(1,f);map.position.z=-10.96+Math.min(1,f/1.35)*.52;});
 }else if(d==='1228'){
   for(const s of [-1,1])for(let j=0;j<31;j++){const z=6.46-j*.67,x=s*(5.50+.91*Math.sin(j*.25));
     rect(r,sea,x,-.12,z,.63,3.53,.64);for(let y=0;y<3;y++)rect(r,y%2?snow:'#a8bbc9',x+s*y*.64,.94+y*.38,z,.63,.30,.64);}
   for(let n=0;n<7;n++){const bow=moving(0,.05,-9.82-n*.48);const points:Vec[]=[];
     for(let j=0;j<=20;j++){const a=Math.PI*j/20;points.push([4.92*Math.cos(a),.19+(2.50+n*.14)*Math.sin(a),0]);}
     contour(bow,n%2?sea:'#daa08b',points,.069);const bulbs=moving(0,.05,-9.82-n*.48);for(let j=0;j<=20;j+=2)k.ball(bulbs,gold,...points[j],.11,.10,.11,'glow');
     anim.push((_,f)=>bulbs.visible=c.done.size>=2&&n<2||f>.12+n*.16);}
   const near=obj(-3.66,0,3.72,.54);bar(near,dark,[0,-1.84,0],[0,1.71,0],.11);k.ring(near,red,0,1.67,0,.51);for(let j=0;j<5;j++)k.ball(near,gold,(j-2)*.17,1.58+.04*(j-2)**2,.10,.063);
 }else if(d==='1229'){
   for(const s of [-1,1]){for(let j=0;j<25;j++){const z=5.64-j*.70;rect(r,dark,s*5.42,-.14,z,.49,.27,.65);rect(r,j%5?cream:red,s*5.40,.11,z,.61,.14,j%5?.15:.42);}
     for(let j=0;j<4;j++){const g=obj(s*5.91,.23,4.21-j*4.71);rect(g,sea,0,.88,0,.53,2.62,.46);rect(g,cream,0,2.21,0,.74,.15,.64);}}
   const pl=obj(-4.10,.05,3.80,.50,.84);shelf(pl,4.33,.57,1.52);const exhibit=k.group(pl,0,.69,0);railModel(exhibit);
   for(const z of [-10.17,-11.23])rect(r,dark,0,.19,z,9.42,.16,.13);
   for(let j=0;j<21;j++)rect(r,wood,(j-10)*.44,.043,-10.70,.155,.088,1.82);
   const train=moving(-1.02,.32,-10.69);train.scale.setScalar(1.25);railModel(train);
   for(const s of [-1,1]){const bar=moving(s*4.18,.11,-.90);rect(bar,gold,0,0,0,.40,.115,.39);anim.push(()=>bar.position.z=-2.20+c.signal*2.78);}
   anim.push((_,f)=>train.position.x=-1.35+Math.min(1,f/1.69)*2.82);
 }else if(d==='1230'){
   for(let j=0;j<106;j++)star(r,(j*61%77)-38,1+j*7%16,-15-j*3%21,j);
   const near=obj(-3.73,.00,3.69,.45);shelf(near,2.01,1.0,1.09);bar(near,wood,[0,1.11,0],[0,1.93,0]);starBody(k.group(near,0,1.96,0,0,0,.19),gold);
   for(const s of [-1,1]){const p=obj(s*5.57,.32,.46);k.cyl(p,sea,0,-.66,0,.89,2.41);k.ring(p,gold,0,.93,0,.82);starBody(k.group(p,0,1.05,0,0,0,s*.28,.48),s<0?sea:gold);}
   backing(0,-11.66,5.51,3.35);
   for(const s of [-1,1]){const plate=moving(s*1.19,1.71,-11.08+s*.12);k.ring(plate,s<0?sea:gold,0,0,0,1.12);
     for(let j=0;j<7;j++)star(plate,.78*Math.cos(j),.67*Math.sin(j),0,j);
     anim.push((_,f)=>{plate.position.x=s*(1.25-.94*Math.min(1,f/1.43));plate.rotation.z=s*.17*(1-Math.min(1,f));});}
 }else{
   for(const s of [-1,1])for(let j=0;j<4;j++){house(r,s*(6.39+j%2*.51),4.28-j*4.61,1.07,j%2?'#c8a483':cream);
     const n=obj(s*4.91,-.03,2.81-j*3.85);bar(n,wood,[0,-1.88,0],[0,1.84,0]);k.ball(n,red,0,1.48,0,.24,.26,.24);}
   const near=obj(-3.78,0,3.55,.45);shelf(near,2.19,.85,1.24);for(const s of [-1,1]){k.cyl(near,s<0?red:leaf,s*.54,1.06,0,.36,.18);k.taper(near,wood,s*.54,1.36,0,.18,.41);}
   const atlas=obj(0,.12,-11.17);shelf(atlas,6.28,.58,1.95);
   for(let j=0;j<5;j++){const page=moving((j-2)*1.01,1.50,-10.90);rect(page,j%2?'#dec9a4':cream,0,0,0,.976,1.69,.12);k.ring(page,j%2?leaf:red,0,.10,.09,.34);
     for(let n=0;n<3;n++)bar(page,dark,[-.39,-.52+n*.12,.083],[.31,-.52+n*.12,.083],.018);
     anim.push((_,f)=>{const q=Math.min(1,f/1.57);page.position.x=(j-2)*(.48+.53*q);page.rotation.y=(j%2?1:-1)*(.83-.71*q);});}
 }
 return (t:number,f:number)=>anim.forEach(fn=>fn(t,f));
}
