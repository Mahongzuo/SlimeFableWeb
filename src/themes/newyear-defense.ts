import type * as T from 'three';
import type {Kit} from './folio-landmarks';
import {sample,type Point,type JanuaryDefense} from '../templates/january-defense';
import {januaryPacketCount,januaryWeekDefense,type NewyearDay} from '../templates/newyear-defense';
import {brass,steel,slate,ivory,unit,dish,page} from './winter-boards';
import {bark,green,desk,folio,satellite,wheel} from './yearend-boards';
import {sectionMesh} from './december-defense';
import {lander} from './midwinter-boards';
import {canopyRoof,pavilion,water,gold,rust,ink} from './monthend-boards';
import {ferry,pier,dots,frame,azure,copper,frost,huddle} from './newyear-boards';
export const newyearPalette={
 '0102':['#6999a6','#d5cdb4','#89afa9','#a8bfaf','#aa906b','#e9c58b'],
 '0103':['#25334d','#8b9294','#93928b','#b3afa1','#998465','#dcc08e'],
 '0104':['#768e86','#d9c8a6','#a6987d','#cbb899','#8e765b','#d2b88a'],
 '0105':['#4c6b83','#b9c4c6','#93aeb7','#bbd3d2','#928978','#e6ca8b'],
 '0106':['#776e61','#e7c99e','#bd9d77','#d5bc91','#ad6654','#e5c194'],
 '0107':['#558596','#d8ceae','#89a6a5','#adbbb1','#c48b60','#ddbb85'],
 '0108':['#687969','#ddcab0','#b6a18b','#d3bfa7','#a27b54','#e9c693'],
 '0109':['#394e64','#a5b8bb','#7f929d','#a5afb2','#779b9f','#deaa62'],
 '0110':['#534e51','#a9a49b','#867f74','#9c9486','#98755b','#e2b679'],
} as const;
export function newyearGround(g:CanvasRenderingContext2D,day:NewyearDay,w:number,h:number){
 g.save();g.lineWidth=1.9;
 if(day==='0102'){for(let j=0;j<28;j++){g.strokeStyle=j%3?'#c3d7c685':'#e0dec0a1';g.beginPath();
   for(let i=0;i<=76;i++){const x=i*w/76,y=j*h/28+6*Math.sin(i*.32+j*.37)+3*Math.cos(i*.54-j);
   if(i)g.lineTo(x,y);else g.moveTo(x,y);}g.stroke();}}
 else if(day==='0103'){for(let i=0;i<34;i++){const x=(i*187+48)%w,y=(i*129+33)%h,rx=9+(i%6)*7;
   g.strokeStyle='#777b7777';g.beginPath();g.ellipse(x,y,rx,rx*.51,-.29,.17,5.91);g.stroke();g.strokeStyle='#d0c8ae80';g.beginPath();g.ellipse(x,y+3.0,rx*.96,rx*.49,-.29,.35,3.06);g.stroke();}}
 else if(day==='0104'){for(let i=0;i<18;i++){const y=i*h/18;g.fillStyle=i%2?'#8d755838':'#d0bb9638';g.fillRect(0,y,w,h/18-2);
   g.strokeStyle='#77674e65';g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();for(let j=0;j<4;j++){const x=(i*197+j*301)%w;g.fillRect(x,y+1,2,h/18-2);}}}
 else if(januaryWeekDefense(day)){
   const rail=day==='0106'||day==='0110',sea=day==='0107';
   for(let y=0;y<20;y++)for(let x=0;x<28;x++){
     const u=x*w/28,v=y*h/20;
     g.strokeStyle=sea?'#e0e8db55':rail?'#65554832':'#f4e8d142';
     g.beginPath();g.moveTo(u,v);g.lineTo(u+w/31,v+(sea?Math.sin(x+y)*6:0));
     if(!sea)g.lineTo(u+w/31,v+h/23);g.stroke();
   }
 }
 else{for(let j=0;j<13;j++)for(let i=-1;i<19;i++){const x=i*w/18+(j%2)*w/36,y=j*h/13;g.strokeStyle='#cce3e0a0';g.strokeRect(x+1,y+1,w/18-2,h/13-2);
   if((i+j)%4===0){g.strokeStyle='#dfebde94';g.beginPath();g.moveTo(x+7,y+15);g.lineTo(x+16,y+7);g.lineTo(x+21,y+9);g.stroke();}}}
 g.restore();
}
export function newyearBackdrop(k:Kit,g:T.Group,day:NewyearDay){
 if(januaryWeekDefense(day)){
   for(let j=0;j<13;j++){
     const x=(j-6)*4.18,h=2.1+(j*3%5)*.44,z=-16-(j%3)*1.9;
     if(day==='0107')k.rock(g,j%2?'#c8c5ad':'#d4d0b7',x,1.06,z,2.37,h,2.04,j);
     else if(day==='0110'){
       k.box(g,'#796857',x,h/2,z,3.98,h,2.3);k.box(g,'#473f3a',x,h+.10,z,4.05,.20,2.51);
       for(let i=0;i<3;i++)k.box(g,'#abb29e',x+(i-1)*.99,h*.64,z+1.182,.54,h*.40,.053);
     }else{
       k.box(g,day==='0109'?'#667c83':'#a28667',x,1.42,z,3.69,3.41,1.3);
       for(let i=0;i<3;i++)k.box(g,day==='0109'?'#a7b9ae':'#cebe9e',x+(i-1)*.92,1.34,z+.71,.67,2.06,.10);
       k.box(g,day==='0109'?'#94adad':'#c9ae87',x,3.30,z,3.69,.26,1.43);
     }
   }
 }
 else if(day==='0104'){k.box(g,'#ae9b80',0,2.24,-15.2,45,7.4,.32);
   for(let j=0;j<11;j++){const x=-19.4+j*4.09;k.box(g,bark,x,2.72,-14.99,3.28,3.14,.14);
     for(let n=0;n<6;n++)k.box(g,'#b9cbc1',x-.72+(n%2)*1.43,1.87+Math.floor(n/2)*.90,-14.893,1.29,.79,.037);}}
 else if(day==='0102'){k.box(g,'#7ca4a4',0,-.53,-23,100,.37,42);
   for(let j=0;j<9;j++)k.rock(g,j%2?'#94a99c':'#9da99a',-26+j*6.91,-.37,-20-j%3*1.9,4.56,.72+j%3*.27,2.71,j);}
 else{for(let i=0;i<16;i++){const x=-31+i*4.01,h=1.64+(i*3%6)*.39;
   if(day==='0105')huddle(k,g,x,-16.4-i%3*1.64,3.65,i%4);else k.rock(g,i%2?'#7d8382':'#96978f',x,-.64,-19-i%4,4.22,h,3.04,i);}
   if(day==='0103')for(let i=0;i<54;i++)k.ball(g,'#d1c9aa',-31+i*91%63,4.8+i*17%10,-28-i%5,.034+i%3*.009);}
}
export function buildNewyearDefense(k:Kit,root:T.Group,g:JanuaryDefense,day:NewyearDay){
 if(januaryWeekDefense(day))return buildJanuaryWeekDefense(k,root,g,day);
 const c=g.control!,set=k.group(root,0,.025,-4.63),bench=k.group(root,1.87,.027,3.71),end=k.group(set);end.name='newyear-finale';
 let update:(t:number,p:number,f:number)=>void;
 if(day==='0102'){
   k.box(set,'#6f9e9e',0,.025,-.04,12.15,.048,3.21);
   for(const d of [-1,1]){const dock=k.group(set,d*3.61,.045,-1.11,0,d*.08);pier(k,dock,3.60);
     const booth=k.group(dock,-d*.30,.47,-.18,0,0,0,.74);pavilion(k,booth,0,0,1,d<0?'#769c9f':'#a77f68');
     k.box(booth,d<0?azure:copper,0,1.23,-.46,1.28,.52,.09);for(let j=0;j<3;j++)k.box(booth,ivory,-.39+j*.33,1.24,-.395,.10,.23,.024);}
   const back=k.group(set);back.name='return-ferry';ferry(k,end,'#63919d');ferry(k,back,'#b67858');end.scale.setScalar(.94);back.scale.setScalar(.92);back.rotation.y=Math.PI;
   const shutters=[0,1].map(i=>{const a=k.group(bench,-.48+i*.96,.63,0);k.box(a,i?copper:azure,0,.065,0,.64,.12,.49);return a;});desk(k,bench,0,0,2.02,.50,.96);
   update=(t,p,f)=>{const u=.34*p+.66*unit(f*.82);end.position.set(-3.38+6.08*u,.12+.047*Math.sin(t*1.20),.90);
     back.position.set(3.38-6.08*u,.12+.044*Math.cos(t*1.19),-.26);shutters.forEach((s,i)=>s.rotation.z=c.reserve===i+1?.52:0);};
 }else if(day==='0103'){
   const bed=k.group(set,.25,0,.02);k.cyl(bed,'#929089',0,.065,0,1.76,.12);
   for(let j=0;j<25;j++){const a=j*Math.PI*2/25,r=1.72+.16*Math.sin(j);k.rock(bed,j%3?'#a69f8d':'#8b8a83',r*Math.cos(a),.12,r*Math.sin(a)*.75,.25,.16+j%4*.047,.22,j);}
   const craft=k.group(end,0,0,0,0,-.12,0,1.20);lander(k,craft);
   const model=k.group(set,-3.46,2.82,-.34,0,0,-.24);satellite(k,model,0,0,0,1.17);
   const arch=k.group(set,-1.85,1.65,-.54,0,.10,.20);for(let j=0;j<22;j++){const a=j*Math.PI/22,b=(j+1)*Math.PI/22;
     if(j%2===0)k.beam(arch,brass,[1.81*Math.cos(a),1.02*Math.sin(a),0],[1.81*Math.cos(b),1.02*Math.sin(b),0],.028);}
   const antenna=dish(k,set,3.57,-.37,1.16);dish(k,bench,0,0,.76);
   const brackets=[-1,1].map(()=>{const e=k.group(root);for(const d of [-1,1]){k.box(e,brass,d*.54,.075,0,.29,.055,.15);k.cyl(e,ivory,d*.64,.16,0,.047,.17);}return e;});
   const a:Point=[0,0],b:Point=[0,0];update=(t,p,f)=>{const frac=unit(f*.82);end.position.set(.25+.21*(1-p),.13+(1-frac)*(.93+(1-p)*1.03),.02);model.rotation.y=t*.17;
     antenna.rotation.y=c.active>0?.44:-.33;brackets.forEach((e,i)=>{const tr=g.tracks[g.sector],at=tr.total*(i?.72:.33);sample(tr,at,a);sample(tr,at+.02,b);e.position.set(a[0],0,a[1]);e.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);});};
 }else if(day==='0104'){
   desk(k,set,.16,.02,7.40,1.08,2.44);
   const casework=k.group(set,-1.88,1.20,-.68,.35);k.box(casework,bark,0,.96,0,2.53,1.94,.24);
   for(let i=0;i<6;i++){const x=-.49+(i%2)*.99,y=.39+Math.floor(i/2)*.56;k.box(casework,plaster,x,y,.152,.85,.47,.045);
     for(let j=0;j<6;j++)if((i*13+9)>>j&1)k.ball(casework,slate,x+((j%2)-.5)*.19,y+(1-Math.floor(j/2))*.115,.198,.049,.049,.038);}
   const mount=k.group(set,1.52,1.20,.07);k.box(mount,green,0,.085,0,2.59,.17,1.57);
   for(const x of [-.99,.99]){k.box(mount,brass,x,.55,-.55,.13,.95,.16);k.box(mount,brass,x,.55,.56,.13,.95,.16);}
   k.box(mount,ivory,0,.21,0,1.98,.052,1.26);
   for(let j=0;j<5;j++)dots(k,mount,-.76+j*.38,.261,0,[39,24,46,13,58][j],.24,slate);
   mount.add(end);k.put('round',end,'toon','#957658',0,.43,0,.195,1.95,.195,0,0,Math.PI/2);
   for(const x of [-1.05,1.05])k.put('round',end,'toon',brass,x,.43,0,.094,.18,.094,0,0,Math.PI/2);
   const fly=k.group(mount,1.25,.58,-.15,0,Math.PI/2);wheel(k,fly,.35,green);
   desk(k,bench,0,0,1.63,.44,.91);dots(k,bench,0,.563,0,43,.57,brass);
   update=(t,p,f)=>{end.position.z=-.48+unit(f)*.99;fly.rotation.z=.37*p+unit(f)*3.73;};
 }else{
   const lamps:T.Group[]=[];for(let i=0;i<8;i++){
     const s=i%2?1:-1,x=s*(1.65+Math.floor(i/2)*1.16),z=-.15-Math.floor(i/2)*.16;
     k.box(set,'#99b4bc',x,.27,z,.87,.53,.83);k.box(set,'#c9dfdc',x,.58,z,.94,.12,.90);
     k.taper(set,s<0?'#8cadb8':'#b9bbab',x,1.09,z,.35,.92,true);k.taper(set,'#c3d9d6',x,1.65,z,.43,.20);
     k.box(set,s<0?'#699eaa':'#c2a575',x,1.11,z+.325,.38,.51,.056);
     for(const a of [-1,1])k.beam(set,'#d0dad0',[x+a*.19,.89,z+.352],[x+a*.16,1.33,z+.365],.021);
     k.cone(set,s<0?'#9ebfc7':'#cec5a1',x,1.86,z,.38,.29);
     const bulb=k.group(set,x,1.18,z+.36);bulb.name='ice-lamp';k.ball(bulb,s<0?'#b9e3e3':'#f4cf8d',0,0,0,.244,.30,.19,'lamp');lamps.push(bulb);}
   for(const d of [-1,1])for(let j=0;j<3;j++){k.box(set,j%2?'#a9c7cc':'#bdd4d2',d*.95,.34+j*.64,-.47,.52,.61,1.04);}
   for(let i=0;i<9;i++){const a=Math.PI*i/8;k.put('box',set,'toon',i%2?frost:'#a9c5c9',1.04*Math.cos(a),1.88+.74*Math.sin(a),-.47,.41,.43,1.04,0,0,a-Math.PI/2);}
   const keystone=k.group(end,0,2.31,-.46);k.taper(keystone,'#e1ddbc',0,0,0,.24,.45,true);
   const stand=k.group(bench);for(const s of [-1,1]){k.taper(stand,s<0?azure:gold,s*.38,.28,0,.26,.50,true);k.ball(stand,ivory,s*.38,.59,0,.16,.10,.16);}
   update=(t,p,f)=>{const n=Math.floor(p*5+unit(f)*3+.001);lamps.forEach((l,i)=>l.visible=i<n);end.position.y=.35*(1-unit(f));};
 }
 return {update};
}
const plaster='#d9c9aa';


