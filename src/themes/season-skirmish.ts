// 五座接应场的模型、工程仪表与动作均为虚构的互动展陈。
import * as T from 'three';
import {Kit} from './folio-landmarks';
import {bakeRegion} from '../world/bake';
import type {Stage,StageLook} from '../level/stage';
import type {WorldDefinition} from '../slime/world';
import type {RelayCourse} from '../templates/season-skirmish';
import {DecemberReception} from '../templates/december-skirmish';
import {buildDecemberVenue,decemberOutlines,decemberEyes,decemberGround,decemberPad,paintDecemberDeck} from './december-skirmish';
import type {Vec} from '../slime/types';
import {WinterReception} from '../templates/winter-skirmish';
import {winterOutlines,winterEyes,buildWinterVenue,winterPad,paintWinterDeck} from './winter-skirmish';
import {MidwinterReception} from '../templates/midwinter-skirmish';
import {midwinterOutlines,midwinterGround,midwinterEyes,buildMidwinterVenue,midwinterPad,paintMidwinterDeck} from './midwinter-skirmish';
import {YearendReception} from '../templates/yearend-skirmish';
import {yearendOutlines,yearendGround,yearendEyes,buildYearendVenue,yearendPad,paintYearendDeck} from './yearend-skirmish';
import {MonthendReception} from '../templates/monthend-skirmish';
import {monthendOutlines,monthendGround,monthendEyes,buildMonthendVenue,monthendPad,paintMonthendDeck} from './monthend-skirmish';
import {NewyearReception} from '../templates/newyear-skirmish';
import {newyearOutlines,newyearGround,newyearEyes,buildNewyearVenue,newyearPad,paintNewyearDeck} from './newyear-skirmish';
const cream='#e8ddbd', steel='#566d76', copper='#ad7449', ink='#35434c', brass='#d6a35e';
type Point=[number,number];
const outlines:Record<string,Point[]>={
 ...decemberOutlines,...winterOutlines,...midwinterOutlines,...yearendOutlines,...monthendOutlines,...newyearOutlines,
 relay:[[-2.2,7],[2.2,7],[2.2,3.3],[4.65,2.4],[4.65,-2.1],[1.8,-3.5],[1.8,-7],[-1.8,-7],[-1.8,-3.5],[-4.8,-2],[-4.8,2.1],[-2.2,3.4]],
 brake:[[-2.4,7],[2.4,7],[2.4,4],[4.7,1.6],[4.7,-2.3],[2.45,-4.5],[1.5,-7],[-1.5,-7],[-1.5,-3.6],[-4.4,-2],[-4.4,1],[-2.4,3.5]],
 arcs:[[-2,7],[2,7],[4.4,2.6],[4.9,-1],[3.1,-4.2],[1.5,-6.9],[-1.5,-6.9],[-4.5,-3],[-4.65,1],[-3.3,4.2]],
 shadow:[[-2.5,7],[2.5,7],[2.5,3.5],[4.8,3.5],[4.8,-3.6],[2.6,-3.6],[2.6,-7],[-2.6,-7],[-2.6,-3.6],[-4.8,-3.6],[-4.8,3.5],[-2.5,3.5]],
 ticket:[[-2.8,7],[2.8,7],[2.8,2.7],[5,2.7],[5,-2.5],[2.2,-2.5],[2.2,-7],[-2.2,-7],[-2.2,-2.5],[-5,-2.5],[-5,2.7],[-2.8,2.7]]
};
export function relayLook(c:RelayCourse):StageLook{
 const {sky,kind}=c.spec,night=['brake','arcs','relay'].includes(kind);
 return {skyTop:sky[0],skyHorizon:sky[1],fog:[25,78],sun:night?'#ffdfb8':'#ffedc6',sunIntensity:2,
 hemiSky:'#ecf4ff',hemiGround:night?'#95a0b2':'#ac9275',ink:'#42454c',wash:night?'#c4cbd0':'#eee1c2'};
}
function surface(c:RelayCourse){
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=840;
 const g=canvas.getContext('2d')!,{spec:s}=c;
 g.fillStyle=s.stone;g.fillRect(0,0,640,840);
 const line=(x:number,z:number,x1:number,z1:number,w:number,col:string)=>{g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(x,z);g.lineTo(x1,z1);g.stroke();};
 if(c instanceof NewyearReception)paintNewyearDeck(g,c);
 else if(c instanceof MonthendReception)paintMonthendDeck(g,c);
 else if(c instanceof YearendReception)paintYearendDeck(g,c);
 else if(c instanceof MidwinterReception)paintMidwinterDeck(g,c);
 else if(c instanceof WinterReception)paintWinterDeck(g,c);
 else if(c instanceof DecemberReception)paintDecemberDeck(g,c);
 else if(s.kind==='shadow'){
   for(let i=0;i<13;i++){line(0,i*70,640,i*70,2,'#766b59');for(let j=0;j<7;j++){const x=j*112+(i%2)*56;line(x,i*70,x,(i+1)*70,1.5,'#817663');}}
   g.strokeStyle='#a87a44';g.lineWidth=3;for(const r of [48,93,141]){g.beginPath();g.arc(320,419,r,0,Math.PI*2);g.stroke();}
 }else if(s.kind==='ticket'){
   for(let i=0;i<18;i++)for(let j=0;j<13;j++){g.fillStyle=(i+j)%2?'#8b9b8d':'#bfbea4';g.fillRect(j*52,i*52,50,50);}
   for(let i=0;i<5;i++)line(10,240+i*84,630,240+i*84,2,'#948976');
 }else{
   for(let i=0;i<14;i++){const y=i*70;line(0,y,640,y,2,'#475e6c');for(let j=0;j<6;j++){const x=j*128+(i%2)*56;line(x,y,x,y+70,2,'#546471');g.fillStyle='#b8b6a5';g.fillRect(x+5,y+6,3,3);}}
   if(s.kind==='arcs'||s.kind==='brake')for(let i=0;i<3;i++){
     g.strokeStyle=i===1?s.trim:'#a7bfc2';g.lineWidth=i===1?4:2;g.beginPath();g.ellipse(320,i===0?405:390,130+i*62,255+i*22,(i-1)*.16,0,Math.PI*2);g.stroke();}
   else {for(const x of [230,410]){line(320,685,x,555,6,brass);line(x,555,x,382,6,brass);line(x,382,x<320?133:507,361,6,brass);}}
 }
 for(const [x,,z] of c.pads){const px=(x+5.4)*640/10.8,py=(z+7.5)*840/15;
   g.strokeStyle='#fff0bc';g.lineWidth=4;g.beginPath();g.ellipse(px,py,37,35,0,0,Math.PI*2);g.stroke();
   for(let j=0;j<8;j++){const a=j*Math.PI/4;line(px+Math.cos(a)*41,py+Math.sin(a)*38,px+Math.cos(a)*48,py+Math.sin(a)*45,3,s.trim);}
 }
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;return tex;
}
function deck(stage:Stage,c:RelayCourse){
 const points=outlines[c.spec.kind],shape=new T.Shape(points.map(([x,z])=>new T.Vector2(x,-z)));
 const g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);
 const pos=g.getAttribute('position'),uv=g.getAttribute('uv');for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+5.4)/10.8,1-(pos.getZ(i)+7.5)/15);
 const top=new T.Mesh(g,stage.toon('#ffffff',{map:surface(c)}));top.name='season-reception-walk';stage.add(top);
 const side:number[]=[];
 for(let i=0;i<points.length;i++){const [x,z]=points[i], [u,v]=points[(i+1)%points.length];side.push(x,0,z,u,0,v,x,-.55,z,u,0,v,u,-.55,v,x,-.55,z);}
 const skirt=new T.BufferGeometry();skirt.setAttribute('position',new T.Float32BufferAttribute(side,3));skirt.computeVertexNormals();
 stage.add(new T.Mesh(skirt,stage.toon('#586b6b',{side:T.DoubleSide})));
 const world:WorldDefinition={boxes:[],surfaces:[],bounds:{min:[-9,-5,-11],max:[9,11,10]}};
 return {world,top};
}
function dish(k:Kit,root:T.Group,scale:number,x:number,y:number,z:number){
 const head=k.group(root,x,y,z,.90,0,0,scale);
 const profile=[new T.Vector2(.02,-.16),new T.Vector2(.42,-.11),new T.Vector2(.88,.04),new T.Vector2(1.29,.31),
  new T.Vector2(1.24,.36),new T.Vector2(.84,.11),new T.Vector2(.4,-.04),new T.Vector2(.02,-.075)];
 const bowl=new T.Mesh(new T.LatheGeometry(profile,32),k.mats.toon.clone());bowl.material.color.set('#b9c6b7');head.add(bowl);
 k.ring(head,cream,0,.34,0,1.29,Math.PI/2);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;const sx=Math.cos(a),sz=Math.sin(a);
  k.beam(head,'#9dac9e',[sx*.18,-.047,sz*.18],[sx*.76,.095,sz*.76],.019);
  k.beam(head,'#9dac9e',[sx*.76,.095,sz*.76],[sx*1.25,.36,sz*1.25],.019);
  if(i%4===0)k.beam(head,steel,[sx*1.22,.35,sz*1.22],[0,1.12,0],.035);
 }
 k.ball(head,brass,0,1.12,0,.14);return head;
}
function craft(k:Kit,root:T.Group){
 const sat=k.group(root);
 k.box(sat,'#d8aa69',0,0,0,.89,.79,.72);k.taper(sat,'#d7c78d',0,.52,0,.37,.32);
 for(const x of [-.27,.27]){
  k.taper(sat,'#747c79',x,-.49,-.06,.095,.25);
  k.beam(sat,cream,[x,.27,.37],[x*.36,.74,.57],.018);
 }
 k.ball(sat,'#ecdeaf',0,.71,.57,.16,.064,.18);
 for(const side of [-1,1]){
  k.beam(sat,cream,[side*.43,.03,0],[side*2.45,.03,0],.05);
  for(let j=0;j<3;j++){k.box(sat,'#456783',side*(.8+j*.55),.05,.08,.52,.09,.98);
   for(let h=0;h<4;h++)k.box(sat,'#92b3bd',side*(.8+j*.55),.102,-.29+h*.23,.47,.012,.025);}
 }
 return sat;
}
function stars(k:Kit,r:T.Group){
 for(let i=0;i<82;i++){const a=i*2.39996,rad=15+(i%9)*1.6;k.ball(r,i%4?'#d3e0dc':'#edc896',Math.cos(a)*rad,4+(i*7%21),-16-Math.abs(Math.sin(a))*19,i%8?.052:.095,.062,.052,'glow');}
}
function station(k:Kit,r:T.Group){
 for(let i=0;i<13;i++){const x=(i-6)*4.1;k.rock(r,i%3?'#647d7a':'#748c83',x,.6,-19-i%4,5,2.4+(i*7%5),4.5,i*.72);}
 const heads:T.Group[]=[];for(const [x,z,h,s] of [[0,-9.5,3.5,2.3],[-5.9,-.95,1.8,.95],[5.95,-1.7,2.1,1.1]]){
  k.cyl(r,'#667f78',x,-.71,z,1.08*s,2.55);k.taper(r,'#95a398',x,h*.49,z,.62*s,h-.2);
  for(const side of [-1,1])k.beam(r,steel,[x+side*.66*s,.5,z],[x+side*.32*s,h,z],.08*s);
  const head=dish(k,r,s,x,h,z);head.userData.hinged=true;heads.push(head);}
 for(const x of [-6.6,6.7]){k.box(r,'#64756b',x,-.15,3,1.9,3.56,2);k.box(r,'#47595d',x,1.66,3,2.15,.19,2.25);
  k.box(r,'#d4bc83',x,1,4.03,1.27,.55,.05);for(let i=0;i<4;i++)k.box(r,ink,x-.45+i*.3,1,4.07,.04,.52,.028);}
 // Cross-braced relay tower, porcelain insulators and a sag between successive poles.
 for(let j=0;j<4;j++){
  const x=-6.7-j*.85,z=-5.3-j*3,h=2.25+j*.28;
  k.cyl(r,'#75867b',x,-1.20,z,.47,1.48);
  k.beam(r,steel,[x-.34,-.48,z],[x-.14,h,z],.055);k.beam(r,steel,[x+.34,-.48,z],[x+.14,h,z],.055);
  for(let n=0;n<3;n++){const a=n*h/3,b=(n+1)*h/3;k.beam(r,'#9faba1',[x-.27,a,z],[x+.19,b,z],.036);k.beam(r,'#9faba1',[x+.27,a,z],[x-.19,b,z],.036);}
  k.box(r,copper,x,h,z,1.19,.10,.15);
  for(const sign of [-1,1]){
    k.ball(r,cream,x+sign*.48,h+.13,z,.09,.13,.09);
    if(j<3){const m:Vec=[x-.425+sign*.48,h+.06,z-1.5];
     k.beam(r,ink,[x+sign*.48,h+.23,z],m,.023);k.beam(r,ink,m,[x-.85+sign*.48,h+.51,z-3],.023);}
  }
 }
 const relay=craft(k,r);relay.userData.hinged=true;relay.position.set(2.7,6.3,-13.3);stars(k,r);
 const signal=k.group(r);signal.userData.hinged=true;
 k.ball(signal,'#fff3ba',0,0,0,.105,.105,.105,'glow');k.ring(signal,'#ffd186',0,0,0,.21,0,0,'glow');
 const path:Vec[]=[[-5.9,2.22,-.75],[2.7,6.3,-13.3],[5.95,2.62,-1.38],[0,4.01,-8.9]];
 return (c:RelayCourse,end:number)=>{
   heads.forEach((h,i)=>h.rotation.y=.14*Math.sin(c.elapsed*.6+i)+(c.done.has(i)?-.48:.25));relay.rotation.z=.12*Math.sin(c.elapsed*.5)+end*.1;
   signal.visible=c.westHeld||c.done.has(2);const legs=c.done.has(2)?3:1;
   const f=((c.elapsed+end)*1.04)%legs,i=Math.floor(f),a=path[i],b=path[i+1];signal.position.set(a[0]+(b[0]-a[0])*(f-i),a[1]+(b[1]-a[1])*(f-i),a[2]+(b[2]-a[2])*(f-i));
 };
}
function orbital(k:Kit,r:T.Group,braking:boolean){
 stars(k,r);
 const moon=k.group(r,braking?-3.2:0,braking?2:3.2,-11.9);
 const radius=braking?4.25:2.35;
 k.ball(moon,'#c2c3b0',0,0,0,radius);
 for(let i=0;i<25;i++){const a=i*2.39996,rad=Math.sqrt((i+.5)/25)*.93,x=rad*Math.cos(a),y=rad*Math.sin(a),z=Math.sqrt(1-rad*rad);
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(x,y,z)),e=new T.Euler().setFromQuaternion(q);
  const r=radius*(.046+(i%4)*.018),inside=radius-r*.26;
  k.put('ball',moon,'toon','#a4a996',x*inside,y*inside,z*inside,r,r,.34*r,e.x,e.y,e.z);
  k.put('ring',moon,'toon','#d3d1b8',x*radius,y*radius,z*radius,r,r,r,e.x,e.y,e.z);}
 const ring=k.group(r,braking?.65:0,3.1,-11,.1,0,.19),s=craft(k,r);s.userData.hinged=true;
 const hoop=k.group(ring);hoop.userData.hinged=true;hoop.scale.set(braking?5.1:4.18,braking?2.65:3.62,1);k.ring(hoop,braking?brass:'#7ac7c1',0,0,0,1);
 if(!braking)for(const sign of [-1,1]){
  k.beam(s,cream,[sign*.31,-.28,.18],[sign*.64,-.79,.35],.045);
  k.cyl(s,brass,sign*.64,-.80,.35,.16,.055);
 }
 const outer=k.group(ring,0,0,-.32,.55,.2,-.62),tracker=k.group(ring);
 if(!braking){outer.scale.set(5.65,3.8,1);k.ring(outer,'#dda665',0,0,0,1);tracker.userData.hinged=true;k.ball(tracker,'#ffbf72',0,0,0,.18,.18,.18,'glow');}
 for(let i=0;i<12;i++){const x=(i%2?-1:1)*(5.4+i%3*1.3),z=4.4-i*1.17;k.rock(r,i%2?'#8b999a':'#6e7e88',x,-.6,z,1+(i%4)*.13,.65+(i%3)*.37,1.21,i);}
 const point=new T.Vector3(),other=new T.Vector3();
 return(c:RelayCourse,end:number)=>{
  const a=braking?1.04+c.brake*.78+end*.47:c.elapsed*.20+1.8+end*.35;
  if(braking)hoop.scale.set(5.1-c.brake*.95,2.65+c.brake*.45,1);
  point.set(Math.cos(a),Math.sin(a),0);hoop.localToWorld(point);s.position.copy(point);s.rotation.z=a+.6;
  if(!braking){const b=c.elapsed*.31+.9;other.set(Math.cos(b),Math.sin(b),0);outer.localToWorld(other);ring.worldToLocal(other);
    if(end){point.set(hoop.scale.x*Math.cos(a),hoop.scale.y*Math.sin(a),.17);other.lerp(point,Math.min(1,end/2));}
    tracker.position.copy(other);}
 };
}
function shadowGarden(k:Kit,r:T.Group){
 const dial=k.group(r,0,1.75,-9.8,.95);
 k.cyl(dial,'#916c49',0,-.18,0,2.73,.36);k.ring(dial,brass,0,.02,0,2.55,Math.PI/2);
 for(let j=0;j<24;j++){const a=j*Math.PI/12;k.put('box',dial,'toon',cream,Math.sin(a)*2.29,.025,Math.cos(a)*2.29,.06,.05,j%3?.23:.43,0,a);}
 k.beam(dial,ink,[0,.1,-.15],[0,1.75,-1.2],.13);
 for(const x of [-5.75,5.75]){k.box(r,'#d4bf96',x,.03,-.3,.8,3.8,7.45);
  k.box(r,'#899374',x+Math.sign(x)*1.62,-1.01,-2.85,2.24,1.86,11.9);
  for(const z of [-3.7,-.4,3]){k.cyl(r,'#a36947',x,2.31,z,.13,1.7);k.box(r,'#667c73',x,3.18,z,1.06,.18,1.02);}
  for(let i=0;i<16;i++){const z=-8.2+i*.72,xx=x+Math.sign(x)*(1.2+(i%3)*.38);k.beam(r,'#7f815d',[xx,-.1,z],[xx+.08,2+(i%4)*.4,z+.1],.065);
   for(const side of [-1,1])k.put('ball',r,'toon',i%3?'#87a076':'#b1b678',xx+side*.19,1.55+i%3*.27,z,.35,.07,.12,0,0,side*.56);}}
 for(let n=0;n<12;n++){const x=-27+n*5.25;k.rock(r,n%3?'#9caa89':'#a8b39c',x,-.75,-25-n%4,5.8,3.3+(n*7%4),4.2,n*.6);}
 // Pavilion and a tiled wall beyond the sun ruler. Leave the center open to pale mountains.
 for(const side of [-1,1]){
  const x=side*8.1,z=-9.2;
  k.box(r,'#978d71',x,-1.04,z,4.9,1.88,3.85);
  for(const dx of [-1.78,1.78])for(const dz of [-1.25,1.25]){
    k.cyl(r,'#956749',x+dx,1.29,z+dz,.13,2.9);k.cyl(r,'#b7ab8d',x+dx,.03,z+dz,.19,.28);
    k.beam(r,'#a48050',[x+dx,2.30,z+dz],[x+dx*.70,2.70,z+dz],.08);
  }
  k.box(r,'#816a4a',x,2.78,z,4.25,.18,3.18);
  for(const dz of [-1,1]){
    k.put('box',r,'toon','#67817a',x,3.18,z+dz*.86,4.77,.19,2.08,dz*.43);
    for(let j=0;j<9;j++)k.beam(r,'#82958a',[x-2.14+j*.54,3.66,z],[x-2.14+j*.54,2.89,z+dz*1.83],.037);
  }
  k.beam(r,steel,[x-2.65,3.66,z],[x+2.65,3.66,z],.095);
  for(let j=0;j<3;j++){const t=side*(5.2+j*2.1);k.box(r,'#d4c5a1',t,-.15,-14,2.08,3.59,.34);k.box(r,'#657d76',t,1.73,-14,2.08,.15,.46);}
 }
 const hand=k.group(dial,0,.09,0);dial.userData.hinged=hand.userData.hinged=true;k.box(hand,'#625c47',0,.006,.91,.13,.035,1.81);
 const shadows=[-3.1,3.1].map(x=>{const g=k.group(r,x,.068,-1.53);g.userData.hinged=true;k.box(g,'#706d57',0,0,.49,.075,.025,.98);return g;});
 return(c:RelayCourse,end:number)=>{hand.rotation.y=-.93+c.sweep*1.85;dial.rotation.z=end*.06;
  shadows.forEach((g,i)=>{const fraction=c.done.has(i+1)?i:c.sweep;g.scale.z=.33+1.1*fraction;g.rotation.y=.18+.32*fraction;});};
}
function exchange(k:Kit,r:T.Group){
 const gong=k.group(r,0,3.05,-9.25);gong.userData.hinged=true;k.put('round',gong,'toon','#b9833d',0,0,0,1.69,.15,1.69,Math.PI/2);
 k.ring(gong,'#dfba6e',0,0,.07,1.59);k.ball(gong,'#d7a553',0,0,.12,.49,.49,.19);
 k.box(r,'#a28e77',0,-1.1,-9.25,5.32,1.62,1.85);
 for(const x of [-2.16,2.16]){k.box(r,'#775c44',x,1.95,-9.25,.19,4.5,.23);k.beam(r,brass,[x*.69,4.43,-9.23],[x*.40,4.92,-9.23],.03);}
 k.box(r,'#886545',0,4.98,-9.25,4.75,.21,.30);
 for(const x of [-6,6])k.box(r,'#74877b',x,-1.02,-.1,2.14,1.87,11.2);
 for(const x of [-6,6])for(let i=0;i<4;i++){const z=4.1-i*2.8;k.box(r,'#8d7056',x,.72,z,1.46,1.63,2);k.box(r,'#c4a57b',x,1.59,z,1.68,.13,2.15);
  k.box(r,'#ccc5a5',x,1.97,z,.73,.58,.61);k.box(r,'#446761',x,2,z+.32,.57,.36,.039);k.box(r,'#e6dcb8',x,1.68,z+.57,.76,.05,.24);}
 k.box(r,'#70563f',-4.6,2.55,-9.2,3.4,2.68,.24);k.box(r,'#486352',-4.6,2.55,-9.05,3.13,2.41,.04);
 for(let j=0;j<6;j++)for(let i=0;i<3;i++){k.box(r,j%2?'#d1b578':'#d5d9ba',-5.6+i*.94,3.38-j*.32,-9.018,.36+((j+i)%3)*.11,.035,.016);}
 for(let i=0;i<6;i++){const x=2.8+i*.8;k.box(r,'#718b89',x,2.6,-12-i%3,.7,5.3+i%3,.8);for(let j=0;j<5;j++)k.box(r,'#dad3ac',x,1.1+j*.62,-11.58-i%3,.4,.23,.03);}
 // Clerestory, painted concrete columns and pendant lamps around the open trading floor.
 for(const x of [-7.9,7.9])for(const z of [-8.6,-4,.6,5.2]){
   k.box(r,'#9aa999',x,1.84,z,.39,7.47,.39);
   k.box(r,'#597a6f',x,.64,z,.45,1.12,.45);
   k.box(r,'#c8c5a6',x,5.49,z,.65,.21,.64);
   if(z<5){k.box(r,'#a3b1a3',x,4.48,z+2.28,.16,1.12,4.1);for(let j=0;j<4;j++)k.box(r,'#e2d9b9',x*.986,4.5,z+.63+j*.94,.045,.98,.053);}
 }
 for(const z of [-8.6,-4,.6]){
   k.box(r,'#799389',0,5.75,z,16,.23,.27);
   for(const x of [-4,4]){k.beam(r,ink,[x,5.64,z],[x,5.04,z],.025);
    k.box(r,'#88968a',x,4.95,z,1.57,.12,.28);k.box(r,'#f6e5ad',x,4.87,z,1.48,.044,.20,0,'glow');}
 }
 const striker=k.group(r,1.42,3.8,-8);striker.userData.hinged=true;
 k.beam(striker,ink,[0,0,0],[-1.22,-.92,0],.052);k.ball(striker,'#a5604b',-1.22,-.92,0,.21);
 const flags=[-6,6].map(x=>{const f=k.group(r,x,2.36,1.2);f.userData.hinged=true;
  k.box(f,copper,0,.34,0,.058,.68,.058);k.box(f,'#d8a15e',.22,.54,0,.41,.22,.043);return f;});
 return(c:RelayCourse,end:number)=>{gong.rotation.x=end?.28*Math.sin(end*8)*Math.exp(-end):0;gong.rotation.y=c.carrying?.03:0;
   striker.rotation.x=end?Math.max(0,1.05*Math.sin(end*5))*Math.exp(-end*.74):-.14;
   flags.forEach((flag,i)=>{flag.rotation.z=c.done.has(i+1)?0:-1.06;});};
}
// A whole diorama shares a handful of materials. Batch the fixed furniture in root
// space while leaving spinning instruments and independently moving indicators intact.
function batchFurniture(root:T.Group){
 const batches=new Map<string,T.InstancedMesh[]>();root.updateMatrixWorld(true);
 root.traverse(o=>{
  if(!(o instanceof T.InstancedMesh))return;
  for(let p:T.Object3D|null=o.parent;p;p=p.parent){if(p.userData.hinged)return;if(p===root)break;}
  const key=o.geometry.uuid+'/'+o.material.uuid,group=batches.get(key)??[];
  group.push(o);batches.set(key,group);
 });
 const matrix=new T.Matrix4(),color=new T.Color();
 for(const parts of batches.values()){
  if(parts.length<2)continue;
  const first=parts[0],batch=new T.InstancedMesh(first.geometry,first.material,parts.reduce((n,m)=>n+m.count,0));let index=0;
  batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
  for(const part of parts){
   for(let j=0;j<part.count;j++){part.getMatrixAt(j,matrix);matrix.premultiply(part.matrixWorld);batch.setMatrixAt(index,matrix);
    part.getColorAt(j,color);batch.setColorAt(index++,color);}
   part.removeFromParent();part.dispose();
  }
  root.add(batch);
 }
}
export function buildRelayScene(stage:Stage,c:RelayCourse){
 const {world,top}=deck(stage,c),root=new T.Group();root.name='season-'+c.spec.kind+'-diorama';stage.scene.add(root);
 const white=stage.toon('#fff'),lit=stage.toon('#fff',{emissive:'#f8d398',emissiveIntensity:.23});
 const k=new Kit({toon:white,lit:white,glass:white,glow:lit,lamp:lit},c.spec.kind);
 const kind=c.spec.kind,december=c instanceof DecemberReception?c:null;
 const winter=c instanceof WinterReception?c:null;
 const midwinter=c instanceof MidwinterReception?c:null;
 const yearend=c instanceof YearendReception?c:null;
 const monthend=c instanceof MonthendReception?c:null;
 const newyear=c instanceof NewyearReception?c:null;
 const animateWinter=newyear?buildNewyearVenue(k,root,newyear):monthend?buildMonthendVenue(k,root,monthend):yearend?buildYearendVenue(k,root,yearend):midwinter?buildMidwinterVenue(k,root,midwinter):winter?buildWinterVenue(k,root,winter):null;
 const animateDecember=december?buildDecemberVenue(k,root,december):null;
 const animate=animateDecember||animateWinter?null:kind==='relay'?station(k,root):kind==='brake'||kind==='arcs'?orbital(k,root,kind==='brake'):kind==='shadow'?shadowGarden(k,root):exchange(k,root);
 const halos:T.Group[]=[],dials:T.Group[]=[];
 for(const [i,p] of c.pads.entries()){
   const [x,,z]=p;const marker=k.group(root,x,.16,z-.02);marker.userData.hinged=true;halos.push(marker);k.ring(marker,c.spec.trim,0,0,0,.43,Math.PI/2,0,'lamp');
   const instrument=k.group(root,x,.04,z-.83);dials.push(instrument);
   if(newyear)newyearPad(k,instrument,newyear,i);
   else if(monthend)monthendPad(k,instrument,monthend,i);
   else if(yearend)yearendPad(k,instrument,yearend,i);
   else if(midwinter)midwinterPad(k,instrument,midwinter,i);
   else if(winter)winterPad(k,instrument,winter,i);
   else if(december)decemberPad(k,instrument,december,i);
   else if(kind==='relay'){k.taper(instrument,steel,0,.22,0,.23,.42);dish(k,instrument,.41,0,.56,0);}
   else if(kind==='shadow'){k.cyl(instrument,copper,0,.045,0,.37,.09);k.beam(instrument,brass,[0,.07,0],[.11,.75,-.16],.038);
    for(let j=0;j<7;j++)k.box(instrument,cream,(j-3)*.095,.108,.17,.03,.023,j%3?.08:.14);}
   else if(kind==='ticket'){k.box(instrument,'#8a725c',0,.19,0,.67,.38,.53);k.box(instrument,'#e9dfbb',0,.42,0,.49,.075,.38);k.box(instrument,'#465e62',0,.55,-.19,.51,.28,.08);}
   else {k.taper(instrument,steel,0,.12,0,.30,.24);k.ring(instrument,c.spec.trim,0,.57,0,.29);k.ball(instrument,'#d0cbb7',0,.59,0,.13);}
 }
 const cursor=k.group(root);cursor.userData.hinged=true;k.ring(cursor,'#fff2af',0,.03,0,.55,Math.PI/2,0,'glow');k.ball(cursor,'#ffcf77',0,1,0,.11,.15,.11,'glow');
 const needle=k.group(root,-3.1,.11,-.72);
 if(kind==='brake'||kind==='shadow'){k.box(needle,'#eee2ba',0,0,.62,.11,.08,1.1);
 for(let i=0;i<=12;i++){const a=(i/12-.5)*2.2;k.box(root,i<8?'#8d9d9c':brass,-3.1+Math.sin(a)*1.32,.06,-.72+Math.cos(a)*1.32,.072,.11,.15,a);}}
 needle.userData.hinged=true;if(kind==='ticket')dials[1].userData.hinged=true;
 k.flush();
 // Include the actual small instruments on each pad in the walkable height bake.
 // Large landmarks are outside the board. Light rings and the moving needles are permeable.
 const collision=new T.Group();collision.add(top.clone());for(const d of dials)collision.add(d.clone(true));
 const baked=bakeRegion(stage,{root:collision,x0:-5.55,z0:-7.5,w:11.1,h:15,ground:()=>null,classify:()=>'solid'});
 world.height=baked.height??undefined;batchFurniture(root);
 const cars=kind==='crossing'?[0,1].map(i=>root.getObjectByName('yielding-car-'+i)!):[];
 for(const {name,position:p} of cars)world.boxes.push({name,min:[p.x-.375,.03,p.z-.75],max:[p.x+.375,.87,p.z+.75]});
 const ground=new T.Mesh(new T.PlaneGeometry(145,145),stage.toon(newyearGround[kind]??monthendGround[kind]??yearendGround[kind]??midwinterGround[kind]??decemberGround(kind)??(winter?({shiplink:'#4d8290',starboard:'#52899f',cableway:'#608995',counter:'#9c7961',winterlight:'#afbcc4'}[kind as string]??'#98998b'):null)??(kind==='shadow'?'#8f9d77':kind==='ticket'?'#acac91':kind==='relay'?'#718580':'#465567')));
 ground.position.y=-1.9;ground.rotation.x=-Math.PI/2;stage.add(ground);
 return {world,root,syncCars(sync:(i:number)=>void){
   cars.forEach((car,i)=>{const z=car.position.z,b=world.boxes[i];
    if(Math.abs(b.min[2]+.75-z)<.008)return;
    b.min[2]=z-.75;b.max[2]=z+.75;sync(i);
   });
 },animate(time:number,target:number,end:number){
    animateWinter?.(time,end);animate?.(c,end);animateDecember?.(time,end);
    const yearCue=yearend?.first&&!(yearend.done.has(1)&&yearend.done.has(2))?(yearend.day==='1217'&&yearend.hooks<2?yearend.hook:yearend.day==='1220'&&!yearend.ready?yearend.alignmentSpot:yearend.day==='1221'&&!yearend.token?[0,.09,-.25] as Vec:null):null;
    const p=newyear?.cueSpot??monthend?.cueSpot??yearCue??(midwinter?.day==='1216'&&midwinter.first&&midwinter.socket<2?midwinter.checkpoint:midwinter?.day==='1215'&&midwinter.paired&&!midwinter.seam?[0,.12,-2.1] as Vec:kind==='town'&&december?.order&&december.nextLamp<3?december.lamp:c.pads[target]);
    cursor.visible=!!p&&end===0;if(p){cursor.position.fromArray(p);cursor.position.y+=.12+Math.sin(time*3)*.052;}
    halos.forEach((h,i)=>{h.scale.setScalar(c.done.has(i)?1.20:i===target?1.09+.085*Math.sin(time*4):.85);
      h.position.y=c.done.has(i)?.29:.16;});
    if(kind==='ticket')dials[1].rotation.y=c.carrying?.45:0;
    needle.rotation.y=-1.10+(kind==='brake'?c.brake:c.sweep)*2.2;
 }};
}
export const introEye:Record<string,Vec>={...decemberEyes,...winterEyes,...midwinterEyes,...yearendEyes,...monthendEyes,...newyearEyes,relay:[7.3,4.6,11.1],brake:[6.3,4.65,10.3],arcs:[6.9,5.8,11.2],shadow:[6.9,4.9,11.4],ticket:[6.1,4.3,11.4]};
