import type * as T from 'three';
import type {Kit} from './folio-landmarks';
import {sample,type JanuaryDefense,type Point} from '../templates/january-defense';
import type {MidDay} from '../templates/midwinter-defense';
import {lander,rover,channel,winch,asteroid} from './midwinter-boards';
import {tripod,dish,globe,spacecraft,brass,ivory,steel,slate,red,unit} from './winter-boards';

export const midPalette={
 '1212':['#698a99','#e5d2aa','#839c8d','#adc1a6','#9a805d','#d8d491'],
 '1213':['#27324a','#8b8991','#7b7d84','#aaa495','#aa8f75','#efd59d'],
 '1214':['#373951','#ada59c','#8c8989','#b4ac9a','#a7865e','#dcd097'],
 '1215':['#43465b','#c6b8a6','#9c928a','#b5ad9f','#af8b60','#ecd28d'],
 '1216':['#283e53','#89a7ac','#718591','#a2b3a9','#a68c63','#c7dea9'],
} as const;
export function buildMidDefense(k:Kit,root:T.Group,g:JanuaryDefense,day:MidDay){
 const c=g.control!,set=k.group(root,0,.03,-4.63),desk=k.group(root,1.85,.04,3.66);
 const end=k.group(set);end.name='mid-end';
 let motion:(t:number,p:number,f:number)=>void;
 if(day==='1212'){
   channel(k,set,[[-8,.22,-.68],[-4.8,.22,-.48],[-2.4,.22,-.20],[.5,.22,.27],[3.1,.22,.32],[5.75,.22,-.19],[7.9,.22,-.65]],1.28,'#7fb3af','#9b9d86');
   for(const s of [-1,1]){k.box(set,'#939f92',-2.25,1.12,s*.88-.20,.40,2.24,.43);k.box(set,'#a9b6a3',-2.25,2.30,s*.88-.20,.48,.15,.51);}
   k.box(set,'#a88968',-2.25,2.50,-.20,.71,.33,2.40);for(const s of [-1,1])k.beam(set,steel,[-2.25,2.38,s*.47-.20],[-2.25,1.36,s*.47-.20],.038);
   const sluice=k.group(end,-2.25,.30,-.20);for(let n=0;n<5;n++)k.box(sluice,n%2?'#718d87':'#8eaaa0',0,.13+n*.22,0,.22,.19,1.48);
   const windows:T.Group[]=[];
   for(let j=0;j<7;j++){const x=.25+j*.91,z=-1.02-.20*Math.sin(j),h=.68+(j%3)*.20;k.box(set,j%2?'#a6a28c':'#b1ad95',x,h/2,z,.64,h,.65);
     k.put('box',set,'toon','#8d795e',x,h+.09,z,.78,.17,.77,0,.09);
     const light=k.group(set,x,h*.57,z+.340);light.name='canal-window';windows.push(light);
     for(const v of [-.16,.16]){k.box(set,slate,x+v,h*.57,z+.340,.106,.174,.025);k.box(light,'#ffe1a2',v,0,.027,.088,.146,.018,0,'lamp');}}
   const ripples=Array.from({length:5},(_,i)=>{const ripple=k.group(set);
     k.beam(ripple,'#c0e7d3',[-.20,0,-.22],[.01,0,0],.025,'lamp');k.beam(ripple,'#c0e7d3',[.01,0,0],[-.20,0,.22],.025,'lamp');return ripple;});
   const crank=winch(k,desk);const gauge=k.group(desk,-.76,.05,0);k.cyl(gauge,'#7ca3aa',0,.32,0,.22,.64);
   motion=(t,p,f)=>{end.position.y=unit(f)*.84+.16*(c.active>0?1:0);crank.rotation.x=c.count*1.22;gauge.scale.y=.32+c.reserve*.25;
     const available=unit(.14+p*.49+f*.30);
     windows.forEach((w,i)=>{w.visible=(i+1)/7<=unit(p*.41+f*.47);});
     ripples.forEach((r,i)=>{const u=(t*.12+i*.20)%1,x=-6.8+13.66*u;r.visible=u<=available;r.position.set(x,.267,-.17+.45*Math.sin((x+2.39)*.43));});};
 }else if(day==='1213'){
   const rock=k.group(set,.14,1.87,0,0,-.12,.22,1.24);asteroid(k,rock);
   spacecraft(k,end,'relay');end.scale.setScalar(.87);
   const film=k.group(set,4.70,.10,-.20);k.box(film,slate,0,.83,0,2.17,1.66,.22);
   for(let i=0;i<7;i++)for(const z of [.18,1.46])k.box(film,ivory,-.85+i*.28,z,.125,.13,.09,.02);
   const print=k.group(film,.03,.84,.14,0,0,.14,.44);asteroid(k,print);print.scale.z=.15;
   const windowMarks=[0,1].map(i=>{const edge=k.group(root);
     for(const s of [-1,1]){k.beam(edge,'#e9c480',[s*.40,.065,0],[s*.65,.065,0],.038,'lamp');
       k.beam(edge,'#e9c480',[s*.65,.065,0],[s*.65,.065,i?-.23:.23],.038,'lamp');}
     return edge;});
   const point:Point=[0,0],ahead:Point=[0,0];
   tripod(k,desk,0,0,.76,brass);const focus=k.group(desk,0,1.02,0);
   k.box(focus,slate,0,0,0,.55,.42,.40);k.put('round',focus,'toon',steel,0,0,.32,.14,.20,.14,Math.PI/2);
   motion=(t,p,f)=>{rock.rotation.y=-.17+t*.11;end.position.set(-5.44+p*5.04+unit(f)*1.27,2.68+.66*Math.sin(p*2.70),.45+.38*p);
     focus.rotation.y=c.focus%2?.52:-.51;print.visible=f>0;
     const track=g.tracks[g.sector],center=c.focus%2?.68:.30;windowMarks.forEach((m,i)=>{const at=(center+(i?.18:-.18))*track.total;
       sample(track,at,point);sample(track,at+.03,ahead);m.position.set(point[0],0,point[1]);m.rotation.y=Math.atan2(ahead[0]-point[0],ahead[1]-point[1]);m.visible=g.phase==='wave'||g.phase==='interval';});};
 }else if(day==='1214'){
   lander(k,end);end.scale.setScalar(1.38);
   for(let i=0;i<30;i++){const a=i*2.416,r=2.36+i%7*.64;k.rock(set,i%3?'#999389':'#b2a99a',r*Math.cos(a),.13,r*Math.sin(a)*.32,.22+(i%4)*.10,.13+i%3*.045,.20+(i%3)*.10,a);}
   const feet=k.group(set);for(const sx of [-1,1])for(const sz of [-1,1]){
     const x=sx*.99*1.38,z=sz*.76*1.38+.02;k.cyl(set,'#9b9486',x,.031,z,.34,.048);
     k.ring(feet,'#cfb183',x,.080,z,.31,Math.PI/2);
   }
   const foot=k.group(end,.99,.04,.76);foot.name='lander-foot-sole';
   const imprint=k.group(set,.99*1.38,.055,.76*1.38+.02);imprint.name='landing-contact';
   k.box(desk,slate,0,.29,0,1.74,.56,.85);
   const needle=k.group(desk,0,.61,0);k.beam(needle,brass,[0,0,0],[.53,0,.10],.041);
   for(let n=0;n<11;n++){const a=-.90+n*.18;k.cyl(desk,ivory,.62*Math.cos(a),.604,.42*Math.sin(a),.026,.028);}
   motion=(t,p,f)=>{end.position.set((1-p)*2.86,2.70*(1-p)+.47*(1-unit(f)),.02);end.rotation.z=(1-p)*.07*Math.sin(t);
     needle.rotation.y=-.82+1.72*(c.active>0?1:p);feet.visible=p>.12;};
 }else if(day==='1215'){
   const landing=k.group(set,-3.4,.03,-.5,0,.12,0,1.32);lander(k,landing);
   for(let i=0;i<12;i++)k.box(set,ivory,-2.69+i*.15,1.41-i*.105,-.47,.12,.056,.70);
   rover(k,end);end.scale.setScalar(1.43);
   const photos=[-1,1].map(s=>{const frame=k.group(set,3.88+s*1.02,.06,-1.69,.05);k.box(frame,steel,0,1.17,0,1.70,1.41,.19);
     k.box(frame,'#bdb8a5',0,1.15,.11,1.50,1.13,.034);const pic=k.group(frame,0,.76,.16,0,0,0,.52);
     if(s<0)lander(k,pic);else rover(k,pic);pic.scale.z=.14;return pic;});
   const cam=dish(k,desk,0,0,.65);
   motion=(t,p,f)=>{end.position.set(-2.08+p*4.52,.11+Math.max(0,.78-p*2.9),.38);end.rotation.y=-.2+3.10*unit(p*.74+f*.24);
     cam.rotation.y=c.reserve?.72:-.70;photos[0].visible=c.hits>0||f>0;photos[1].visible=f>0;};
 }else{
   const globeStand=k.group(set,0,1.95,0);globe(k,globeStand,1.38);
   const starLights:T.Group[]=[];
   const belts=k.group(set,0,1.95,0);for(let band=0;band<3;band++){
     const orbit=k.group(belts,0,0,0,.56+band*.62,band*.63,.13),r=2.39+band*.13;
     for(let j=0;j<52;j++){const a=j*2*Math.PI/52,b=(j+1)*2*Math.PI/52;
       k.beam(orbit,'#a0997e',[r*Math.cos(a),r*Math.sin(a),0],[r*Math.cos(b),r*Math.sin(b),0],.035);}
     for(let i=0;i<8;i++){const a=i*Math.PI/4+.14*band,x=Math.cos(a)*(2.39+band*.13),y=Math.sin(a)*(2.39+band*.13);
       k.ball(orbit,slate,x,y,0,.072,.072,.072);
       const light=k.group(orbit,x,y,0);k.ball(light,band%2?'#e7cd88':'#bfdcbb',0,0,0,.145,.145,.145,'lamp');light.name='synchronised-star';starLights.push(light);}}
   for(const s of [-1,1]){const sat=k.group(end,3.84*s,1.82,0,0,-s*.27,0,.68);spacecraft(k,sat,'observatory');}
   const tx=dish(k,desk,0,0,.89);motion=(t,p,f)=>{globeStand.rotation.y=t*.12;belts.rotation.y=p*.71;
     const count=4+Math.floor(18*p)+Math.round(2*unit(f*.95));starLights.forEach((s,i)=>s.visible=i<count);end.rotation.z=.07+unit(f)*.22;tx.rotation.y=c.active>0?.71:-.40;};
 }
 for(const [i,[x,z]] of g.map.pads.entries()){k.taper(root,steel,x+.50,.11,z+.53,.15,.22);k.ball(root,i%2?brass:ivory,x+.50,.28,z+.53,.09,.076,.09,'lamp');}
 return {update:motion};
}

