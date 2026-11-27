/** Original paper, props and miniature scenery. No external textures or equipment simulators. */
import * as T from 'three';
import type {Stage} from '../level/stage';
import {type Bench,type Builder,paint,rod,batch,brass,wood,iron,cream} from './december-chapters';
import type {MonthendRun} from '../templates/monthend-chapters';
export type Exhibit=Builder<MonthendRun>;
type Motif='cloud'|'river'|'leaf'|'frost'|'moon'|'earth'|'round'|'diamond'|'sail'|'rock'|'sleeve'|'fan'|'train'|'wheel'|'spiral'|'stars'|'wave'|'notes'|'rows';
export function ink(st:Stage,kind:Motif,paper='#e5d7b6',color='#616b60'){
 return paint(st,paper,g=>{g.strokeStyle=color;g.fillStyle=color;g.lineWidth=5;g.strokeRect(22,22,724,340);
 const line=(points:number[][])=>{g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();};
 const disc=(x:number,y:number,r:number)=>{g.beginPath();g.arc(x,y,r,0,7);g.fill();};
 if(kind==='cloud'||kind==='river'||kind==='wave'||kind==='notes'){
  for(let i=0;i<(kind==='wave'?1:3);i++){const a=Array.from({length:121},(_,j)=>{const f=j/120;
    return [50+f*665,105+i*84+Math.sin(f*Math.PI*(kind==='wave'?20:4)+i*.72)*(kind==='wave'?100*Math.sin(f*Math.PI):31)];});line(a);}
  if(kind==='notes'){for(let j=0;j<8;j++){const x=94+j*80,y=159+Math.sin(j*1.3)*55;disc(x,y,12);line([[x+10,y],[x+10,y-68]]);}}}
 else if(kind==='moon'){g.beginPath();g.ellipse(384,386,520,190,-.12,0,7);g.fill();for(let i=0;i<8;i++){g.strokeStyle=paper;g.beginPath();g.ellipse(170+i*69,280+(i%3)*22,17,6,0,0,7);g.stroke();}}
 else if(kind==='earth'){disc(455,128,63);g.fillStyle='#8da791';g.beginPath();g.ellipse(446,106,36,15,-.3,0,7);g.fill();}
 else if(kind==='round'||kind==='diamond'||kind==='wheel'){for(let j=0;j<3;j++){const r=51+j*25;
  if(kind==='diamond')line([[384,189-r],[384+r*1.45,189],[384,189+r],[384-r*1.45,189],[384,189-r]]);
  else{g.beginPath();g.ellipse(384,189,r*1.2,r,0,0,7);g.stroke();}}}
 else if(kind==='leaf'||kind==='frost'){for(let j=0;j<7;j++){const x=134+j*83;line([[x-50,303],[x+15,80]]);for(let k=0;k<4;k++)line([[x-24+k*8,237-k*41],[x+11+k*14,202-k*37]]);}}
 else if(kind==='sleeve'||kind==='fan'){
  const polygon=(p:number[][])=>{g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
  g.save();g.translate(384,24);if(kind==='sleeve')g.scale(-1,1);
  g.fillStyle='#59444a';polygon([[-22,141],[-52,156],[-31,211],[-69,284],[-97,298],[-57,310],[83,297],[56,278],[28,207],[47,160],[14,136]]);
  disc(-4,112,30);g.fillRect(-38,76,63,23);
  for(let k=-2;k<=2;k++){line([[k*9,83],[k*15,63+Math.abs(k)*3]]);disc(k*15,62+Math.abs(k)*3,8);}
  g.fillStyle='#945c4c';polygon([[-41,156],[-69,144],[-99,121],[-111,140],[-84,172],[-51,185]]);
  polygon([[34,158],[69,168],[105,142],[112,155],[75,191],[42,183]]);
  g.fillStyle='#6c635c';polygon([[-102,126],[-121,112],[-152,127],[-169,151],[-191,166],[-224,154],[-201,179],[-173,184],[-142,170],[-119,145]]);
  g.fillStyle='#ba8556';g.beginPath();g.moveTo(106,146);g.arc(106,146,72,-2.48,-.35);g.closePath();g.fill();g.strokeStyle='#765544';g.lineWidth=4;
  for(let i=0;i<6;i++){const a=-2.42+i*.40;line([[106,146],[106+Math.cos(a)*66,146+Math.sin(a)*66]]);}g.restore();
 }
 else if(kind==='sail'||kind==='rock'){g.beginPath();const pts=kind==='sail'?[[180,275],[424,83],[428,270]]:[[140,280],[265,161],[313,189],[444,86],[590,279]];
  pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.fill();}
 else if(kind==='spiral'||kind==='stars'){for(let i=0;i<160;i++){const a=i*.28,r=i*.85,side=i%2?1:-1;
  disc(384+(kind==='spiral'?Math.cos(a)*r*1.4*side:i*97%584-292),192+(kind==='spiral'?Math.sin(a)*r*.68*side:i*61%246-123),i%5===0?3.8:2);}}
 else if(kind==='train'){g.fillRect(185,129,338,108);g.fillRect(265,86,143,63);for(let i=0;i<3;i++)disc(248+94*i,248,22);}
 else for(let i=0;i<8;i++)g.fillRect(78,64+i*35,410+(i*57)%184,5);
 });}
export function props(b:Bench,point:number[],make:(g:T.Group)=>void){const g=b.group();g.position.set(point[0],point[1],point[2]);make(g);batch(g);return g;}
export function backdrop(b:Bench,color:string,trim:string){b.box(color,0,1.60,-3.98,9.82,3.2,.22);for(let j=0;j<7;j++)b.box(trim,-4.37+j*1.46,1.59,-3.84,.054,3.12,.065);}
export function table(b:Bench,x:number,y:number,z:number,w:number,d:number){b.box(wood,x,y,z,w,.18,d);for(const k of [-1,1])for(const j of [-1,1])b.box('#795e49',x+k*(w/2-.14),y*.47,z+j*(d/2-.14),.15,y*.94,.15);}
export function spool(b:Bench,p:T.Group,x:number,y:number,z:number,r:number){
 const hub=b.cylinder(wood,x,y,z,r*.59,r*.59,.18,p);hub.rotation.x=Math.PI/2;
 for(const k of [-1,1]){const o=b.cylinder(iron,x,y,z+k*.11,r,r,.046,p);o.rotation.x=Math.PI/2;
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;b.oval(brass,x+r*.55*Math.cos(a),y+r*.55*Math.sin(a),z+k*.145,r*.12,r*.12,.013,p);}}
}
export function pairCards(b:Bench,st:Stage,types:[Motif,Motif],w=.78,d=.54){return types.map(k=>b.box(ink(st,k),0,.10,0,w,.054,d,b.root));}
export function sheet(b:Bench,st:Stage,x:number,y:number,z:number,w:number,h:number,m:Motif,color?:string){
 return b.box(ink(st,m,color),x,y,z,w,h,.045,b.root);}
export function frame(b:Bench,p:T.Group,w:number,h:number,c=wood){for(const k of [-1,1]){
 b.box(c,k*w/2,0,0,.071,h,.105,p);b.box(c,0,k*h/2,0,w+.071,.071,.105,p);}}
export function register(s:MonthendRun,i:number,x:number,z:number){const k=i?1:-1,taken=!!(s.mask&(1<<i));
 return [s.carry===i?x:taken?k*.46:k*2.09,s.carry===i?.46:taken?.17:.09,s.carry===i?z-.27:taken?.19:.52];}
export function penn(b:Bench,p:T.Group,color:string,w:number,h:number){const g=new T.Shape();g.moveTo(-w/2,0);g.lineTo(w/2,0);g.lineTo(0,h);g.closePath();return b.part(new T.ExtrudeGeometry(g,{depth:.045,bevelEnabled:false}),color,0,0,0,1,1,1,p);}

