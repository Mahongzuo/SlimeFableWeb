import * as T from 'three';
import type {Kit} from './folio-landmarks';
import {sectionMesh} from './december-defense';
import {ivory,brass,steel,slate} from './winter-boards';
import {bark,green} from './yearend-boards';
export const water='#649caa',gold='#dfb979',rust='#a8614d',leaf='#75966a',ink='#425660',plaster='#d5c3a1';
type V=[number,number,number];
/** Original tabletop illustrations and models of the exhibits. */
export function canopyRoof(k:Kit,g:T.Group,x:number,y:number,z:number,w:number,d:number,roof:string){
 for(const s of [-1,1])k.put('box',g,'toon',roof,x,y,z+s*d*.25,w,.14,d*.57,s*.32);
 k.box(g,brass,x,y+d*.089,z,w*1.02,.12,.12);
}
export function pavilion(k:Kit,g:T.Group,x:number,z:number,s:number,color:string){
 const b=k.group(g,x,0,z,0,0,0,s);k.box(b,bark,0,.18,0,2.86,.35,1.69);
 for(const a of [-1,1])for(const d of [-1,1])k.box(b,bark,a*1.18,1.14,d*.61,.13,1.65,.13);
 k.box(b,plaster,0,.71,-.56,2.28,.84,.13);canopyRoof(k,b,0,2.02,0,3.08,1.98,color);return b;
}
export function palm(k:Kit,g:T.Group,x:number,z:number,s:number){
 const c=k.group(g,x,0,z,0,0,-.07,s);k.taper(c,bark,0,1.22,0,.12,2.44);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;
  sectionMesh(k,c,quad=>{const at=(j:number,v:number):V=>{const d=j/4,r=d*1.44,w=.22*Math.sin(d*Math.PI);
   return [r*Math.cos(a)-v*w*Math.sin(a),2.43+.44*Math.sin(d*Math.PI)-d*.37,r*Math.sin(a)+v*w*Math.cos(a)];};
   for(let j=0;j<4;j++)quad(at(j,-1),at(j+1,-1),at(j+1,1),at(j,1),i%2?green:leaf);});}
}
export function panda(k:Kit,g:T.Group){
 const fur='#e5dfcb',black='#39413f';k.ball(g,fur,0,.57,0,.49,.62,.40);
 k.ball(g,black,0,.81,.02,.49,.24,.40);k.ball(g,fur,0,1.15,.11,.43,.39,.35);
 for(const d of [-1,1]){k.ball(g,black,d*.32,1.44,.02,.14);k.ball(g,black,d*.18,1.21,.395,.119,.130,.054);
 k.ball(g,ivory,d*.16,1.24,.448,.036);k.ball(g,black,d*.32,.20,.21,.18,.24,.22);k.ball(g,black,d*.43,.68,.23,.15,.30,.16);}
 k.ball(g,fur,0,1.06,.43,.16,.11,.105);k.ball(g,black,0,1.095,.526,.066,.040,.033);
}
export function bamboo(k:Kit,g:T.Group,x:number,z:number,h:number){
 k.cyl(g,'#8d9e63',x,h*.5,z,.067,h);for(let j=1;j<5;j++){const y=j*h*.17;k.cyl(g,'#587653',x,y,z,.077,.045);
  const d=j%2?1:-1;k.beam(g,green,[x,y,z],[x+d*.43,y+.26,z+.10],.023);k.put('ball',g,'toon',leaf,x+d*.42,y+.24,z+.11,.25,.054,.075,0,0,d*.43);}
}
export function bridge(k:Kit,g:T.Group,x:number,y:number,z:number,w:number,steelColor:string){
 k.box(g,'#b5a991',x,y,z,w,.18,1.08);
 for(const s of [-1,1]){const side=z+s*.51;k.box(g,steelColor,x,y+.64,side,w,.10,.087);
  for(let i=0;i<10;i++){const a=x-w/2+i*w/10,b=a+w/10;
   k.beam(g,steelColor,[a,y+(i%2?.60:.09),side],[b,y+(i%2?.09:.60),side],.039);}}
 for(const d of [-1,1])k.taper(g,'#aa9e87',x+d*w*.31,y*.49,z,.34,y);
}
export function flag(k:Kit,g:T.Group,color:string){
 k.beam(g,steel,[0,0,0],[0,1,0],.029);
 sectionMesh(k,g,quad=>quad([0,.97,0],[.67,.89,.035],[.60,.48,.08],[0,.61,0],color));
}
export function floatplane(k:Kit,g:T.Group){
 k.ball(g,ivory,0,.25,0,1.48,.24,.34);k.ball(g,water,-.13,.14,0,1.30,.18,.38);
 k.put('box',g,'toon',ivory,-.08,.53,0,.50,.085,3.65);
 for(const s of [-1,1]){k.box(g,rust,-.08,.535,s*1.66,.49,.09,.21);k.ball(g,'#6b898d',.86,.39,.13*s,.32,.14,.15);
  k.beam(g,steel,[.12,.49,s*1.26],[-.04,.05,s*1.34],.041);k.ball(g,ivory,-.10,0,s*1.34,.37,.106,.126);
  for(let i=0;i<2;i++){const z=s*(.57+i*.48);k.ball(g,steel,.05,.50,z,.31,.15,.14);k.put('box',g,'toon',slate,.34,.50,z,.05,.48,.069,.31);}}
 k.put('box',g,'toon',rust,-1.16,.64,0,.39,.77,.11,0,0,-.24);k.box(g,ivory,-1.03,.44,0,.41,.064,.99);
}
export function lantern(k:Kit,g:T.Group,x:number,y:number,z:number,s:number){
 k.cyl(g,green,x,y+s*.74,z,s*.065,s*1.48);
 for(let i=0;i<5;i++){const a=i*1.2566;
  k.put('ball',g,'toon',i%2?'#ecd9ad':'#f5e7c2',x+s*.16*Math.cos(a),y+s*1.61,z+s*.16*Math.sin(a),s*.105,s*.22,s*.11,Math.sin(a)*.53,0,-Math.cos(a)*.53);}
}
export function train(k:Kit,g:T.Group,color:string){
 k.box(g,ivory,0,.34,0,1.61,.43,.55);k.ball(g,ivory,.76,.29,0,.49,.23,.27);
 k.box(g,color,-.04,.22,0,1.74,.085,.575);for(const z of [-.284,.284])for(let i=0;i<7;i++)k.box(g,ink,-.65+i*.20,.42,z,.142,.10,.022);
 k.ball(g,ink,.93,.413,0,.17,.058,.22);
}
export function track(k:Kit,g:T.Group,z:number,w:number){
 k.box(g,'#9d9987',0,.065,z,w,.13,.58);
 for(const s of [-1,1])k.box(g,steel,0,.154,z+s*.17,w,.057,.049);
 for(let i=0;i<20;i++)k.box(g,bark,-w*.46+i*w*.048,.145,z,.063,.035,.47);
}
export function photo(k:Kit,g:T.Group,x:number,y:number,z:number,variant:number){
 const frame=k.group(g,x,y,z);k.box(frame,bark,0,0,0,2.11,1.72,.13);
 const cn=document.createElement('canvas');cn.width=320;cn.height=240;const ctx=cn.getContext('2d')!;
 ctx.fillStyle='#334458';ctx.fillRect(0,0,320,240);ctx.fillStyle='#ded9bd';
 for(let i=0;i<25;i++)ctx.fillRect(i*71%319,i*41%109,2,2);
 ctx.fillStyle='#afa894';ctx.beginPath();ctx.moveTo(0,122);for(let x=0;x<=320;x+=4)ctx.lineTo(x,121+16*Math.sin(x*.017+variant)+10*Math.sin(x*.064));ctx.lineTo(320,240);ctx.lineTo(0,240);ctx.fill();
 for(let i=0;i<16;i++){ctx.fillStyle='#8a8a80';ctx.beginPath();ctx.ellipse(i*41%320,164+i*43%68,5+i%8,2+i%3,0,0,6.29);ctx.fill();}
 ctx.fillStyle='#dbc08c';ctx.fillRect(121,106,66,26);
 if(variant){ctx.fillStyle='#718780';ctx.fillRect(87,100,34,15);ctx.fillRect(187,100,34,15);for(const x of [124,150,177]){ctx.beginPath();ctx.arc(x,138,9,0,6.29);ctx.fill();}}
 else{ctx.strokeStyle='#dfceb1';ctx.lineWidth=5;for(const x of [101,201]){ctx.beginPath();ctx.moveTo(154,122);ctx.lineTo(x,154);ctx.lineTo(x-8,155);ctx.stroke();}}
 const tex=new T.CanvasTexture(cn);tex.colorSpace=T.SRGBColorSpace;
 const art=new T.Mesh(new T.PlaneGeometry(1.94,1.49),new T.MeshBasicMaterial({map:tex}));art.position.z=.080;frame.add(art);return frame;
}

