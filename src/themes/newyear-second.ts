/** 展览轨道、书页、林地图、观景梯及跨海桥模型均为原创。 */
import * as T from 'three';
import {floor,paint,label,rod,ring,cream,iron,brass,wood,jade} from './december-chapters';
import {grain,starwall,peaked} from './winter-chapters';
import {tiles,ripples,ease,skyline} from './midwinter-chapters';
import {props,table,frame,spool} from './monthend-chapters';
import {globe} from './yearend-chapters';
import {type Exhibit,paper,face,books,trace,floorTrack,arc2} from './newyear-chapters';
export const flyby:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#546775','#435461'));starwall(b,st,'#202e49');
 const mounting=props(b,[0,.09,-2.07],g=>{b.cylinder(wood,0,.08,0,1.07,1.16,.20,g);b.cylinder(brass,0,.46,0,.19,.30,.66,g);});
 b.part(new T.SphereGeometry(.62,28,16),globe(st),-.74,1.53,-2.08,1,1,1);
 b.oval('#d6cfc1',1.22,1.62,-2.11,.38,.38,.38);
 for(let j=0;j<6;j++){const ang=j*.86;b.oval('#a19f99',1.22+Math.cos(ang)*.24,1.62+Math.sin(ang)*.24,-1.83,.057,.042,.028);}
 const rail=Array.from({length:59},(_,j)=>{const a=j/58*arc2;return [Math.cos(a)*1.83,1.56+Math.sin(a)*.48,-2.10+Math.sin(a)*.26];});
 trace(b,b.fixed,rail,'#a39370',.026);
 for(const k of [-1,1]){ring(b,k<0?'#b7d9bd':'#dabc78',k*1.82,1.56,-2.07,.23,.025,b.fixed,false);
   b.cylinder(wood,k*1.87,.22,-.50,.32,.39,.44);}
 const probe=props(b,[0,0,0],g=>{b.oval('#d8d9b9',0,0,0,.13,.13,.13,g);
   for(const k of [-1,1]){rod(b,brass,[0,0,0],[k*.30,k*.15,.04],.018,g);rod(b,iron,[0,0,0],[k*.19,-k*.20,.13],.014,g);}});
 const trail=props(b,[0,0,0],g=>trace(b,g,Array.from({length:29},(_,j)=>{const x=j/28;return [-1.47+x*3.84,1.48+.48*Math.sin(x*3.3),-1.85+x*.19];}),'#e9cb89',.022));
 return(s,t)=>{const u=ease(s.end),a=s.turn;trail.visible=s.end>=0;
   if(s.end<0)probe.position.set(Math.cos(a)*1.83,1.56+Math.sin(a)*.48,-2.10+Math.sin(a)*.26);
   else{const f=s.chosen?1-u:u;probe.position.set(-1.47+3.84*f,1.48+.48*Math.sin(f*3.3),-1.85+.19*f);}
 };
};
export const lamps:Exhibit=(b,st)=>{
 const boards=grain(st,'#806e5f');floor(b,boards,-2.61,0,3.98,5.4);floor(b,boards,2.61,0,3.98,5.4);
 floor(b,'#394d59',0,0,1.24,5.4,-.11);books(b,-1.76,-3.39,0);books(b,1.74,-3.39,0);
 // The two book banks share a bay window looking onto one imaginary night sky.
 b.box('#9c856e',0,1.74,-4.20,8.40,3.48,.21);
 const night=paint(st,'#2a4053',g=>{for(let j=0;j<110;j++){g.fillStyle=j%3?'#839ba3':'#e8c98c';g.beginPath();g.arc(24+j*89%720,16+j*73%340,j%4?1.2:2.2,0,arc2);g.fill();}
   g.fillStyle='#d7bf91';g.beginPath();g.arc(565,89,44,0,arc2);g.fill();g.fillStyle='#2a4053';g.beginPath();g.arc(581,82,41,0,arc2);g.fill();
   g.fillStyle='#354b58';for(let j=0;j<16;j++){const h=31+j*31%71;g.fillRect(j*51,384-h,59,h);}});
 b.box(night,0,1.84,-4.06,6.79,2.60,.043);
 for(let j=-2;j<=2;j++)b.box('#795f49',j*1.66,1.84,-4.00,.09,2.70,.09);
 for(const y of [.47,2.34,3.20])b.box('#7f654d',0,y,-3.99,6.94,.11,.13);
 for(const side of [-1,1]){b.box('#765b47',side*3.62,1.65,-2.91,.18,3.3,.22);b.box(wood,side*3.39,.44,.19,.87,.11,.54);
  for(let j=0;j<3;j++){const book=b.box(j%2?'#748478':'#a17c62',side*3.39,.55+j*.097,.21,.55,.085,.36);book.rotation.y=.13*j;}}
 for(const k of [-1,1]){b.box('#735e52',k*.67,.07,-.48,.11,.14,2.19);}
 const span=props(b,[0,.03,-.39],g=>{for(let j=0;j<5;j++)b.box(j%2?'#c8af91':'#e1ccb0',-.51+j*.255,0,0,.249,.079,.99,g);});
 const lamps=[[-2.15,-.69],[1.69,-.73],[1.96,.55]].map(([x,z],i)=>props(b,[x,0,z],g=>{b.cylinder(iron,0,.08,0,.23,.29,.15,g);rod(b,brass,[0,.16,0],[0,.56,0],.046,g);
 b.cylinder(i?'#b79a6d':'#95b0a0',0,.71,0,.16,.31,.30,g);b.oval(cream,0,.57,0,.14,.10,.14,g);}));
 const pages=['city','sill'].map((art,j)=>props(b,[0,.19,-1.74],g=>{b.box('#845a4a',0,0,0,2.48,1.48,.11,g);b.box(paper(st,art as 'city'|'sill'),0,0,.083,2.37,1.37,.034,g);}));
 return(s,t)=>{span.rotation.z=s.pin||s.step===3?0:.32;lamps.forEach((m,i)=>{m.scale.y=i===0&&s.pin||i===s.chosen+1&&s.step>=2?1.09:1;});
   pages.forEach((p,i)=>{p.visible=i===s.chosen&&s.step>=2;p.position.y=.37+ease(s.end)*.91;p.rotation.x=-1.21+ease(s.end)*1.16;});};
};
export const typewood:Exhibit=(b,st)=>{
 floor(b,grain(st,'#a39176'));for(let j=0;j<7;j++)peaked(b,j%2?'#7c9178':'#a0ab8c',-4.64+j*1.47,.63,-4.07,2.52,1.47+(j%3)*.32,.39);
 for(let j=0;j<18;j++){const x=-3.87+j%9*.98,z=-2.71-Math.floor(j/9)*.60,r=.31+(j%3)*.077,h=.89+(j*.17%1);
   b.cylinder('#886c50',x,h*.32,z,.062,.113,h*.66);for(let n=0;n<2;n++)b.cylinder(j%3?'#64846a':'#748e73',x,h*.57+n*h*.24,z,.021,r*(1-n*.27),h*.69);}
 const types=[-1,1].map((k,i)=>props(b,[k*1.93,.12,.50],g=>{b.box('#856d59',0,0,0,.85,.20,.74,g);b.box(label(st,'#d5c5a0',i?'山':'木','#435e4d'),0,.116,0,.73,.032,.62,g);}));
 const forks=[-1,1].map(k=>props(b,[k*1.17,.20,-.74],g=>{b.box('#7a654f',0,0,0,.13,.39,.13,g);face(b,g,'#b79d72',[[-.32,.14],[.22,.14],[.42,.28],[.22,.41],[-.32,.41]],0,.07);}));
 // The bank approaches are shared; give each fork its own curved trail around the central grove.
 for(const k of [-1,1])floorTrack(b,[[k*1.93,.50],[k*1.16,-.74]],k<0?'#697d63':'#9e7d58');
 const paths=[-1,1].map((k,i)=>props(b,[0,.052,0],g=>trace(b,g,[[k*1.16,0,-.74],[k*.54,0,-.74+k*.39],[-k*.43,0,-.74+k*.43],[-k*1.16,0,-.74]],i?'#ad8658':'#63836a',.026)));
 const print=[0,1].map(i=>props(b,[0,.29,-1.88],g=>{b.box(paper(st,'grove',cream,i?'#835c4a':'#47664d'),0,0,0,2.55,1.55,.07,g);}));
 const roller=b.cylinder(iron,0,.28,1.46,.17,.17,1.83,b.root);roller.rotation.z=Math.PI/2;
 return(s,t)=>{const u=ease(s.end);forks.forEach((g,i)=>{g.rotation.y=s.chosen===i&&s.step>=2?-.93:0;paths[i].visible=s.chosen===i;});
  print.forEach((g,i)=>{g.visible=s.chosen===i&&s.end>=0;g.position.y=.38+u*.83;g.rotation.x=-1.41+u*1.37;});roller.position.z=1.46-u*.52;};
};
export const lift:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#a5a999','#89988d'));
 b.box('#9caba1',0,-.10,-4.06,11.15,.18,2.70);
 for(let j=0;j<18;j++){const x=-5.24+j*.63,w=.48+(j%3)*.066,h=.58+Math.sin(j*1.68)**2*.93,z=-4.24-(j%2)*.35;
   b.box(j%2?'#96a9a5':'#a7b5ad',x,h/2,z,w,h,.40);b.box('#a6b5ad',x,h+.10,z,w*.69,.20,.33);
   for(let n=0;n<3;n++){const y=.25+n*.32;if(y<h-.14)b.box('#b9c8ba',x,y,z+.208,w*.78,.048,.024);}}
 for(const k of [-1,1]){b.box('#8c978b',k*3.17,.25,.26,.85,.49,.47);b.oval('#80967f',k*3.17,.64,.26,.47,.28,.30);}
 const tower=props(b,[-.26,0,-2.54],g=>{for(let j=0;j<7;j++){
   const x=(j%2?-.09:.10),r=.59-j*.069,y=.23+j*.42;
   b.cylinder(j%2?'#8aa9b2':'#b0bdba',x,y,0,r*.90,r,.43,g);
   ring(b,'#e0d5ab',x,y+.197,0,r*.91,.018,g);}
 rod(b,'#b1b9b2',[0,2.88,0],[0,3.55,0],.028,g);});
 for(const k of [-1,1]){rod(b,iron,[.91+k*.24,.12,-2.22],[.91+k*.24,3.0,-2.22],.024);
   for(let n=0;n<2;n++)b.box(n?brass:jade,.91+k*.28,n?2.23:.92,-2.22,.20,.042,.16);}
 b.box(iron,.91,3.0,-2.22,.63,.12,.25);b.box(iron,.91,.12,-2.22,.66,.23,.43);
 const cage=props(b,[.91,.52,-2.22],g=>{b.box('#adc8c5',0,0,0,.44,.44,.38,g);for(const k of [-1,1])b.box(iron,k*.21,0,.19,.034,.48,.047,g);b.box(brass,0,.24,0,.48,.056,.42,g);});
 const strips=[-1,1].map((k,i)=>props(b,[0,.24,-1.64],g=>{for(let j=0;j<9;j++){const x=(j-4)*.20,h=.24+((j*11+i*3)%7)*.083;
 b.box(i?'#597b81':'#b19b77',x,h/2,0,.193,h,.075,g);}b.box(cream,0,-.044,0,1.86,.08,.10,g);}));
 return(s,t)=>{const u=ease(s.end);cage.position.y=.54+2.09*(s.pin?s.height:.06);strips.forEach((g,i)=>{g.visible=!!(s.mask&(1<<i));g.position.set((i?1:-1)*(.38+.54*u),.22+u*.52+i*.13,-1.26+i*.26);g.rotation.y=(i?1:-1)*(.85-.58*u);});};
};
export const strand:Exhibit=(b,st)=>{
 floor(b,ripples(st,'#67989e','#9cbcb1'));for(let j=0;j<7;j++)peaked(b,j%2?'#768d83':'#96a397',-4.76+j*1.56,.45,-4.0,2.97,1.42+(j%3)*.27,.38);
 for(const k of [-1,1]){b.box('#b09e7d',k*2.72,.10,-1.76,.69,.20,1.17);
   b.box('#97866d',k*2.68,.265,-1.87,.46,.13,.42);ring(b,iron,k*2.68,.399,-1.88,.079,.027,b.fixed,false);}
 for(const k of [-1,1]){b.box('#b5aa87',k*2.60,.049,-.08,2.00,.098,2.10);b.box('#ad9275',k*1.43,.12,-2.06,.86,.24,.71);
  const x=k*1.43;for(const dx of [-.33,.33]){b.box('#ab5a48',x+dx,1.30,-2.07,.16,2.28,.21);b.box('#b96e52',x+dx,2.55,-2.07,.23,.15,.29);}
  for(const y of [1.4,2.28])b.box('#ac604e',x,y,-2.07,.63,.16,.18);
  for(const s of [-1,1])rod(b,'#a75c49',[x+s*.26,1.49,-2.08],[x-s*.26,2.18,-2.08],.035);
  ring(b,brass,x,2.42,-1.93,.105,.029,b.fixed,false);}
 b.box('#ab9276',0,.126,-.68,3.20,.17,.58);
 const segment=(xa:number,ya:number,xb:number,yb:number,sag:number)=>props(b,[0,0,0],g=>{const pts=Array.from({length:19},(_,i)=>{const f=i/18;return [xa+(xb-xa)*f,ya+(yb-ya)*f-4*sag*f*(1-f),-1.88];});trace(b,g,pts,'#f5d59e',.026);});
 const edges=[segment(-2.68,.40,-1.43,2.43,.11),segment(1.43,2.43,2.68,.40,.11)];
 const span=segment(-1.43,0,1.43,0,.67);span.position.y=2.43;
 for(const k of [-1,1]){const plate=props(b,[k*2.18,.24,.58],g=>spool(b,g,0,0,0,.21));}
 return(s,t)=>{const u=ease(s.end);edges.forEach((m,i)=>m.visible=s.step>=1&&(s.chosen===i||s.count===2));span.visible=s.step>=2;span.scale.y=1-u*.70;};
};
