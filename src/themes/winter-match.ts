import * as T from 'three';
import type {Kit} from './folio-landmarks';
import type {WinterDay} from '../templates/winter-defense';
import {trainSet,sectionMesh} from './december-defense';
import {ivory,slate,steel,brass,red,blue,unit,page} from './winter-boards';

function chassis(k:Kit,g:T.Group){
 k.box(g,'#78816d',0,.34,0,1.57,.30,.62);
 k.box(g,'#9b9e7c',.60,.68,0,.45,.42,.55);k.box(g,slate,.61,.74,.284,.31,.16,.02);
 for(let i=0;i<4;i++)for(const d of [-1,1]){const x=-.61+i*.37;k.put('round',g,'toon',slate,x,.19,d*.31,.17,.13,.17,Math.PI/2);
   k.put('round',g,'toon',brass,x,.19,d*.387,.088,.019,.088,Math.PI/2);}
 const mast=k.group(g,-.61,.57,0);
 k.cyl(mast,ivory,0,.71,0,.14,1.40);k.cone(mast,ivory,0,1.55,0,.142,.29);
 k.cyl(mast,red,0,.90,0,.144,.084);k.cyl(mast,slate,0,.10,0,.146,.105);
 return mast;
}
function bridgeDeck(k:Kit,g:T.Group,length:number){
 k.box(g,'#899794',0,0,0,length,.17,.75);
 for(const z of [-.29,.29]){
   k.box(g,slate,0,.11,z,length,.04,.034);
   const top=z<0?.50:.28;
   k.box(g,'#aa8464',0,top,z+.10,length,.064,.055);
   for(let j=0;j<6;j++){const a=length*(j/6-.5),b=a+length/6;
     k.beam(g,'#a27d60',[a,.11,z+.10],[b,top-.016,z+.10],.029);k.beam(g,'#b19470',[a,top-.016,z+.10],[b,.11,z+.10],.029);}
 }
}
function book(k:Kit,g:T.Group,x:number,y:number,z:number,w:number,h:number,cover:string){
 k.box(g,cover,x,y,z,w,.061,h);k.box(g,'#ddcbaa',x,y+.093,z,w-.05,.116,h-.04);
 k.box(g,cover,x,y+.18,z,w,.057,h);k.box(g,brass,x-w*.34,y+.214,z,.038,.012,h*.92);
}
type Motion=(t:number,p:number,f:number,contacts:readonly boolean[],branch:number)=>void;
export function buildWinterMatch(k:Kit,g:T.Group,day:WinterDay):Motion{
 const end=k.group(g);end.name='winter-finale';
 if(day==='1207'){
   k.box(g,'#a79c85',0,.14,0,5.66,.28,2.79);
   for(let i=0;i<10;i++)for(const z of [-.70,.67])k.box(g,'#d5c9a8',-2.44+i*.52,.296,z,.29,.027,.044);
   for(const x of [-2.11,1.97]){k.box(g,steel,x,.72,-.99,.95,.86,.58);
     for(let i=0;i<4;i++)k.box(g,slate,x-.32+i*.20,.80,-.682,.12,.19,.035);}
   k.cyl(g,'#8a8770',0,1.25,-1.02,.074,1.94);k.put('round',g,'toon',slate,0,2.03,-.94,.43,.12,.43,Math.PI/2);
   k.ball(g,'#e1d6ae',0,2.03,-.858,.36,.36,.050);
   const hand=k.group(g,0,2.03,-.787);k.box(hand,red,.13,0,0,.30,.048,.03);
   const morning=k.group(g,-1.18,.30,.39),afternoon=k.group(end,1.27,.30,.36);const m=chassis(k,morning),a=chassis(k,afternoon);
   return(t,p,f)=>{m.rotation.z=-unit(p*2.8)*1.18;a.rotation.z=-1.18+unit((p-.34)*1.60)*.86+unit(f)*.32;
     end.position.x=.46*unit(f);hand.rotation.z=.85-2.9*p;};
 }
 if(day==='1208'){
   k.box(g,'#aa9b78',0,.11,0,5.68,.22,2.83);
   k.box(g,'#a5a47d',0,.254,0,4.21,.058,2.82);
   for(const side of [-1,1]){
     k.box(g,'#beae83',side*2.46,.34,0,.72,.25,2.82);
     k.taper(g,'#928c79',1.82*side,.60,.08,.24,.72);k.box(g,'#b2a78b',side*1.82,.99,.08,.47,.12,.91);
     for(let i=0;i<9;i++)k.beam(g,'#c2b58a',[side*(.13+i*.23),.294,-1.16+i%3*.27],[side*(.32+i*.23),.294,-1.13+i%3*.27],.019);}
   for(let row=0;row<5;row++)for(let i=0;i<8;i++){const x=-1.85+i*.49+.09*Math.sin(row+i),z=.48+row*.18;
     k.beam(g,row%3?'#c3b68e':'#a6a680',[x,.296,z],[x+.26,.296,z+.022*Math.sin(i)],.015);}
   const span=1.88;
   for(const side of [-1,1])bridgeDeck(k,k.group(g,side*1.80,1.09,.11),span);
   const center=k.group(g,0,1.72,.11);bridgeDeck(k,center,1.70);
   const crane=k.group(g,-.70,.25,-.91);for(const x of [-.17,.17])k.box(crane,'#a07256',x,1.10,0,.115,2.20,.12);
   k.box(crane,brass,.28,2.24,0,1.53,.12,.19);k.beam(crane,brass,[-.43,2.18,0],[.16,2.50,0],.028);k.beam(crane,brass,[.16,2.50,0],[.88,2.19,0],.028);
   const hook=k.group(crane,.73,2.17,0);k.cyl(hook,slate,0,-.29,0,.020,.58);
   const train=k.group(end,0,1.24,.11,0,0,0,.63);trainSet(k,train,'#4084a1');
   return(t,p,f,c,branch)=>{center.position.y=1.72-.63*unit((p-.30)*1.49);center.rotation.y=(branch===2?-1:1)*.32*(1-unit((p-.30)*1.49));
     hook.scale.y=.79+.65*unit(p*1.29);end.position.x=-2.08+unit(f*.88)*2.79;};
 }
 if(day==='1209'){
   k.box(g,'#726854',0,.18,0,5.58,.36,2.77);
   for(let j=0;j<20;j++)k.rock(g,j%3?'#a18b69':'#ba9e70',-2.58+j*.267,.38,-1.04+.21*Math.sin(j*2.1),.12,.08+j%4*.025,.14,j);
   const pedestal=k.group(g,-.06,.39,.11);k.taper(pedestal,brass,0,.26,0,.63,.50);k.cyl(pedestal,slate,0,.57,0,.47,.14);
   const pathA=k.group(pedestal,0,.76,0),pathB=k.group(pedestal,0,.81,0);
   function arc(root:T.Group,r:number,tint:string){for(let i=0;i<32;i++){
     const a=-1.44+i*.090,b=a+.09;k.beam(root,tint,[r*Math.sin(a),r*Math.cos(a),0],[r*Math.sin(b),r*Math.cos(b),0],.035);}}
   arc(pathA,1.45,'#79b7cf');arc(pathB,1.84,'#9ed9cf');
   for(const s of [-1,1]){k.beam(pathA,brass,[0,0,0],[s*1.44,.18,0],.029);k.beam(pathB,steel,[0,.01,0],[s*1.81,.23,0],.032);}
   k.ball(pathA,ivory,0,0,0,.11);
   const stars=[-1,0,1].map((side,i)=>{const node=k.group(end,side*1.50,1.68+(1-Math.abs(side))*.94,.21);
     k.box(node,'#ba9e65',0,0,0,.23,.21,.21);for(const d of [-1,1])k.box(node,blue,d*.26,0,0,.24,.05,.22);
     k.ball(node,ivory,0,.13,0,.075,.072,.073,'lamp');return node;});
   return(t,p,f)=>{pathA.rotation.x=-.90+.88*unit(p*2.83);pathB.rotation.y=.9-.84*unit((p-.33)*2.98);
     end.position.y=.29*unit(f);stars.forEach((s,i)=>s.rotation.y=t*.25+i*.53+unit(f)*.75);};
 }
 if(day==='1210'){
   k.box(g,'#967652',0,.18,0,5.58,.36,2.95);
   const spine=k.group(g,0,.78,-.10,.31);
   for(const x of [-1.64,1.65]){k.beam(g,'#86674b',[x,.38,-1.0],[x,.99,-.85],.073);k.beam(g,'#a48c64',[x,.38,.66],[x,.98,-.86],.061);}
   const hojas=[-1,1].map(side=>{const leaf=k.group(spine,side*.045,0,0);
     k.box(leaf,side<0?'#63816d':'#75927a',side*1.16,.105,0,2.33,.21,2.06);
     k.box(leaf,'#d8c6a4',side*1.13,.238,0,2.23,.075,2.00);k.box(leaf,'#ede1bd',side*1.13,.292,0,2.22,.032,1.98);return leaf;});
   const plant=k.group(hojas[0],-1.1,.326,0);
   k.beam(plant,'#71805a',[-.65,0,.68],[.63,0,-.66],.030);
   for(let i=0;i<9;i++){const x=-.54+i*.131,z=.54-i*.144;for(const d of [-1,1]){const a=x+d*.19,b=z+d*.16;
     k.beam(plant,'#77865c',[x,0,z],[a,.025,b],.016);
     k.put('ball',plant,'toon',i%2?'#748954':'#8da06b',a,.053,b,.16,.025,.055,0,-d*.54);}}
   page(k,hojas[1],1.07,.333,.27,1.36,.86,'#ebd5ad');
   hojas[1].add(end);const medal=k.group(end,1.36,.398,-.46);medal.name='award-medal';k.put('round',medal,'toon','#bd9251',0,0,0,.42,.11,.42);
   k.ring(medal,'#f4d387',0,.065,0,.343,Math.PI/2);k.ball(medal,brass,0,.077,0,.21,.040,.23);
   return(t,p,f,c)=>{hojas[0].rotation.z=-.62*(1-unit(p*2.76));hojas[1].rotation.z=.64*(1-unit((p-.31)*2));
     plant.scale.setScalar(.75+.25*unit(p*2.26));end.position.y=.24*(1-unit(f));medal.scale.setScalar(.36+.64*unit(p*2.8-1.16));medal.rotation.y=.43*unit(f);};
 }
 k.box(g,'#8b735c',0,.17,0,5.57,.34,2.86);
 k.box(g,'#8e6449',0,.50,.01,4.71,.28,2.15);
 for(const s of [-1,1]){k.box(g,'#a7835d',s*2.30,1.015,0,.14,.75,2.12);k.box(g,'#ac8660',0,1.015,s*1.01,4.44,.75,.13);}
 const lid=k.group(end,0,1.395,-1.01);lid.name='case-hinge';k.box(lid,'#976d50',0,.052,1.00,4.67,.105,2.08);
 for(const x of [-1.45,1.45]){k.box(lid,'#6d6654',x,.127,1.0,.16,.037,2.05);k.box(lid,brass,x,.12,1.96,.22,.094,.13);}
 const books=k.group(g,-1.05,.67,-.11),folder=k.group(g,.97,.68,.09);
 for(let i=0;i<3;i++)book(k,books,0,i*.216,0,1.23,1.32,['#747a6c','#92735e','#5f7f82'][i]);
 page(k,folder,0,.07,0,1.47,1.21,'#ddc79e');page(k,folder,-.065,.145,.03,1.36,1.14,'#e9dab9');
 for(const s of [-1,1])k.box(g,brass,s*.39,.68,1.11,.10,.15,.09);k.beam(g,slate,[-.39,.65,1.17],[.39,.65,1.17],.06);
 return(t,p,f,c,branch)=>{folder.position.y=.68+(branch?0:.23);books.rotation.z=-.31*(1-unit(p*2.75));folder.position.x=1.87-.90*unit((p-.33)*1.90);
   lid.rotation.x=-1.48*(1-unit(f*.85));};
}

