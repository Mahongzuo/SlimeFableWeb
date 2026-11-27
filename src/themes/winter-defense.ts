import * as T from 'three';
import type {Kit} from './folio-landmarks';
import type {JanuaryDefense} from '../templates/january-defense';
import type {WinterDay} from '../templates/winter-defense';
import {sectionMesh} from './december-defense';
import {tripod,dish,spacecraft,globe,ivory,slate,steel,brass,red,unit} from './winter-boards';

export const winterPalette={
 '1207':['#536f7b','#ded3ac','#74928b','#b9c3a7','#ad8557','#e7c17d'],
 '1208':['#6093aa','#e9dfc7','#99b4b4','#d3d7c3','#9b735a','#f5d08d'],
 '1209':['#65899a','#f4d1ac','#9dafa8','#b9b8a0','#a46656','#ffd091'],
 '1210':['#273447','#72869a','#626f83','#99a8ae','#b19064','#d9ba83'],
 '1211':['#516e80','#a4c4cb','#7e9a9e','#a9baac','#668492','#c8dfa9'],
} as const;
function summit(k:Kit,scene:T.Group,x:number,z:number,h:number,w:number){
 sectionMesh(k,scene,quad=>{
   const sectors=17,heights=[0,.21,.43,.63,.82,1];
   const v=(i:number,level:number):[number,number,number]=>{
     const a=i*2*Math.PI/sectors,t=heights[level],ridge=(i%sectors)%2?.78:1.03;
     const depth=(1-t)*ridge*(1+.21*Math.cos(a*3)+.08*Math.sin(a*4));
     const snowline=t*(1-t)*(.40*Math.sin(3*a+.5)+.18*Math.cos(a*5));
     return [x+w*depth*Math.cos(a)+t*.47+.16*Math.sin(2.8*t),h*(t+snowline),z+depth*w*.65*Math.sin(a)-t*.18];};
   const snow=['#d8e4df','#b3c8ca','#f1e9cf','#a4bbc0'];
   const rock=['#849097','#738896','#a79787','#94a4a0'];
   for(let n=0;n<sectors;n++)for(let j=0;j<5;j++){
     const a=v(n,j),b=v(n+1,j),c=v(n+1,j+1),d=v(n,j+1),grade=(n*3+j)%4;
     const covered=j>=3||j===2&&n%4===1||j===1&&n%7===2;
     quad(a,b,c,c,covered?snow[grade]:rock[grade]);quad(a,c,d,d,j>=3||j===2&&n%3!==0?snow[(grade+1)%4]:rock[(grade+1)%4]);
   }
 });
}
function jet(k:Kit,scene:T.Group){
 k.ball(scene,ivory,0,.50,0,1.87,.31,.32);
 for(let i=0;i<12;i++)k.ball(scene,'#547a8b',-1.20+i*.20,.58,.275,.055,.065,.030);
 k.ball(scene,slate,1.43,.58,.11,.21,.085,.19);
 sectionMesh(k,scene,quad=>{for(const s of [-1,1]){
   const z=s*1.71;quad([.32,.49,.20*s],[-.51,.49,.29*s],[-1.11,.62,z],[-.80,.66,z],ivory);
   quad([-1.25,.61,.14*s],[-1.66,.56,.16*s],[-1.90,.66,.77*s],[-1.59,.70,.72*s],red);}
   quad([-1.86,.51,.02],[-1.28,.64,.02],[-1.61,1.27,.02],[-1.83,1.33,.02],red);});
 for(const s of [-1,1])k.put('round',scene,'toon',steel,-.40,.33,s*.79,.12,.46,.12,0,0,Math.PI/2);
 for(const x of [-.48,1.06]){k.cyl(scene,slate,x,.205,0,.035,.26);k.put('round',scene,'toon',slate,x,.097,0,.094,.22,.094,Math.PI/2);}
}
function truck(k:Kit,g:T.Group,x:number,z:number){
 k.box(g,red,x,.40,z,1.22,.60,.68);k.box(g,ivory,x+.41,.83,z,.43,.27,.61);
 k.box(g,slate,x+.42,.86,z+.316,.28,.13,.026);
 for(const dx of [-.40,.41])for(const dz of [-.34,.34])k.put('round',g,'toon',slate,x+dx,.19,z+dz,.17,.12,.17,Math.PI/2);
}
export function buildWinterDefense(k:Kit,root:T.Group,game:JanuaryDefense,day:WinterDay){
 const c=game.control!,set=k.group(root,0,.03,-4.64),desk=k.group(root,1.92,.035,3.64);
 const hero=k.group(set);hero.name='winter-finale';
 let motion:(t:number,p:number,f:number)=>void;
 if(day==='1207'){
   const east=dish(k,set,-4.9,.13,1.55),west=dish(k,set,4.67,.03,1.40);
   const map=k.group(set,0,.66,-.65,-.33);k.box(map,slate,0,1.0,0,4.51,2.15,.22);
   for(let r=0;r<7;r++)for(let j=0;j<14;j++){const a=Math.sin(r*.93+j*.64)+Math.cos(j*.70-r*.58);
     k.box(map,a>.75?'#8daa79':a<-.5?'#719698':'#aeaf81',-1.97+j*.305,.124+r*.288,.135,.29,.27,.042);}
   spacecraft(k,hero,'relay');const knob=dish(k,desk,0,0,.73);
   for(const x of [-3.48,3.45]){k.box(set,steel,x,.46,-.16,1.07,.92,.89);for(let j=0;j<5;j++)k.box(set,slate,x-.41+j*.19,.46,.30,.082,.60,.024);}
   motion=(t,p,f)=>{east.rotation.y=-.48+.24*Math.sin(t*.78);west.rotation.y=.65-c.side*.36;knob.rotation.y=c.side?-.57:.57;
     hero.position.set(-1.92+3.65*p,2.88+Math.sin(p*2.82)*.45+unit(f)*.67,-.36);hero.rotation.y=.27+t*.12;};
 }else if(day==='1208'){
   summit(k,set,-4.27,-.91,3.20,3.14);summit(k,set,.12,-.76,4.08,3.62);summit(k,set,4.65,-.91,2.70,2.73);
   const scopes=[-3.72,3.81].map(x=>{tripod(k,set,x,1.11,1.25,brass);const n=k.group(set,x,1.30,1.11);k.put('round',n,'toon',ivory,0,.04,0,.14,.71,.14,0,0,Math.PI/2);
     k.box(n,red,0,-.04,0,.26,.33,.27);return n;});
   for(let i=0;i<11;i++){const x=-4.39+i*.80;k.rock(set,'#d6ddcf',x,.13,1.02+.20*Math.sin(i),.38,.13+i%3*.045,.18,i);}
   const post=k.group(hero,.59,.0,-.77);tripod(k,post,0,0,.52,red);k.cyl(post,red,0,.65,0,.04,.39);k.ball(post,ivory,0,.88,0,.135,.084,.135);
   tripod(k,desk,0,0,.92,brass);const head=k.group(desk,0,.99,0);k.box(head,red,0,0,0,.56,.38,.35);k.put('round',head,'toon',ivory,0,.13,0,.11,.84,.11,0,0,Math.PI/2);
   motion=(t,p,f)=>{hero.position.y=3.28+.29*p+.45*unit(f);scopes.forEach((v,i)=>v.rotation.y=(i?-.37:.28)+(c.focus%2?.38:-.34));head.rotation.y=c.focus%2?.49:-.44;};
 }else if(day==='1209'){
   jet(k,hero);hero.scale.setScalar(1.39);k.box(set,'#878d8b',0,.025,.15,15,.05,2.28);
   for(let j=0;j<17;j++)k.box(set,'#e0d8b4',-6.95+j*.86,.061,.15,.51,.015,.082);
   for(const s of [-1,1])truck(k,set,3.10+s*.12,.15+s*1.53);
   const arcs=k.group(set,3.13,.04,.13);
   for(const s of [-1,1])for(let n=0;n<16;n++){const a=n/16,b=(n+1)/16;
     k.beam(arcs,n%3?'#a3d6d7':'#d1e8df',[a*.25,1.01+2.04*Math.sin(a*1.48),s*1.47*(1-a)],[b*.25,1.01+2.04*Math.sin(b*1.48),s*1.47*(1-b)],.045,'lamp');}
   k.box(set,steel,-4.86,.83,-1.68,2.99,1.65,.73);
   for(let i=0;i<8;i++)k.box(set,slate,-6.09+i*.34,.96,-1.30,.24,.28,.025);
   truck(k,desk,0,0);
   motion=(t,p,f)=>{hero.position.set(-4.78+p*6.8+unit(f*.8)*2.19,.067,.16);arcs.visible=c.active>0||f>0;arcs.scale.y=.96+.035*Math.sin(t*8);};
 }else if(day==='1210'){
   const earth=k.group(set,0,2.11,0);globe(k,earth,1.65);k.ring(set,brass,0,2.08,0,3.38,1.18,.12);
   const orbit=k.group(hero,0,2.10,0,.25);for(const s of [-1,1]){const sat=k.group(orbit,s*3.4,0,0,0,0,0,.88);spacecraft(k,sat,'observatory');}
   const flash=k.group(set,-.35,3.67,-.80);
   for(let ray=0;ray<8;ray++){const a=ray*Math.PI/4;
     k.beam(flash,'#ffe5a0',[.12*Math.cos(a),.12*Math.sin(a),0],[.45*Math.cos(a),.45*Math.sin(a),0],.028,'lamp');}
   for(const x of [-5.88,5.9])dish(k,set,x,.08,.84);
   k.box(desk,slate,0,.32,0,2.60,.64,.88);
   for(let i=0;i<2;i++){k.box(desk,steel,-.64+i*1.27,.72,0,1.13,.16,.71);
     for(let j=0;j<9;j++)k.cyl(desk,j%3?brass:ivory,-1.11+i*1.27+j*.105,.82,.15,.033,.043);}
   motion=(t,p,f)=>{flash.visible=f>0;flash.scale.setScalar(.63+.39*unit(f)+.08*Math.sin(t*4));earth.rotation.y=t*.10;orbit.rotation.y=.25+p*1.65+c.side*.39;hero.rotation.z=.14*unit(f)+.028*Math.sin(t);};
 }else{
   const wall=k.group(set,-1.25,.21,-.16,-.13);k.box(wall,slate,0,1.60,0,7.23,3.23,.36);
   for(let j=0;j<28;j++)for(let i=0;i<13;i++){const x=(j-13.5)/13,y=(i-6)/5.9,a=Math.atan2(y,x),r=Math.hypot(x,y),d=Math.sin(17*r-3*a);
     const col=r>.95?'#739394':d>.48?'#dbdcc2':d>-.38?'#a9c0ac':'#739b9b';
     k.box(wall,col,x*3.31,1.60+y*1.37,.207,.24,.214,.047);}
   const scan=k.group(wall);k.box(scan,'#f0d18f',0,1.60,.247,.047,2.89,.025,0,'lamp');
   spacecraft(k,hero,'weather');const bolt=k.group(wall);bolt.name='weather-lightning';k.beam(bolt,'#ffe090',[-.62,2.54,.27],[.34,1.64,.27],.048,'lamp');
   k.beam(bolt,'#ffe090',[.34,1.64,.27],[-.03,1.60,.27],.048,'lamp');k.beam(bolt,'#ffe090',[-.03,1.60,.27],[.75,.60,.27],.048,'lamp');
   const receiver=dish(k,desk,-.20,0,.88);
   motion=(t,p,f)=>{hero.position.set(4.27,2.36+.23*Math.sin(t*.7),.14);hero.rotation.y=-.37+p*.55;bolt.visible=f>0;
     scan.position.x=(c.focus%2?-1:1)*(.7+.78*Math.sin(t*.89));receiver.rotation.y=c.active>0?.65:-.47;};
 }
 for(const [i,[x,z]] of game.map.pads.entries()){
   k.cyl(root,slate,x+.48,.09,z+.55,.15,.17);k.ball(root,i%2?brass:ivory,x+.48,.21,z+.55,.091,.070,.091,'lamp');
 }
 return {update:motion};
}

