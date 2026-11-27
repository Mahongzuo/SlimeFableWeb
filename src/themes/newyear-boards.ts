import * as T from 'three';
import type {Kit} from './folio-landmarks';
import {sectionMesh} from './december-defense';
import {ivory,brass,steel,slate} from './winter-boards';
import {bark,green} from './yearend-boards';
export const ink='#425164',azure='#81afbb',copper='#b78260',frost='#b6d4d3',willow='#88a178';
export type V=[number,number,number];
export function ferry(k:Kit,g:T.Group,color:string){
 sectionMesh(k,g,quad=>{
   const p=(i:number,h:number,s:number):V=>{const u=i/16,width=(.31+.14*h)*Math.pow(Math.sin(u*Math.PI),.39);
     return [-1.55+3.10*u,h*.36+.049*Math.abs(u-.5),s*width];};
   for(let i=0;i<16;i++){for(const d of [-1,1])quad(p(i,0,d),p(i+1,0,d),p(i+1,1,d),p(i,1,d),color);
     quad(p(i,1,-1),p(i+1,1,-1),p(i+1,1,1),p(i,1,1),'#d5c6a6');}
 });
 k.box(g,ivory,-.10,.57,0,2.23,.39,.65);k.box(g,color,-.13,.80,0,2.32,.074,.75);
 k.box(g,ivory,.61,.94,0,.66,.22,.54);k.box(g,color,.62,1.08,0,.77,.071,.62);
 k.taper(g,slate,-.65,.96,0,.115,.29);for(const s of [-1,1]){
   for(let j=0;j<8;j++)k.box(g,ink,-.98+j*.24,.62,s*.338,.155,.113,.026);
   for(let j=0;j<3;j++)k.box(g,ink,.39+j*.19,.96,s*.283,.142,.079,.025);
   for(const x of [-1.07,-.47,.28,.95])k.ring(g,'#66594b',x,.34,.39*s,.086);
 }
}
export function pier(k:Kit,g:T.Group,s:number){
 k.box(g,'#a6957c',0,.22,0,s,.43,1.04);
 for(let j=0;j<13;j++)k.box(g,j%2?'#c3ad87':'#b7a080',-s*.46+j*s*.077,.46,0,s*.070,.055,.96);
 for(const x of [-s*.36,s*.36]){k.taper(g,steel,x,.53,.45,.081,.20);k.ball(g,slate,x,.64,.45,.095,.049,.092);}
}
export function dots(k:Kit,g:T.Group,x:number,y:number,z:number,n:number,w:number,color:string){
 for(let i=0;i<6;i++){const px=x+(Math.floor(i/3)-.5)*w*.53,pz=z+(i%3-1)*w*.45;
   if(n>>i&1)k.ball(g,color,px,y,pz,w*.13,w*.11,w*.13);else k.cyl(g,'#a99c83',px,y-.028,pz,w*.094,.018);}
}
export function frame(k:Kit,g:T.Group,w:number,h:number,color:string,bar=.085){
 for(const s of [-1,1]){k.box(g,color,s*(w-bar)/2,0,0,bar,h,.10);k.box(g,color,0,s*(h-bar)/2,0,w-2*bar,bar,.10);}
}
export function huddle(k:Kit,g:T.Group,x:number,z:number,s:number,kind:number){
 const h=s*(.27+kind*.12);k.box(g,'#8ca4ac',x,h*.49,z,s*.74,h,s*.68);
 k.box(g,'#d1dfd9',x,h+.04,z,s*.84,.08,s*.78);
 const rows=kind>1?2:1;
 for(let i=0;i<3;i++)for(let j=0;j<rows;j++){
   const px=x+(i-1)*s*.21,py=.34+h*.63*(j+1)/(rows+1);
   k.box(g,(i+j+kind)%3?'#6c8892':'#d4b484',px,py,z+s*.348,s*.128,.25,.046);
 }
 const roof=k.group(g,x,h+.08,z);
 for(const d of [-1,1])k.put('box',roof,'toon','#bcced0',0,.14,d*s*.188,s*.85,.10,s*.41,d*.24);
 k.box(g,'#90a7aa',x+s*.23,h+.32,z-.22,.24,.59,.27);
}
export function curtain(k:Kit,g:T.Group,s:number,reflection=false){
 const cold=s<0?(reflection?['#557f89','#71938c','#85a295']:['#5aa399','#8bcd9d','#bad396']):
   (reflection?['#627b91','#847b9b','#9b92ab']:['#807da5','#b79dcc','#d3b3d3']);
 sectionMesh(k,g,quad=>{const p=(j:number,h:number):V=>{const u=j/24,w=u*2.28,base=.14+u*.64+.27*Math.sin(u*8.1)+.13*Math.sin(u*15);
   return [s*(.033+w),base+h*(.32+.77*Math.sin(u*Math.PI)+.10*Math.cos(j*.66)),.19*Math.sin(u*9.3)+.026*h];};
   for(let j=0;j<24;j++)for(let i=0;i<3;i++)quad(p(j,i/3),p(j+1,i/3),p(j+1,(i+1)/3),p(j,(i+1)/3),cold[(j%7===0?2:i)]);
 });
}
export function sprig(k:Kit,g:T.Group,a:V,b:V,index:number){
 k.beam(g,index%2?'#6e8660':'#859b68',a,b,.046);const d=index%2?1:-1;
 k.put('ball',g,'toon',index%3?'#92ab71':'#b1b47b',b[0]+d*.073,b[1]+.049,b[2],.135,.053,.053,0,0,d*.47);
}

