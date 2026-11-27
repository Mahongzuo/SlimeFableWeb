import * as T from 'three';
import {Kit} from './folio-landmarks';
import type {NewyearReception} from '../templates/newyear-skirmish';
import type {Vec} from '../slime/types';
const brass='#cb9e68',ink='#334952',blue='#648d9e',ice='#b9d8d7',slate='#758c8d',brown='#956749',cream='#ebdfc1',gold='#edbd71',orange='#ba7658',red='#a25f49';
export const newyearGround:Record<string,string>={dustgrid:'#566675',inletpress:'#839d9c',roverpetal:'#ac8771',blinkmap:'#6c7583'};
export const newyearEyes:Record<string,Vec>={dustgrid:[3.69,3.18,10.35],inletpress:[-3.86,3.08,10.41],roverpetal:[3.62,3.22,10.4],blinkmap:[-3.58,3.23,10.58]};
export const newyearOutlines:Record<string,[number,number][]>={dustgrid:[[-2.34,7],[2.34,7],[2.34,3.8],[4.71,2.46],[4.71,-2.60],[2.25,-4.44],[2.25,-7],[-2.25,-7],[-2.25,-4.44],[-4.71,-2.60],[-4.71,2.46],[-2.34,3.8]],inletpress:[[-2.65,7],[2.42,7],[3.02,3.91],[4.87,2.61],[4.40,.27],[4.83,-2.48],[2.62,-3.98],[2.75,-7],[-2.56,-7],[-3.03,-4.01],[-4.98,-2.52],[-4.47,1.92],[-3.48,3.60]],roverpetal:[[-2.20,7],[2.35,7],[2.89,3.96],[4.83,2.06],[4.64,-2.63],[2.18,-4.71],[2.04,-7],[-2.43,-7],[-2.97,-3.77],[-4.78,-2.75],[-4.60,2.43],[-2.67,4.31]],blinkmap:[[-2.59,7],[2.59,7],[2.59,3.14],[4.71,3.14],[4.71,-3.13],[2.32,-3.13],[2.32,-7],[-2.32,-7],[-2.32,-3.13],[-4.71,-3.13],[-4.71,3.14],[-2.59,3.14]]};
const newCourts:[string,string,Vec,[number,number][]][]=[
 ['dunevisor','#af7a62',[3.62,2.92,10.09],[[-2.78,7],[2.25,7],[3.04,4],[4.86,2.6],[4.68,-2.85],[2.96,-4.37],[2.26,-7],[-2.61,-7],[-2.78,-3.85],[-4.72,-2.13],[-4.84,2.35],[-2.76,4.33]]],
 ['moonorrery','#4e697b',[-3.21,3.12,9.75],[[-2.61,7],[2.61,7],[3.83,4.31],[4.8,1.35],[4.84,-1.55],[3.92,-3.46],[2.10,-4.87],[2.08,-7],[-2.2,-7],[-2.24,-4.98],[-4.64,-2.28],[-4.88,1.21],[-3.61,4.07]]],
 ['spiralfilm','#635974',[3.3,3.22,9.90],[[-2.79,7],[2.29,7],[2.52,4.5],[4.83,2.08],[4.69,-2.27],[3.47,-3.98],[2.3,-4.53],[2.06,-7],[-2.04,-7],[-2.21,-4.08],[-4.52,-3.14],[-4.83,-1.90],[-4.72,2.63],[-2.68,4.3]]],
 ['roofmooring','#ac8c6b',[-3.02,3.48,10.48],[[-2.31,7],[2.72,7],[2.72,3.65],[4.71,3.65],[4.71,-2.97],[2.41,-2.97],[2.41,-7],[-2.68,-7],[-2.68,-3.52],[-4.68,-3.52],[-4.68,2.46],[-2.31,2.46]]],
 ['cooperdock','#9e8670',[3.12,3.05,10.9],[[-2.65,7],[2.68,7],[2.68,4.08],[4.73,3.42],[4.73,-1.88],[3.19,-3.81],[2.28,-3.81],[2.28,-7],[-2.51,-7],[-2.51,-4.64],[-4.66,-3.56],[-4.66,2.99],[-2.65,3.67]]]
];
for(const [kind,color,eye,edge] of newCourts){newyearGround[kind]=color;newyearEyes[kind]=eye;newyearOutlines[kind]=edge;}
export function paintNewyearDeck(g:CanvasRenderingContext2D,c:NewyearReception){
 const day=c.day;
 if(day>='0106'){
   if(day==='0106'){
     for(let i=0;i<24;i++){g.lineWidth=3+i%5;g.strokeStyle=i%2?'#79493388':'#f4bc8a99';g.beginPath();
       for(let j=0;j<47;j++){const x=j*15,y=34*i+27*Math.sin(j*.16+i*.26)+12*Math.cos(j*.29);j?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}
   } else if(day==='0109'||day==='0110'){
     g.strokeStyle=day==='0109'?'#69504c77':'#6d513b88';g.lineWidth=2;
     for(let j=0;j<35;j++){const y=j*25;g.beginPath();g.moveTo(0,y);g.lineTo(640,y);g.stroke();
       for(let x=(j%2)*14;x<640;x+=28){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+25);g.stroke();}}
   } else{
     g.strokeStyle='#b6bdc855';g.lineWidth=1.75;
     for(let j=0;j<9;j++){g.beginPath();g.ellipse(320,434,43+j*32,45+j*40,day==='0108'?j*.15:0,0,2*Math.PI);g.stroke();}
     g.fillStyle='#edd59d88';for(let j=0;j<143;j++)g.fillRect(21+j*179%618,7+j*101%819,2,2);
   }
   return;
 }
 g.strokeStyle='#584e4d66';g.lineWidth=2;
 for(let i=0;i<26;i++){g.beginPath();g.moveTo(0,i*34);g.lineTo(640,i*34+(day==='0104'?9:0));g.stroke();}
 if(day==='0102'){g.fillStyle='#c8d7cc88';for(let j=0;j<240;j++)g.fillRect(24+j*109%589,12+j*167%814,2+j%3,2);}
 else if(day==='0103'){g.fillStyle='#709798';g.beginPath();g.moveTo(0,0);for(let j=0;j<=85;j++)g.lineTo(144+32*Math.sin(j*.38)+14*Math.cos(j*1.43),j*10);g.lineTo(0,840);g.fill();}
 else if(day==='0104'){for(let j=0;j<40;j++){g.beginPath();g.strokeStyle='#dfbf9d77';g.ellipse(17+j*103%620,17+j*187%804,6+j%11,2+j%5,.17,0,2*Math.PI);g.stroke();}}
 else{for(let j=0;j<86;j++){const x=12+j*179%616,y=19+j*101%811;g.fillStyle='#d9ccb6';g.fillRect(x,y,2,2);if(j%5===0){g.beginPath();g.moveTo(x-4,y);g.lineTo(x+4,y);g.moveTo(x,y-4);g.lineTo(x,y+4);g.stroke();}}}
}
export function newyearPad(k:Kit,o:T.Group,c:NewyearReception,i:number){
 k.box(o,ink,0,.092,0,.58,.18,.41);
 if(c.day==='0102'){for(let j=0;j<3;j++)k.box(o,j===i?gold:ice,(j-1)*.16,.30,-.01,.12,.29,.08);}
 else if(c.day==='0103'){k.cyl(o,brown,0,.24,0,.24,.10);k.rock(o,blue,0,.32,0,.15,.062,.12);}
 else if(c.day==='0104'){k.taper(o,cream,0,.28,0,.22,.26);k.ball(o,orange,0,.42,0,.15,.09,.12);}
 else if(c.day>='0106'){
   if(c.day==='0109'){k.taper(o,brown,0,.30,0,.17,.32);k.ring(o,gold,0,.52,0,.15);}
   else if(c.day==='0110'){k.cyl(o,brown,0,.31,0,.23,.36);for(const y of [.21,.39])k.cyl(o,ink,0,y,0,.243,.059);}
   else{k.cyl(o,i%2?ink:slate,0,.22,0,.25,.13);k.ball(o,i===2?ice:gold,0,.35,0,.16,.075,.12);}
 }
 else{k.box(o,blue,0,.32,-.06,.51,.32,.09);k.ball(o,cream,(i%2-.5)*.12,.33,.011,.056);}
}
export function buildNewyearVenue(k:Kit,root:T.Group,c:NewyearReception){
 const effects:((t:number,f:number)=>void)[]=[];
 const obj=(x=0,y=0,z=0,ry=0,s=1,p=root)=>k.group(p,x,y,z,0,ry,0,s);
 const mover=(x:number,y:number,z:number,p=root)=>{const o=obj(x,y,z,0,1,p);o.userData.hinged=true;return o;};
 const box=(o:T.Group,col:string,x:number,y:number,z:number,w:number,h:number,l:number)=>k.box(o,col,x,y,z,w,h,l);
 const rod=(o:T.Group,col:string,a:Vec,b:Vec,w=.052)=>k.beam(o,col,a,b,w);
 const q=(f:number)=>Math.min(1,f/1.59);
 function plinth(o:T.Group,w:number,h:number,l:number,col:string){box(o,col,0,(h-1.88)/2,0,w,h+1.88,l);box(o,cream,0,h+.08,0,w+.13,.15,l+.13);}
 function hoop(o:T.Group,x:number,y:number,z:number,w:number,h:number){for(const s of [-1,1]){
   box(o,ink,x+s*w/2,y,z,.14,h-.12,.18);box(o,ink,x,y+s*h/2,z,w+.14,.12,.18);}}
 for(const [x,z] of [[-1.7,6],[1.7,6],[-3.81,.42],[3.81,.42],[-1.77,-5.95],[1.77,-5.95]])box(root,slate,x,-1.14,z,.40,1.89,.45);
 box(root,c.spec.stone,0,-.98,-10.72,12.49,1.96,6.55);
 if(c.day==='0102'){
   function cells(o:T.Group,w:number,h:number){hoop(o,0,0,0,w,h);
    for(let j=1;j<9;j++)box(o,ice,(j/9-.5)*w,0,0,.028,h,.045);
    for(let j=1;j<6;j++)box(o,ice,0,(j/6-.5)*h,.015,w,.024,.049);}
   const close=obj(-3.72,0,3.98,.42,.90);plinth(close,2.14,.32,1.28,slate);
   const panel=k.group(close,0,1.36,0,-.28);cells(panel,2.28,1.57);
   for(let i=0;i<10;i++){const x=(i%5-2)*.34,y=(Math.floor(i/5)-.5)*.58;k.ball(panel,gold,x,y,.055,.047,.045,.039);}
   for(let j=0;j<42;j++){const s=j%2?1:-1;k.rock(root,j%4?slate:'#a7a79b',s*(6.73+j*2%16),-1.19+j%6*.23,5-j*7%32,.43+j%4*.19,.39+j%3*.23,.53);}
   k.rock(root,'#9c9a8e',-6.45,2.37,-15.26,2.46,1.62,1.67);
   for(let j=0;j<11;j++)rod(root,'#a5bbba',[-6.29+j%3*.46,2.25+j%5*.42,-15.58],[-13.2-j%5,3.75+j%4*.61,-18.9-j%3],.024+j%3*.013);
   for(const s of [-1,1]){const p=obj(s*4.56,.21,-.8);k.cyl(p,slate,0,-.75,0,.56,1.96);cells(k.group(p,0,.61,0),1.04,.90);}
   const base=obj(0,0,-10.75);plinth(base,4.71,.44,1.77,ink);const grid=mover(0,1.71,-10.75);cells(grid,4.32,2.29);
   for(let j=0;j<24;j++){const p=mover(-1.87+(j%12)*.335,1.57+Math.floor(j/12)*.47+.17*Math.sin(j),-10.69);k.ball(p,gold,0,0,0,.065,.057,.052,'glow');
    effects.push((t,f)=>{p.position.z=-10.69+(1-q(f))*(j%4)*.13;p.visible=c.done.size>j%3||f>0;});}
   effects.push((_,f)=>{grid.rotation.x=-.34*(1-q(f));});
 }else if(c.day==='0103'){
   const isles:Vec[]=[[-1.54,.23,.32],[-.99,.24,.53],[-.52,.16,.05],[-.06,.36,.20],[.44,.30,-.02],[.93,.23,.18],[1.36,.15,.54]];
   function coast(o:T.Group,wet:boolean){for(let j=0;j<isles.length;j++){const [x,y,z]=isles[j];k.rock(o,wet?'#72978d':'#a88a66',x,.20,z,y+.14,.11+y*.30,.17+y);}
     for(let i=0;i<4;i++)k.rock(o,wet?blue:cream,1.51+i*.15,.21,.53+i*.09,.081,.051,.076);}
   const close=obj(-3.79,0,3.72,.48,.78);plinth(close,4.08,.72,2.04,brown);const near=obj(0,.83,0,0,1,close);coast(near,false);
   for(let j=0;j<30;j++){const s=j%2?1:-1,x=s*(6.22+j*7%15),z=8-j*13%33;k.rock(root,'#829882',x,-1.58,z,2.15+j%3,.66+j%4*.19,1.52+j%3);k.rock(root,cream,x-.43,-1.52,z+.23,1.02,.51,1.11);}
   for(const s of [-1,1]){const pad=obj(s*5.13,0,-.94);plinth(pad,1.27,.81,1.12,brown);k.cyl(pad,ink,0,.98,0,.44,.13);}
   const end=obj(0,0,-10.68);plinth(end,5.85,.63,2.63,brown);const sheet=mover(0,1.19,-10.54);box(sheet,cream,0,0,0,5.34,.16,2.08);const print=obj(0,.07,0,0,1.25,sheet);coast(print,true);
   const roller=mover(-2.4,1.42,-10.55);k.put('round',roller,'toon',brown,0,0,0,.29,2.50,.29,Math.PI/2);for(const s of [-1,1])k.ball(roller,ink,0,0,s*1.28,.12,.12,.18);
   effects.push((_,f)=>{roller.position.x=-2.47+q(f)*4.90;sheet.rotation.x=.12+.46*q(f);});
 }else if(c.day==='0104'){
   for(let j=0;j<45;j++){const s=j%2?1:-1;k.rock(root,j%3?orange:'#ad846d',s*(6.01+j*5%15),-1.63,7-j*7%32,1.06+j%4*.71,.44+j%5*.31,1.21+j%3*.62);}
   function car(o:T.Group){box(o,cream,0,.47,0,1.27,.30,.79);box(o,blue,0,.69,0,1.61,.085,1.38);
    k.cyl(o,ink,.30,.96,-.04,.067,.49);box(o,ice,.30,1.24,-.05,.36,.17,.21);for(const s of [-1,1])for(let j=0;j<3;j++){const x=(j-1)*.48;
     k.put('round',o,'toon',ink,x,.24,s*.50,.22,.17,.22,Math.PI/2);rod(o,brown,[0,.46,s*.39],[x,.24,s*.50],.04);}
    for(let i=0;i<7;i++)box(o,cream,(i-3)*.19,.744,0,.019,.016,1.34);}
   const near=obj(-3.64,.10,3.46,.5);plinth(near,2.41,.37,1.91,slate);car(obj(0,.47,0,0,.91,near));
   for(const s of [-1,1]){const p=obj(s*5.02,.18,-.61);k.rock(p,orange,0,-.73,0,.81,1.29,1.15);for(let j=0;j<3;j++)k.ball(p,cream,0,.15+j*.23,0,.46-j*.073,.24,.36);}
   const stand=obj(0,0,-11.03);plinth(stand,4.45,.64,2.12,slate);
   for(const s of [-1,1]){const petal=mover(s*1.53,1.08,-11.06);for(let j=0;j<6;j++)k.ball(petal,j%2?cream:'#d2c6a7',s*(.19+j%2*.36),j%3*.27,(j%3-1)*.42,.43,.42,.40);
    effects.push((_,f)=>{petal.rotation.z=-s*(.16+c.done.size*.10+q(f)*.51);});}
   const ramp=mover(0,.77,-9.98);box(ramp,brown,0,-.06,1.10,1.93,.16,2.20);for(let j=0;j<9;j++)box(ramp,brass,0,.039,.13+j*.24,1.75,.038,.058);
   const rover=mover(0,.80,-11.13);car(rover);effects.push((_,f)=>{const a=q(f);ramp.rotation.x=-.95+1.31*Math.min(1,a*2.35);rover.position.z=-11.13+Math.max(0,(a-.43)/.57)*2.72;rover.position.y=.80-Math.max(0,(a-.60)/.40)*.46;});
 }else if(c.day==='0106'){
   function dune(o:T.Group,col:string,x:number,y:number,z:number,s:number){
     for(let n=0;n<12;n++){const u=n/11;k.rock(o,n%3?col:cream,x-1.65+u*3.3,y+Math.sin(u*Math.PI)*.46,z+Math.sin(u*4.4)*.25,s*(.30+.13*Math.sin(u*Math.PI)),s*.26,s*.65);}
   }
   for(const sg of [-1,1])for(let j=0;j<11;j++){const x=sg*(5.2+j%4*2.1),z=5-j*2.35;k.rock(root,j%3?orange:red,x,-.35,z,1.92+j%3,.45+j%4*.15,1.32);}
   const near=obj(-3.83,.11,3.60,.51,.79);plinth(near,2.81,.38,1.12,brown);dune(near,orange,0,.62,0,.92);
   for(const sg of [-1,1]){const a=obj(sg*4.9,.19,-1.20,-sg*.58);plinth(a,1.60,.37,1.55,ink);
     dune(a,sg<0?orange:slate,0,.52,0,.57);rod(a,brass,[-.60,.68,.28],[.52,1.28,-.32],.058);k.ring(a,gold,.53,1.29,-.30,.20);}
   const end=obj(0,.07,-10.53);plinth(end,5.1,.58,2.68,brown);
   for(let j=0;j<5;j++)dune(end,j%2?red:orange,0,.83,(j-2)*.38,1);
   const ruler=mover(0,2.05,-9.94);ruler.name='sand-gauge';box(ruler,ink,0,0,0,4.96,.17,.18);
   for(let j=0;j<23;j++)box(ruler,j%5?cream:gold,(j-11)*.207,-.10,.025,.025,j%5?.113:.18,.076);
   for(const sg of [-1,1]){box(end,ink,sg*2.49,1.32,.54,.155,1.45,.165);rod(end,brass,[sg*2.32,.84,.87],[sg*1.2,.84,.97],.038);}
   const beam=mover(.08,1.57,-9.83);box(beam,gold,0,0,0,4.52,.028,.029);
   effects.push((t,f)=>{ruler.position.y=2.05-.56*q(f);beam.position.y=ruler.position.y-.117;beam.rotation.z=(c.signal-.5)*.10*(1-q(f));});
 }else if(c.day==='0107'){
   function scope(o:T.Group,w:number){
     for(const s of [-1,1])rod(o,brass,[0,1.06,0],[s*.53,.05,.38],.065);
     rod(o,brass,[0,1.06,0],[0,.04,-.52],.065);
     const a:Vec=[-.64*w,.99,.24],b:Vec=[.68*w,1.61,-.21];
     rod(o,brown,a,b,.16*w);rod(o,ice,[.57*w,1.56,-.16],b,.19*w);rod(o,ink,a,[-.45*w,1.07,.18],.21*w);
   }
   const near=obj(-3.79,.16,3.21,.34,1.13);plinth(near,2.36,.34,1.59,slate);scope(k.group(near,0,.47,0),1);
   for(const sg of [-1,1]){const a=obj(sg*4.95,.10,-.83,sg*.67);scope(a,sg<0?1.45:1.13);
     for(let j=0;j<6;j++)box(root,j%2?ink:slate,sg*(6.55+j*.52),.04,-3-j*1.52,.84,.57,4.23);}
   const end=obj(0,.02,-10.63);plinth(end,5.30,.46,2.23,ink);
   const sky=mover(0,1.09,-10.63);sky.name='orrery-fold';hoop(sky,0,1.02,0,5.11,2.23);
   for(let j=0;j<31;j++)k.ball(sky,j%3?cream:ice,(j*23%47-23)*.102,.10+(j*31%18)*.115,-.03,.026,.026,.018);
   k.ball(sky,orange,0,1.08,.14,.58,.55,.54);
   for(const y of [-.22,-.02,.21])k.ball(sky,y>0?gold:brown,.015,1.08+y,.18,.54*Math.sqrt(1-y*y/.3025),.047,.552);
   const moons=[-1.91,-1.23,.96,1.82].map((x,j)=>{const m=mover(x,1.09+(j%2-.5)*.18,.21,sky);k.ball(m,j%2?cream:ice,0,0,0,.085+j*.012);return m;});
   const track=k.group(sky,0,1.07,.075);for(let j=0;j<16;j++)box(track,brass,(j-7.5)*.295,0,0,.173,.014,.023);
   effects.push((t,f)=>{sky.rotation.x=.95*(1-q(f));moons.forEach((m,j)=>{m.position.y=1.09+.24*Math.sin(t*.55+j*1.70)*(1-q(f));m.visible=c.done.size>=Math.min(4,j+1)||f>0;});});
 }else if(c.day==='0108'){
   function wheel(o:T.Group,r:number,n:number){
     k.ring(o,brass,0,0,0,r,.055);k.ball(o,gold,0,0,0,.19*r,.19*r,.092);
     for(const s of [-1,1]){
       let a:Vec=[0,0,.029];for(let i=0;i<34;i++){const t=i/33,rr=r*.93*t,u=s*Math.PI*.5+t*5.33;
         const p:Vec=[rr*Math.cos(u),rr*Math.sin(u),.029];rod(o,i%7===0?ice:'#a299bd',a,p,.021*(1.15-t*.3));if((i+n)%3===0)k.ball(o,gold,...p,.032);a=p;}
     }
   }
   const near=obj(-3.67,.11,3.67,.35);plinth(near,2.73,.46,1.12,slate);wheel(k.group(near,0,1.30,0),.76,0);
   for(const s of [-1,1]){const o=obj(s*4.92,.10,-1.14,-s*.58);plinth(o,1.37,.63,1.40,ink);wheel(k.group(o,0,1.28,0),.61,s+1);}
   for(let j=0;j<79;j++)k.ball(root,j%4?cream:ice,j*91%75-37,1.15+j*7%19,-18-j%16,.038+j%5*.016);
   const end=obj(0,.11,-10.65);plinth(end,4.60,.46,2.04,ink);
   const disc=mover(0,1.97,-10.58);disc.name='spiral-plate';k.put('round',disc,'toon',ink,0,0,-.135,1.58,.15,1.58,Math.PI/2);
   wheel(disc,1.53,1);
   const overlay=mover(0,1.97,-10.37);for(let j=0;j<9;j++){const t=.4+j*.27,r=.24+j*.147;k.ball(overlay,cream,r*Math.cos(t),r*Math.sin(t),0,.052);}
   effects.push((t,f)=>{disc.rotation.x=1.15*(1-q(f));disc.rotation.z=.8*(c.signal-.5)*(1-q(f));overlay.visible=f>.48;overlay.scale.setScalar(.18+.82*q(f));});
 }else if(c.day==='0109'){
   function balloon(o:T.Group,scale:number){
     k.ball(o,cream,0,1.90*scale,0,.95*scale,1.18*scale,.94*scale);
     for(let i=0;i<8;i++){const a=i*Math.PI/4;let last:Vec=[0,3.06*scale,0];
       for(let j=1;j<=8;j++){const t=j*Math.PI/8,rr=.96*scale*Math.sin(t),pt:Vec=[rr*Math.cos(a),(1.9+1.18*Math.cos(t))*scale,rr*Math.sin(a)];rod(o,i%2?orange:brass,last,pt,.021*scale);last=pt;}}
     box(o,brown,0,.18*scale,0,.48*scale,.35*scale,.46*scale);
     for(const x of [-1,1])for(const z of [-1,1])rod(o,ink,[x*.23*scale,.34*scale,z*.22*scale],[x*.32*scale,.89*scale,z*.31*scale],.025);
   }
   function attic(o:T.Group,col:string,w:number,h:number){
     box(o,col,0,h*.50,0,w,h,1.48);const roof=k.group(o,0,h,0);
     for(const s of [-1,1])k.put('box',roof,'toon',ink,0,.24,s*.47,w+.26,.12,1.06,s*.47);
     for(let j=0;j<3;j++){const x=(j-1)*w*.28;box(o,cream,x,h*.67,.748,.31,.49,.044);box(o,slate,x,h*.69,.779,.19,.35,.018);box(o,ink,x,h*.392,.776,.37,.067,.03);}
     box(o,brown,-w*.24,h+.46,-.08,.23,.64,.24);
   }
   for(const s of [-1,1])for(let j=0;j<8;j++){const x=s*(5.16+j%2*.53),z=5.91-j*2.37;attic(obj(x,-1.27,z,s*.1),j%3?orange:brown,1.87,2.17+j%5*.22);}
   const near=obj(-3.55,.15,3.55,-.27);balloon(near,.53);for(let j=0;j<3;j++)k.ball(near,brown,.47+j*.18,.08,-.29,.135,.12,.19);
   for(const z of [1.38,-2.43])for(const s of [-1,1]){box(root,brown,-1.11+s*.85,.38,z,.11,.79,.15);rod(root,cream,[-1.91,.69,z],[-.32,.69,z],.041);}
   const end=obj(0,.06,-10.57);plinth(end,4.15,.45,2.05,ink);
   const air=mover(.12,.59,-10.56);air.name='roof-balloon';balloon(air,.91);
   const tail=mover(.04,.52,-10.29);rod(tail,brown,[0,0,0],[-.51,-.36,.28],.026);rod(tail,brown,[-.51,-.36,.28],[-.72,-.49,.63],.023);
   effects.push((t,f)=>{const a=q(f);air.position.set(.12+a*.68,.59+a*1.80,-10.56-a*.90);air.rotation.z=.07*Math.sin(t)*(.24+.76*a);tail.position.copy(air.position);tail.position.z+=.27;});
 }else if(c.day==='0110'){
   function barrel(o:T.Group,x:number,y:number,z:number,size=1){
     k.taper(o,brown,x,y-.15*size,z,.29*size,.35*size);k.cyl(o,brown,x,y+.02*size,z,.34*size,.28*size);
     k.cyl(o,brass,x,y+.178*size,z,.295*size,.034*size);for(const n of [-1,1])k.cyl(o,ink,x,y+n*.09*size,z,.348*size,.052*size);
   }
   for(const s of [-1,1])for(let i=0;i<7;i++){
     const z=5.14-i*2.12,x=s*5.05;
     box(root,ink,x,.41,z,.23,2.07,.21);if(i<6)box(root,brown,x,1.57,z-1.06,.34,.22,2.12);
     for(let j=0;j<5;j++)barrel(root,x+s*(.59+j%2*.59),-.32+Math.floor(j/2)*.40,z+.32,.84);
   }
   const near=obj(-3.53,.02,3.30,.30);plinth(near,2.13,.40,1.35,slate);barrel(near,-.43,.72,0,1.19);barrel(near,.45,.72,0,.85);
   for(const z of [-2.63,.99])for(const s of [-1,1])rod(root,brass,[s*.74,.09,z-.42],[s*.51,.09,z+.42],.045);
   const end=obj(0,.04,-10.48);plinth(end,4.73,.31,2.41,slate);
   for(const s of [-1,1]){box(end,ink,s*1.52,1.48,0,.22,2.37,.33);rod(end,brass,[s*.65,.46,.97],[s*.65,.46,-1.01],.053);}
   box(end,brown,0,2.62,0,3.38,.32,.52);
   const door=mover(0,1.47,-10.40);door.name='cooper-door';for(let j=0;j<9;j++)box(door,j%3?brown:'#a77550',(j-4)*.30,0,0,.294,1.89,.19);
   for(const y of [-.60,.61])box(door,ink,0,y,.13,2.70,.12,.10);
   const goods=[-1,0,1].map((x,i)=>{const o=mover(x*.53,.67,-11.06-i*.63);barrel(o,0,0,0,.9);o.rotation.x=Math.PI/2;return o;});
   effects.push((_,f)=>{const a=q(f);door.position.y=1.47+a*1.74;goods.forEach((o,i)=>{const v=Math.max(0,a-.28-i*.115);o.position.z=-11.06-i*.63+4.8*v;o.rotation.x=Math.PI/2+15*v;});});
 }else{
   function chart(o:T.Group,n:number){box(o,ink,0,0,0,2.48,1.93,.15);
    for(let j=0;j<37;j++){const x=-1.08+j*41%107*.02,y=-.83+j*67%84*.02;k.ball(o,j%4?cream:blue,x,y,.099,.024+j%3*.013,.031,.018);}
    const point=k.group(o,-.45+n*.28,.17+n*.063,.12);k.ring(point,gold,0,0,0,.14);k.ball(point,cream,0,0,0,.053);}
   const near=obj(-3.69,.10,3.70,.44);plinth(near,2.49,.44,1.08,ink);chart(k.group(near,0,1.48,0),0);
   for(let j=0;j<90;j++){k.ball(root,j%2?cream:ice,j*73%71-35,2+j*17%13,-16-j%16,.068+j%3*.027);}
   for(const s of [-1,1]){const p=obj(s*5.02,.18,-.91,-s*.34);plinth(p,1.14,.56,1.32,ink);chart(k.group(p,0,1.28,0,0,0,0,.64),s+1);}
   const end=obj(0,0,-10.76);plinth(end,5.69,.52,1.75,slate);
   const plate=mover(0,2.01,-10.74);plate.scale.setScalar(1.48);chart(plate,0);const overlays=mover(.02,2.01,-10.48);
   for(let j=0;j<3;j++){const x=(j-1)*.64,y=.08+j*.18;k.ring(overlays,gold,x,y,0,.17);k.ball(overlays,cream,x,y,0,.085);
    if(j)rod(overlays,gold,[x-.64,y-.18,0],[x,y,0],.026);}
   effects.push((t,f)=>{overlays.position.x=f?0:(c.signal-.5)*.57;overlays.scale.x=.21+c.done.size*.13+.27*q(f);});
 }
 return (t:number,f:number)=>effects.forEach(fn=>fn(t,f));
}
