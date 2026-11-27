import * as T from 'three';
import type {Kit} from './folio-landmarks';
import {sectionMesh,solarWing} from './december-defense';

export const ivory='#e8e2ca',slate='#425666',steel='#83959b',brass='#c59d68',red='#a95749',blue='#527994';
export const unit=(n:number)=>Math.max(0,Math.min(1,n));
export function tripod(k:Kit,g:T.Group,x:number,z:number,h:number,color:string){
 for(let n=0;n<3;n++){const a=n*Math.PI*2/3;
   k.beam(g,color,[x+.32*h*Math.cos(a),.04,z+.32*h*Math.sin(a)],[x,h,z],.035*h);}
 k.cyl(g,slate,x,h,z,.15*h,.12*h);
}
export function dish(k:Kit,g:T.Group,x:number,z:number,scale:number){
 const base=k.group(g,x,0,z,0,0,0,scale);k.taper(base,steel,0,.29,0,.54,.58);
 const head=k.group(base,0,.69,0);const bowl=k.group(head,0,0,0,.62);
 for(let j=0;j<14;j++){const a=j*2*Math.PI/14;
   sectionStrip(a,j);}
 function sectionStrip(a:number,j:number){
   const v=(angle:number,r:number):[number,number,number]=>[Math.cos(angle)*r,.46*r*r,Math.sin(angle)*r];
   // Only every other seam has a raised rib; the continuous reflector is skinned below.
   if(j%2===0){k.beam(bowl,steel,v(a,.08),v(a,.64),.022);k.beam(bowl,steel,v(a,.64),v(a,1),.022);}
 }
 sectionMesh(k,bowl,quad=>{
   const v=(a:number,r:number):[number,number,number]=>[Math.cos(a)*r,.46*r*r,Math.sin(a)*r];
   for(let j=0;j<28;j++)for(let h=0;h<4;h++){const a=j*Math.PI/14,b=(j+1)*Math.PI/14;
     quad(v(a,h/4),v(a,(h+1)/4),v(b,(h+1)/4),v(b,h/4),j%7?ivory:'#d9ceb4');}
 });
 for(let i=0;i<3;i++){const a=2*i*Math.PI/3;k.beam(bowl,slate,[.94*Math.cos(a),.42,.94*Math.sin(a)],[0,.93,0],.023);}
 k.ball(bowl,brass,0,.93,0,.10);return head;
}
export function spacecraft(k:Kit,g:T.Group,variant:'relay'|'observatory'|'weather'){
 const body=variant==='weather'?'#b9abab':variant==='relay'?'#c4a574':'#a89a78';
 k.box(g,body,0,.01,0,.89,.74,.77);
 for(let i=0;i<6;i++)k.box(g,ivory,-.35+i*.14,-.11,.397,.064,.08,.024);
 if(variant==='observatory'){
   k.ball(g,ivory,0,.40,0,.49,.32,.47);
   for(let i=0;i<8;i++){const a=i*.785;k.ball(g,slate,.39*Math.cos(a),.48,.39*Math.sin(a),.09,.09,.09);}
 }else{
   k.put('round',g,'toon',slate,0,.03,.48,.23,.17,.23,Math.PI/2);
   k.ball(g,'#a4d1d6',0,.03,.58,.15,.15,.036,'lamp');
 }
 for(const s of [-1,1]){k.beam(g,brass,[s*.45,.10,0],[s*.71,.10,0],.037);solarWing(k,g,s*1.22,.10,0,1.11,.72);}
}
export function globe(k:Kit,g:T.Group,r:number){
 k.ball(g,'#537f94',0,0,0,r);
 sectionMesh(k,g,quad=>{
   const point=(lat:number,lon:number):[number,number,number]=>{
     const d=r*1.009;return[d*Math.cos(lat)*Math.cos(lon),d*Math.sin(lat),d*Math.cos(lat)*Math.sin(lon)];};
   for(let i=0;i<48;i++)for(let j=0;j<22;j++){
     const lat=-1.49+j*.135,lon=i*Math.PI/24;
     const field=Math.sin(lon*2+lat*3)+.72*Math.cos(lon*3.9-lat)+.36*Math.sin(6*lat-2*lon);
     if(field>.31||Math.abs(lat)>1.30)quad(point(lat,lon),point(lat+.135,lon),point(lat+.135,lon+Math.PI/24),point(lat,lon+Math.PI/24),Math.abs(lat)>1.30?'#d8ddc9':field>1.39?'#b3b284':'#83a387');
   }
 });
}
export function page(k:Kit,g:T.Group,x:number,y:number,z:number,w:number,h:number,color:string){
 k.box(g,color,x,y,z,w,.045,h);
 for(let i=0;i<6;i++)k.box(g,'#9b967d',x-.08*w,y+.030,z-h*.28+i*h*.100,w*(.49+(i%3)*.105),.010,.016);
}