const signalColors=['#79b8d2','#dfae6e','#92ad7b'];
export function januaryPacketColor(day:string,id:number){
 if(day==='0106')return ['#cc7d64','#83a7a0'][id%2];
 if(day==='0108')return ['#79b8d2','#c39568'][id%2];
 if(day==='0109')return signalColors[id%3];
}
function pressedCards(k:Kit,host:T.Group,tone:string,x:number,y:number,z:number){
 k.box(host,tone,x,y,z,1.02,.048,.64);
 for(let j=0;j<11;j++)if(j%4!==2)k.box(host,'#6c5745',x-.39+j*.078,y+.025,z+((j%3)-1)*.15,.043,.005,.083);
}
function buildJanuaryWeekDefense(k:Kit,root:T.Group,g:JanuaryDefense,day:NewyearDay){
 const c=g.control!,set=k.group(root,0,.025,-4.63),end=k.group(set);end.name='newyear-finale';
 const bench=k.group(root,1.87,.027,3.71),track=k.group(root),near=k.group(bench);
 desk(k,bench,0,0,1.9,.42,1.03);
 const markers=[-1,1].map(s=>{const part=k.group(track);for(const x of [-.40,.40]){k.box(part,brass,x,.081,0,.23,.055,.21);k.cyl(part,ivory,x,.15,0,.034,.11);}
   k.box(part,'#c28b5d',0,.047,s*.12,.59,.025,.035);return part;});
 const signal=k.group(near,0,.57,0);
 k.ball(signal,'#ffdb88',0,0,0,.105,.091,.105,'lamp');
 const a:Point=[0,0],b:Point=[0,0];
 let animate:(t:number,p:number,f:number)=>void;
 if(day==='0106'){
   const board=k.group(set,0,0,-.62);
   for(const x of [-2.14,2.14])k.box(board,bark,x,1.34,0,.31,2.66,.39);
   k.box(board,'#9a674c',0,1.67,0,4.63,1.97,.26);
   k.box(board,'#d9c69f',0,1.65,.143,4.34,1.68,.027);
   for(let i=0;i<46;i++){
     const x=(i%10-4.5)*.36,y=1.11+Math.floor(i/10)*.26;
     k.put('box',board,'toon','#a48c65',x,y,.172,.177,.047,.028,0,0,.24);
   }
   for(const s of [-1,1]){
     k.box(set,'#967255',s*3.72,.42,-.25,1.99,.76,1.63);k.box(set,'#c3a275',s*3.72,.84,-.25,2.17,.10,1.78);
     k.box(set,s<0?'#a46d51':'#6e9a92',s*3.72,1.12,-.49,1.31,.14,.82);
     pressedCards(k,near,s<0?'#c78565':'#80a39a',s*.48,.50,.045);
   }
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const q=k.group(end,0,0,0,0,0,a);k.put('box',q,'lit','#e7b96b',0,.16,0,.088,.35,.053,0,0,.24);}
   animate=(t,p,f)=>{end.position.set(1.59,2.25-.33*unit(f),.23);end.rotation.z=.9*(1-unit(f));};
 }else if(day==='0107'){
   for(const s of [-1,1]){
     k.rock(set,'#d6d0b9',s*3.92,.19,-.13,2.01,1.38,2.18,s*.34);
     k.rock(set,'#9c9c88',s*4.40,.17,-.36,1.51,.88,1.70,s*.21);
     k.cyl(set,bark,s*2.72,1.09,.30,.069,.67);
     k.put('taperUp',set,'toon',s<0?copper:azure,s*2.49,1.43,.31,.19,.39,.19,0,0,-Math.PI/2);
   }
   k.box(set,'#86aab0',0,.035,0,4.60,.06,2.23);
   for(let i=0;i<17;i++)k.box(set,'#c0d1c6',(i%6-2.5)*.67,.071,(Math.floor(i/6)-1)*.67,.32,.012,.036);
   sectionMesh(k,end,quad=>{
     const ring=(strip:number,row:number):[number,number,number]=>{
       const phi=strip*Math.PI*2/14,u=row/14,r=.034+.77*Math.pow(Math.sin(u*Math.PI),.78);
       return [r*Math.cos(phi),.96+1.94*u,r*Math.sin(phi)];
     };
     for(let j=0;j<14;j++)for(let i=0;i<14;i++)
       quad(ring(i,j),ring(i+1,j),ring(i+1,j+1),ring(i,j+1),i%4===1?'#c98a63':'#d8b980');
   });
   for(const x of [-.17,.17])for(const z of [-.13,.13])k.beam(end,bark,[x,.37,z],[x*1.6,1.03,z*1.6],.027);
   k.box(end,'#986d4c',0,.29,0,.52,.39,.44);
   k.box(set,'#816650',2.53,.091,1.51,.78,.182,.37);
   k.box(set,'#c2a477',2.53,.211,1.51,.96,.058,.49);
   const rope=k.group(end,.23,.24,.24);
   rope.name='landing-rope';
   k.beam(rope,'#ddbd85',[0,0,0],[.035,-.245,.04],.029);
   k.cyl(rope,'#946344',.036,-.248,.041,.035,.07);
   k.cyl(near,bark,0,.53,0,.07,.22);
   const sleeve=k.group(near,0,.67,0,0,0,-Math.PI/2);k.taper(sleeve,copper,0,.14,0,.16,.39,true);
   animate=(t,p,f)=>{
     const u=unit(f),lowered=unit(Math.max(0,(u-.48)/.43));
     end.position.set(-2.62+5.15*u,.16+.47*(1-u)*p+.08*Math.sin(t*2)*(1-u),.44+1.13*u);
     end.rotation.z=.13*(1-u)*Math.sin(t*1.27);
     rope.visible=lowered>0;rope.scale.y=Math.max(.001,lowered);
     sleeve.rotation.y=c.focus%2?0:Math.PI;
   };
 }else if(day==='0108'){
   desk(k,set,0,0,7.42,1.04,2.1);
   for(const side of [-1,1])for(let i=0;i<7;i++)pressedCards(k,set,side<0?'#94acaf':'#cba377',side*2.73,1.061+i*.048,-.21-i*.039);
   const console=k.group(set,.19,1.12,-.38);
   k.box(console,'#526961',0,.71,0,3.27,1.41,.69);
   for(let i=0;i<6;i++){
     const x=(i-2.5)*.44;k.box(console,'#cbbb9a',x,.82,.362,.34,.56,.046);
     for(let l=0;l<4;l++)k.box(console,l===i%4?brass:'#5e655a',x,.65+l*.11,.395,.205,.038,.018);
   }
   console.add(end);end.position.set(0,1.12,.32);k.beam(end,brass,[0,0,0],[0,.61,.74],.063);k.ball(end,steel,0,.61,.74,.121);
   const tray=k.group(near);pressedCards(k,tray,'#86aeb7',-.45,.50,0);pressedCards(k,tray,'#c9996d',.52,.51,-.081);
   animate=(t,p,f)=>{end.rotation.x=Math.min(.95,.41*p+.40*c.active)*-1-1.13*unit(f);tray.position.z=.12*p+.085*unit(c.active);};
 }else if(day==='0109'){
   k.box(set,'#4b575e',0,.19,0,7.02,.36,2.24);
   k.box(set,'#7c8e90',0,1.62,-.50,5.60,2.45,.38);
   const lights=signalColors.map((color,i)=>{
     const x=(i-1)*1.63;const pane=k.group(set,x,1.65,-.29);
     k.box(pane,'#445960',0,0,0,1.46,1.85,.036);
     for(let j=0;j<6;j++)k.box(pane,'#739096',0,.62-j*.24,.027,1.25,.014,.013);
     const strips=k.group(pane,0,0,.039);for(let j=0;j<9;j++)k.box(strips,color,(j-4)*.116,-.21,.015,.060,.16+.88*Math.sin(j*Math.PI/8),.018,0,'lamp');
     return strips;
   });
   set.add(end);end.position.set(0,.45,-.13);k.box(end,'#d1ba8d',0,.06,0,5.11,.10,.45);
   for(let i=0;i<3;i++)k.box(end,signalColors[i],(i-1)*1.62,.155,0,1.41,.083,.20,0,'lamp');
   animate=(t,p,f)=>{lights.forEach((L,i)=>{L.visible=i<c.reserve||c.hits>0&&c.reserve===0||f>0;L.scale.y=.70+.30*Math.sin(t*2+i)*Math.min(1,1.01-f);});end.position.y=.46+.37*unit(f);};
 }else{
   const tunnel=k.group(set,0,.05,-.49);
   for(const x of [-1.73,1.73])for(let i=0;i<8;i++)k.box(tunnel,i%2?'#986951':'#a9785a',x,.14+i*.269,0,.58,.24,1.31);
   for(let j=0;j<13;j++){
     const t=Math.PI*j/12;k.put('box',tunnel,'toon',j%2?'#a16f54':'#b88260',1.73*Math.cos(t),2.17+.97*Math.sin(t),0,.31,.37,1.31,0,0,t-Math.PI/2);
   }
   for(const x of [-.55,.55])k.box(set,steel,x,.115,.50,.08,.069,3.55);
   for(let j=0;j<12;j++)k.box(set,bark,0,.074,-1.12+j*.29,1.45,.059,.14);
   const train=k.group(end,0,.015,0,0,-Math.PI/2);
   k.box(train,'#66776b',0,.43,0,2.54,.44,.88);k.put('round',train,'toon','#4a5b53',.22,.84,0,.37,1.64,.37,0,0,Math.PI/2);
   k.box(train,'#6b795f',-.79,1.08,0,.63,.81,.90);k.box(train,'#283638',-.81,1.57,0,.82,.12,.99);
   k.taper(train,'#505856',.78,1.26,0,.145,.52,true);
   const wheels:T.Group[]=[];
   for(const a of [-1,1])for(let j=0;j<3;j++){
     const axle=k.group(train,-.86+j*.73,.39,a*.50);wheels.push(axle);
     k.put('round',axle,'toon','#4d5553',0,0,0,.255,.12,.255,Math.PI/2);
     k.ring(axle,'#a79775',0,0,a*.077,.19);
     k.beam(axle,brass,[-.17,0,a*.077],[.17,0,a*.077],.023);
   }
   const dial=k.group(near,0,.51,.11,-.34);wheel(k,dial,.30,copper);
   animate=(t,p,f)=>{const u=unit(f);end.position.set(0,0,-1.68+3.09*u);wheels.forEach(w=>w.rotation.z=-u*10.7);dial.rotation.z=.4*p+(c.focus%2?1.22:0)+.61*c.active;};
 }
 return {update(t:number,p:number,f:number){
   const tr=g.tracks[g.sector];
   markers.forEach((mark,i)=>{const at=tr.total*(i?.83:.50);sample(tr,at,a);sample(tr,at+.02,b);mark.position.set(a[0],0,a[1]);mark.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);mark.visible=i===0||day==='0107';});
   signal.visible=c.active>0||g.phase==='wave'&&januaryPacketCount(day,c,g.packets,g.tracks)>0;
   animate(t,p,f);
 }};
}
