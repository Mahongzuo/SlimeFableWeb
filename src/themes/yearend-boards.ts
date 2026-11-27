import type * as T from 'three';
import type {Kit} from './folio-landmarks';
import {sectionMesh} from './december-defense';
import {brass,ivory,slate,steel} from './winter-boards';
export const bark='#815e49',green='#516f66',copper='#a87049',gold='#dfc188';
export function desk(k:Kit,g:T.Group,x:number,z:number,w:number,h:number,d:number){
 k.box(g,bark,x,h,z,w,.16,d);k.box(g,'#9f7958',x,h-.17,z,w-.13,.18,d-.14);
 for(const sx of [-1,1])for(const sz of [-1,1])k.taper(g,bark,x+sx*(w/2-.18),h*.45,z+sz*(d/2-.15),.115,h*.85,true);
}
export function folio(k:Kit,g:T.Group,color:string,w=1.25,d=.91){
 k.box(g,color,0,.037,0,w,.074,d);k.box(g,ivory,0,.106,-.005,w*.95,.060,d*.94);
 for(let i=0;i<5;i++)k.box(g,'#8c8977',-.046*w,.144,-.28*d+i*d*.14,w*(.51+i%3*.086),.011,.017);
 const cover=k.group(g,-w*.50,.152,0);k.box(cover,color,w*.50,.022,0,w,.044,d);
 k.box(cover,brass,w*.56,.051,-.08*d,.33*w,.012,.27*d);return cover;
}
export function canopy(k:Kit,g:T.Group,r:number){
 const point=(i:number,h:number):[number,number,number]=>{const a=i*Math.PI/12,ring=.18+.82*h;
   return [r*ring*Math.cos(a),r*(.72*(1-h*h)-.073*(i%2)*h),r*ring*Math.sin(a)];};
 sectionMesh(k,g,quad=>{for(let i=0;i<24;i++)for(let j=0;j<4;j++)quad(point(i,j/4),point(i,(j+1)/4),point(i+1,(j+1)/4),point(i+1,j/4),i%4<2?'#c8644b':'#efe1bd');});
 for(let i=0;i<24;i+=2)k.beam(g,ivory,point(i,1),[.10*Math.cos(i*Math.PI/12),-1.50*r,.10*Math.sin(i*Math.PI/12)],.015);
}
export function wheel(k:Kit,g:T.Group,r:number,color:string){
 k.ring(g,color,0,0,0,r,0,0,'toon',true);for(let i=0;i<8;i++){
  const a=i*Math.PI/4;k.beam(g,color,[0,0,0],[r*.93*Math.cos(a),r*.93*Math.sin(a),0],r*.052);}
 k.put('round',g,'toon',brass,0,0,0,r*.15,r*.27,r*.15,Math.PI/2);
}
export function satellite(k:Kit,g:T.Group,x:number,y:number,z:number,s:number){
 k.box(g,brass,x,y,z,s*.59,s*.56,s*.46);
 for(const d of [-1,1]){k.put('box',g,'toon','#759dc0',x+d*s*.66,y,z,s*.59,s*.066,s*.51,.40);
 for(let n=0;n<3;n++)k.put('box',g,'toon','#b4c2c4',x+d*s*(.44+.18*n),y+s*.051,z,s*.017,s*.020,s*.47,.40);}
 k.ball(g,ivory,x,y+s*.30,z,s*.16,s*.094,s*.15);
}
export function turbine(k:Kit,g:T.Group,x:number,z:number,r:number){
 k.cyl(g,'#739d9d',x,.038,z,r*1.10,.073);k.cyl(g,brass,x,.12,z,r*.25,.13);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;
  k.put('box',g,'toon',steel,x+r*.55*Math.cos(a),.135,z+r*.55*Math.sin(a),r*.56,.058,r*.20,-.22,-a-.41);}
}

