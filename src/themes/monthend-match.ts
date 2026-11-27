import type * as T from 'three';
import type {Kit} from './folio-landmarks';
import type {MonthendDay} from '../templates/monthend-defense';
import {brass,ivory,steel,slate,globe,unit} from './winter-boards';
import {satellite,desk,green,bark,folio} from './yearend-boards';
import {sectionMesh,tunnelPortal} from './december-defense';
import {karst} from './midwinter-boards';
import {photo,bridge,train,track,canopyRoof,water,leaf,rust,ink,plaster,gold} from './monthend-boards';
type Motion=(t:number,p:number,f:number,contacts:readonly boolean[],branch:number)=>void;
export function buildMonthMatch(k:Kit,g:T.Group,day:MonthendDay):Motion{
 const end=k.group(g);end.name='monthend-finale';
 if(day==='1222'){
   k.box(g,'#8c826f',0,.16,0,5.58,.32,2.84);
   const rail=k.group(g,0,.43,-.20,.22);k.box(rail,slate,0,0,0,4.90,.12,1.11);
   for(const x of [-2.17,2.17])k.beam(rail,steel,[x,0,.43],[x,1.31,-.25],.060);
   const left=photo(k,rail,-1.08,1.05,-.13,0);rail.add(end);photo(k,end,0,0,0,1);
   const pin=k.group(rail,0,1.96,-.14);k.box(pin,brass,0,0,0,.67,.14,.20);
   return(t,p,f,c)=>{left.rotation.z=.19*(1-unit(p*2.6));end.position.set(1.10,1.05+.42*(1-unit(p*.63+f*.55)),-.13);
     end.rotation.z=-.22*(1-unit(p*.68+f*.47));pin.position.y=2.16-.20*unit(f);};
 }
 if(day==='1223'){
   k.box(g,slate,0,.16,0,5.61,.32,2.82);
   for(const s of [-1,1]){const x=s*1.38,h=s<0?1.02:1.76;k.box(g,steel,x,h*.5,-.22,.14,h,.39);k.box(g,'#947f68',x,h,-.09,1.96,.14,.92);
     k.beam(g,brass,[x-.60,.32,-.29],[x,h-.17,-.29],.052);k.beam(g,brass,[x+.60,.32,-.29],[x,h-.17,-.29],.052);}
   const one=k.group(g),two=end;one.name='first-star-model';satellite(k,one,0,0,0,.88);satellite(k,two,0,0,0,.88);
   k.taper(two,ivory,0,.32,-.01,.23,.20,true);k.ring(two,brass,0,.47,0,.22,.58);
   return(t,p,f,c,b)=>{const s=b===2?-1:1,done=unit(f);const low=1.34,high=2.08;
     one.position.set(-1.38*s,(s===1?low:high)+.30*(1-unit(p*2)),.25*(1-unit(p*2))-.075);
     two.position.set(s*(.54+.84*unit(p*.56+done*.44)),(s===1?high:low)+.35*(1-unit(p*.50+done*.50)),.26-.32*done);two.rotation.y=(1-done)*.47;};
 }
 if(day==='1224'){
   k.box(g,'#92b5ae',0,.13,0,5.63,.26,2.83);
   const ship=k.group(g,0,.29,0);sectionMesh(k,ship,quad=>{
     const at=(i:number,h:number,s:number):[number,number,number]=>{const u=i/16,w=(.49+.07*h)*Math.pow(Math.sin(Math.PI*u),.46);
       return [-2.45+4.9*u,h*.48+.09*Math.abs(u-.50),s*w];};
     for(let i=0;i<16;i++){for(const sign of [-1,1])quad(at(i,0,sign),at(i+1,0,sign),at(i+1,1,sign),at(i,1,sign),i%4?'#647f85':'#708c91');
       quad(at(i,1,-1),at(i,1,1),at(i+1,1,1),at(i+1,1,-1),ivory);}
   });
   const lamps:T.Group[]=[];for(let j=0;j<3;j++){
     const w=3.99-j*.56;k.box(ship,ivory,-.10,.65+j*.28,0,w,.28,.90-j*.13);
     for(let n=0;n<10-j;n++){const x=-w*.44+n*w*.88/(9-j),z=.46-j*.065;
       k.box(ship,ink,x,.67+j*.28,z,.115,.099,.028);
       const l=k.group(end,x,.96+j*.28,z+.025);k.box(l,gold,0,0,0,.088,.073,.014,0,'lamp');l.name='warm-port';lamps.push(l);}
   }
   k.put('taperUp',ship,'toon',rust,-.82,1.53,-.03,.22,.56,.20,0,0,-.17);k.put('taperUp',ship,'toon',rust,-.13,1.53,-.03,.22,.56,.20,0,0,-.17);
   for(let i=0;i<8;i++)k.ball(ship,'#cf8960',-1.48+i*.40,.94,.43,.15,.062,.084);
   return(t,p,f)=>{end.position.z=.015*unit(f);lamps.forEach((l,i)=>l.visible=i<Math.round(18*p+9*unit(f)));};
 }
 if(day==='1225'){
   k.box(g,bark,0,.14,0,5.54,.28,2.86);
   const base=k.group(g,-2.49,.34,-.01);const pages:T.Group[]=[];
   for(let i=0;i<3;i++){const parent=i?pages[i-1]:base,panel=i===2?end:k.group(parent);if(i===2)parent.add(end);panel.position.x=i?1.62:0;
     k.box(panel,i===1?'#c1c6a2':'#afbea0',.80,.031,0,1.59,.061,2.28);
     if(i===0){k.box(panel,water,.80,.075,.14,1.52,.021,.55);bridge(k,panel,.78,.34,.15,1.38,green);}
     if(i===1){for(let n=0;n<3;n++)karst(k,panel,.28+n*.49,-.49,.35,.73+n%2*.35,n);k.box(panel,'#83a39a',.81,.078,.37,1.53,.019,.35);}
     if(i===2){karst(k,panel,.83,-.40,.71,1.22,3);const tunnel=k.group(panel,.63,.08,.26,0,0,0,.44);tunnelPortal(k,tunnel,0,0,.42,'#ac9c81');}
     pages.push(panel);}
   return(t,p,f,c,b)=>{pages[0].rotation.z=.34*(1-unit(p*2));pages[1].rotation.z=(b===2?.75:1.23)*(1-unit(p*1.45));
     end.rotation.z=-1.32*(1-unit(p*.52+unit(f)*.50));};
 }
 if(day==='1226'){
   k.box(g,'#a1aa8b',0,.14,0,5.58,.28,2.83);for(let i=0;i<6;i++)karst(k,g,-2.32+i*.91,-1.01,.41+i%2*.17,1.31+(i%3)*.25,i);
   const bed=k.group(g,0,.39,.16);track(k,bed,-.33,5.43);track(k,bed,.43,5.43);
   k.beam(bed,steel,[-.62,.22,-.33],[.56,.22,.44],.036);k.beam(bed,steel,[-.62,.22,-.10],[.56,.22,.67],.036);
   const point=k.group(bed,-.60,.25,-.32);k.box(point,brass,.39,0,0,.79,.034,.054);
   const model=k.group(end,0,0,0,0,0,0,.67);train(k,model,'#709788');
   return(t,p,f,c,b)=>{point.rotation.y=b===2?-.54:0;end.position.set(-1.93+2.15*p+unit(f)*1.07,.59,.16+(b===2?.43:-.33)*unit(p*2));};
 }
 if(day==='1227'){
   k.box(g,green,0,.16,0,5.59,.32,2.86);k.box(g,'#b1ac85',0,.36,.09,4.99,.08,2.19);
   for(let i=0;i<9;i++){k.box(g,'#8d9277',-2.05+i*.53,.413,.09,.019,.017,1.96);if(i<5)k.box(g,'#8d9277',0,.428,-.70+i*.39,4.67,.014,.018);}
   for(let i=0;i<5;i++)karst(k,g,-1.90+i*.83,-.67,.37,.38+i%2*.31,i);
   const emitter=k.group(g,0,0,-.81);for(const d of [-1,1])k.beam(emitter,brass,[d*2.31,.41,0],[d*1.28,2.09,0],.045);
   k.box(emitter,steel,0,2.14,0,2.94,.11,.19);satellite(k,emitter,0,2.36,0,.73);
   const meridian=k.group(g,-.81,.46,.10);k.box(meridian,water,0,0,0,.047,.027,1.99,0,'lamp');
   const parallel=k.group(g,0,.49,-.70);k.box(parallel,gold,0,0,0,4.67,.024,.043,0,'lamp');
   end.position.set(.68,.50,.28);k.ring(end,gold,0,0,0,.18,Math.PI/2,0,'lamp');k.ball(end,ivory,0,.05,0,.085,.082,.085,'lamp');
   return(t,p,f)=>{const u=unit(p*.72+unit(f)*.28);meridian.position.x=-.81+1.49*u;parallel.position.z=-.70+.98*u;end.scale.setScalar(.25+.75*unit(f));};
 }
 if(day==='1228'){
   k.box(g,'#bbb094',0,.15,0,5.63,.30,2.84);
   const panels:T.Group[]=[];for(let i=0;i<5;i++){const part=k.group(g,-2.06+i*1.03,.58,0);
     k.box(part,steel,0,0,0,.97,.12,1.89);for(let x=0;x<3;x++)for(let z=0;z<6;z++)k.box(part,(x+z)%2?'#708ea0':'#607c92',-.30+x*.30,.085,-.76+z*.30,.276,.040,.276);
     panels.push(part);}
   for(let j=0;j<3;j++){k.cyl(g,green,-1.83+j*1.73,1.01,-1.12,.046,1.56);k.box(g,green,-1.69+j*1.73,1.78,-1.12,.34,.083,.12);k.ball(g,ivory,-1.51+j*1.73,1.72,-1.12,.10,.064,.084);}
   k.ball(end,'#ffda88',0,0,0,.24,.047,.24,'lamp');
   return(t,p,f)=>{const d=unit(p*.68+unit(f)*.32);panels.forEach((v,i)=>v.rotation.z=.32*Math.sin((i+1)*1.34)*(1-unit(p*4-i*.50)));
     end.position.set(-2.1+4.13*d,.744+.085*Math.sin(d*6),.34-.54*d);};
 }
 if(day==='1229'){
   k.box(g,bark,0,.15,0,5.51,.30,2.86);for(const x of [-2.10,2.10])k.cyl(g,brass,x,1.07,-.85,.068,1.50);
   const layers:T.Group[]=[];for(let j=0;j<3;j++){
     const layer=j===2?end:k.group(g);k.box(layer,['#8eaeaa','#a4af87','#c4b995'][j],0,0,0,4.52-j*.60,.12,2.14-j*.34);
     for(let i=0;i<5;i++)karst(k,layer,-1.44+i*.63,-.25+.12*Math.sin(i),.28+j*.09,.13+.10*j+(i%2)*.18,i+j);
     for(const x of [-1.22,1.22])k.cyl(layer,brass,x,.078,.54,.044,.025);layers.push(layer);}
   return(t,p,f)=>{layers.forEach((l,i)=>{const d=unit(p*(i===2?.55:1.8)+unit(f)*(i===2?.45:0));l.position.set((i===1?-.46:.32)*(1-d),.45+i*(.17+.43*(1-d)),(i-1)*.24*(1-d));});};
 }
 if(day==='1230'){
   k.box(g,bark,0,.14,0,5.64,.28,2.84);
   const stations=[-1,1].map((d,i)=>{const station=k.group(g,d*1.33,.29,-.43);k.box(station,i?'#94aba7':'#b49172',0,.53,0,1.84,1.06,.79);
     if(!i){canopyRoof(k,station,0,1.11,0,2.08,1.13,rust);k.cyl(station,bark,-.57,1.33,-.19,.10,.53);}
     else{k.box(station,ivory,0,1.11,0,2.03,.10,.98);for(let n=0;n<5;n++)k.box(station,slate,-.66+n*.32,.65,.409,.22,.49,.026);}
     k.box(station,i?slate:green,0,.37,.423,.28,.63,.032);return station;});
   k.box(g,brass,0,.42,.75,5.15,.15,.73);for(let i=0;i<27;i++)k.box(g,bark,-2.35+i*.18,.507,.89,.022,.018,i%5?.15:.35);
   k.box(end,ivory,0,0,0,.71,.068,.49);for(let i=0;i<5;i++)k.box(end,green,-.24+i*.071,.042,0,.031,.014,.27);
   return(t,p,f,c,b)=>{const s=b===2?1:-1;end.position.set(s*(1.41-.58*p-.83*unit(f)),.56,.73);stations[1].rotation.y=.055*Math.sin(p*Math.PI);};
 }
 k.box(g,'#a9977e',0,.15,0,5.62,.30,2.86);k.box(g,water,0,.34,.79,5.24,.06,.45);
 const rooms:T.Group[]=[];for(let j=0;j<7;j++){
   const x=-2.21+j*.72,h=.66+(j*3%5)*.27,z=j%2?-.61:-.05;
   k.box(g,j%2?'#8d9a93':'#bd9a7c',x,.34+h/2,z,.63,h,.64);
   if(j%2)k.box(g,slate,x,.40+h,z,.69,.11,.70);else canopyRoof(k,g,x,.37+h,z,.72,.72,rust);
   const lights=k.group(end,x,.36,z+.34);lights.name='warm-house';for(let n=0;n<3;n++)for(let r=0;r<2;r++){
     const y=.19+n*h*.22,dx=-.14+r*.27;k.box(g,slate,x+dx,.36+y,z+.329,.15,.105,.014);k.box(lights,gold,dx,y,.017,.12,.079,.018,0,'lamp');}rooms.push(lights);}
 return(t,p,f,c,b)=>{const count=Math.round(4*p+3*unit(f));rooms.forEach((l,i)=>l.visible=(b===2?6-i:i)<count);end.position.y=.011*unit(f);};

}
