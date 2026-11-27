import type * as T from 'three';
import type {Kit} from './folio-landmarks';
import {sectionMesh,solarWing} from './december-defense';
import {ivory,brass,slate,steel} from './winter-boards';
type P=[number,number,number];
/** A winding, continuous water surface bounded by two different banks. Shared edge vertices prevent overlap at bends. */
export function channel(k:Kit,g:T.Group,path:readonly P[],width:number,water:string,bank:string){
 const edges=path.map(([x,y,z],i)=>{
    const prev=path[Math.max(0,i-1)],next=path[Math.min(path.length-1,i+1)],dx=next[0]-prev[0],dz=next[2]-prev[2],length=Math.hypot(dx,dz)||1;
    return (d:number,h:number):P=>[x-dz/length*d,y+h,z+dx/length*d];});
 sectionMesh(k,g,quad=>{for(let i=1;i<edges.length;i++){
    const a=edges[i-1],b=edges[i],w=width/2;
    quad(a(-w,0),a(w,0),b(w,0),b(-w,0),water);
    for(const s of [-1,1]){
      quad(a(w*s,0),a((w+.13)*s,.19),b((w+.13)*s,.19),b(w*s,0),bank);
      quad(a((w+.13)*s,.19),a((w+.32)*s,.19),b((w+.32)*s,.19),b((w+.13)*s,.19),'#c5b99a');
      quad(a((w+.32)*s,.19),a((w+.32)*s,-.12),b((w+.32)*s,-.12),b((w+.32)*s,.19),'#978b74');
    }
 }});
}
export function winch(k:Kit,g:T.Group){
 for(const x of [-.34,.34])k.box(g,steel,x,.28,0,.09,.56,.38);
 k.put('round',g,'toon',brass,0,.36,0,.22,.62,.22,0,0,Math.PI/2);
 for(let i=0;i<6;i++)k.put('round',g,'toon','#827761',-.23+i*.09,.36,0,.23,.03,.23,0,0,Math.PI/2);
 const handle=k.group(g,.43,.35,0);k.beam(handle,slate,[0,0,0],[0,.28,.11],.048);k.beam(handle,brass,[0,.28,.11],[.18,.28,.11],.044);return handle;
}
export function lander(k:Kit,g:T.Group){
 k.taper(g,'#a98c5d',0,.75,0,.70,.56);k.box(g,'#caaa6a',0,1.19,0,1.40,.59,1.09);k.cyl(g,steel,0,.39,0,.29,.22);
 for(const s of [-1,1])for(const v of [-1,1]){
   k.beam(g,brass,[s*.61,1.04,v*.46],[s*.98,.17,v*.74],.053);
   k.beam(g,steel,[s*.47,.6,v*.38],[s*.88,.30,v*.66],.036);
   k.cyl(g,'#c9b487',s*.99,.11,v*.76,.22,.14);}
 k.cyl(g,'#d6c99b',.26,1.61,.17,.28,.24);
 solarWing(k,g,-1.15,1.52,-.11,1.03,1.05);
 k.beam(g,slate,[.42,1.42,-.12],[.55,2.04,-.10],.032);
 k.ball(g,ivory,.55,2.07,-.10,.11,.08,.10);
}
export function rover(k:Kit,g:T.Group){
 k.box(g,'#bd9862',0,.41,0,.90,.42,.68);
 for(const s of [-1,1]){
   for(const x of [-.41,0,.41]){k.put('round',g,'toon',slate,x,.18,s*.40,.18,.13,.18,Math.PI/2);
     k.put('round',g,'toon',brass,x,.18,s*.477,.094,.024,.094,Math.PI/2);}
   solarWing(k,g,0,.72,s*.64,1.05,.54);}
 k.cyl(g,ivory,.31,.87,.05,.041,.50);k.box(g,slate,.31,1.16,.05,.29,.20,.27);
 for(const z of [-.01,.11])k.ball(g,'#a9d7dc',.459,1.17,z,.022,.049,.043,'lamp');
}
export function asteroid(k:Kit,g:T.Group){
 // A single tapered belt connects two lobes. The albedo changes with individual ridges.
 const rings=[.01,.59,.94,1.05,.81,.59,.65,.76,.57,.02];
 const v=(band:number,n:number):P=>{const a=n*Math.PI/8,r=rings[band]*(1+.09*Math.cos(3*a+.42*band)+.06*Math.sin(5*a+band));
   return [-1.75+.39*band,.28*Math.sin(band*.65)+Math.sin(a)*r,Math.cos(a)*r*.82];};
 sectionMesh(k,g,quad=>{for(let j=0;j<rings.length-1;j++)for(let n=0;n<16;n++){
   const colors=['#b5a18c','#9c8e82','#a99a89','#817e79','#bcad97'];
   quad(v(j,n),v(j+1,n),v(j+1,n+1),v(j,n+1),colors[(j*3+n+(n%3)*j)%5]);}});
}
export function karst(k:Kit,g:T.Group,x:number,z:number,r:number,h:number,shade:number){
 const v=(j:number,n:number):P=>{const a=n*Math.PI/5,ring=[1,.84,.68,.46,.03][j]*(1+.14*Math.sin(3*a+shade));
   return [x+r*ring*Math.cos(a)+j*.055,h*j/4+(j===0||j===4?0:.09*Math.cos(4*a+j)),z+r*ring*.74*Math.sin(a)];};
 sectionMesh(k,g,quad=>{for(let j=0;j<4;j++)for(let n=0;n<10;n++){
   const colors=j<2?['#92987c','#a7ac8c','#8b9581']:['#799875','#97a57e','#718c73'];
   quad(v(j,n),v(j,n+1),v(j+1,n+1),v(j+1,n),colors[(n+j+shade)%3]);}});
}

