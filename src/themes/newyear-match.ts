import type * as T from 'three';
import type {Kit} from './folio-landmarks';
import {januaryWeekDefense,type NewyearDay} from '../templates/newyear-defense';
import {ivory,brass,steel,slate,unit} from './winter-boards';
import {bark,green,gold} from './yearend-boards';
import {sectionMesh} from './december-defense';
import {frame,curtain,sprig,ink,copper,type V} from './newyear-boards';
type Motion=(t:number,p:number,f:number,contacts:readonly boolean[],branch:number)=>void;

export function buildNewyearMatch(k:Kit,g:T.Group,day:NewyearDay):Motion{
 if(januaryWeekDefense(day))return buildJanuaryWeekMatch(k,g,day);
 const end=k.group(g);end.name='newyear-finale';
 if(day==='0102'){
   k.box(g,'#b39879',0,.15,0,5.55,.30,2.81);
   for(const x of [-2.55,0,2.55]){k.taper(g,'#af9984',x,1.41,-1.09,.15,2.25);k.box(g,ivory,x,2.56,-1.09,.40,.17,.42);}
   k.box(g,'#a68a6c',0,2.72,-1.09,5.44,.16,.44);
   const shutters=[-1,1].map((d,i)=>{const panes:T.Group[]=[];
     for(let j=0;j<6;j++){const leaf=k.group(g,1.25*d,.54+j*.31,-1.13);
       k.box(leaf,j%2?'#987552':'#b18a65',0,0,0,2.11,.26,.13);panes.push(leaf);}
     for(let row=0;row<3;row++){const bench=k.group(g,d*(1.22+.13*row),.38+row*.094,.90-row*.52,0,d*.19);
       for(const x of [-.52,.52])k.box(bench,bark,x,.13,0,.10,.27,.32);
       k.box(bench,'#996d56',0,.29,0,1.35,.10,.38);k.box(bench,'#ad8165',0,.47,-.14,1.37,.29,.08);}
     return panes;});
   const lectern=k.group(g,0,.35,.73);k.box(lectern,bark,0,.29,0,.38,.58,.31);k.put('box',lectern,'toon','#c8ad80',0,.62,0,.84,.09,.59,-.27);
   k.put('box',lectern,'toon',ivory,0,.69,0,.56,.025,.39,-.27);
   end.position.set(2.45,1.37,-.89);k.beam(end,brass,[0,0,0],[0,.53,.04],.047);k.ball(end,ivory,0,.56,.04,.091);
   return(t,p,f,c)=>{shutters.forEach((row,i)=>row.forEach((s,j)=>s.rotation.x=.17+.92*unit((p-(i*.19+j*.034))*.90)+.36*unit(f)));end.rotation.x=1.15*unit(f);};
 }
 if(day==='0103'){
   k.box(g,'#43576b',0,.17,0,5.57,.34,2.82);k.box(g,'#658996',0,.357,.25,5.35,.029,2.14);
   k.box(g,'#384b65',0,1.28,-1.27,5.48,1.99,.095);
   for(let i=0;i<43;i++)k.ball(g,i%5?'#9caeb4':'#e4d7a9',-2.56+(i*41%104)*.049,.49+(i*31%74)*.023,-1.207,i%5?.013:.024);
   for(let i=0;i<11;i++){const x=-2.52+i*.50;k.rock(g,i%2?'#526471':'#485f6d',x,.43,-.82-.045*(i%3),.42,.20+.11*((i*7)%4),.22,i);}
   const wings=[-1,1].map(d=>{const wing=k.group(g,0,.48,-.64);curtain(k,wing,d);return wing;});
   for(const d of [-1,1]){const ref=k.group(end);curtain(k,ref,d,true);}
   const camera=k.group(g,-1.91,.40,.99,.19);for(const d of [-1,1])k.beam(camera,bark,[0,.51,0],[d*.21,0,.15],.029);
   k.beam(camera,bark,[0,.51,0],[0,0,-.22],.029);k.box(camera,ink,0,.59,0,.38,.21,.24);k.ball(camera,steel,.07,.60,-.14,.079,.083,.062);
   return(t,p,f,c,b)=>{wings.forEach((w,i)=>{const chosen=(b===i+1);w.scale.y=.59+.36*p+(chosen?.15:0)+.09*unit(f);w.rotation.y=(i?1:-1)*(.05+.04*Math.sin(t*.47+i));});
     end.position.set(0,.39,.92);end.rotation.x=-Math.PI/2;end.scale.set(1,.24+.46*unit(f),.09);};
 }
 if(day==='0104'){
   k.box(g,'#97876a',0,.20,0,5.48,.40,2.76);k.box(g,'#766449',0,.45,-.18,4.99,.11,1.58);
   for(const x of [-2.27,-1.14,0,1.14,2.27])k.beam(g,'#997958',[x,.49,-.62],[x,2.59,-.62],.056);
   for(let j=0;j<4;j++)k.beam(g,'#b39b74',[-2.41,.82+j*.54,-.63],[2.41,.82+j*.54,-.63],.047);
   const arms=[-1,1].map(d=>{const nodes:T.Group[]=[];let previous:V=[0,.53,-.27];
     for(let j=0;j<13;j++){const u=(j+1)/13,segment=k.group(g),next:V=[d*(1.99*u+.18*Math.sin(u*10)),.53+1.86*u+.12*Math.sin(u*17),-.35+.14*Math.cos(u*13)];
       sprig(k,segment,previous,next,j);nodes.push(segment);previous=next;}return nodes;});
   const press=k.group(g,.30,.42,.80);k.box(press,bark,0,0,0,2.64,.20,.84);
   for(const x of [-1.09,1.09])k.box(press,brass,x,.16,0,.12,.18,.71);
   press.add(end);k.box(end,'#dfd8b4',0,.123,0,2.03,.026,.62);
   for(let j=0;j<8;j++){const x=-.82+j*.23;k.beam(end,'#809270',[x,.145,-.21+j*.039],[x+.22,.145,-.21+(j+1)*.039],.012);
     k.ball(end,green,x+.11,.147,-.13+j*.039,.066,.009,.026);}
   return(t,p,f,c,b)=>{arms.forEach((limbs,i)=>limbs.forEach((v,j)=>v.visible=j<Math.floor(6+p*6+(b===i+1?2:0)+2*unit(f))));end.position.z=.56*unit(f);end.rotation.x=-.21*unit(f);};
 }
 k.box(g,'#948b81',0,.15,0,5.52,.30,2.79);
 const corner=k.group(g,.18,.31,1.04,0,-.68);
 const facet=(d:number)=>{const side=k.group(corner,0,0,0,0,d>0?-Math.PI/2:0);
   for(let j=0;j<4;j++){const y=.29+j*.49;
     // The two bands meet edge to edge at the L; the front ends at the return wall's outside face.
     k.box(side,j%2?'#9d958a':'#c2ad8f',d>0?-1.18:-1.25,y-.22,0,d>0?2.36:2.22,.12,.28);
     for(let i=0;i<5;i++){const x=i===0?-.32:-.25-i*.465,width=i===0?.32:.428;k.box(side,(i+j)%4?'#728b95':'#c4b69c',x,y+.019,.005,width,.33,.21);
       const face=d>0?-.123:.123;k.box(side,'#887a67',x,y+.016,face,.026,.34,.033);k.box(side,'#9b8e77',x,y+.13,face*1.11,width-.008,.034,.022);}
   }
   k.box(side,'#d2b895',d>0?-1.18:-1.2675,1.99,0,d>0?2.36:2.185,.18,.35);
 };facet(-1);facet(1);
 for(let j=0;j<4;j++)k.box(corner,'#cab89a',-.015,.30+j*.49,0,.18,.41,.18);
 const view=k.group(g,.58,1.19,1.0,0,-.05);frame(k,view,2.39,1.65,'#5d5956',.071);
 view.add(end);frame(k,end,1.87,1.23,'#b99761',.064);
 return(t,p,f)=>{const u=unit(f);end.position.set(.39*(1-u),.15*(1-u),.12);end.rotation.y=.43*(1-u);view.rotation.y=-.05+.12*p;};
}


const sea='#779997',lightWood='#cfac79',darkWood='#8c654f',paper='#e2ceb0';
function buildJanuaryWeekMatch(k:Kit,g:T.Group,day:NewyearDay):Motion{
 const end=k.group(g);end.name='newyear-finale';
 k.box(g,day==='0106'?'#826f58':'#9c896f',0,.14,0,5.65,.29,2.92);
 if(day==='0106'){
   k.box(g,'#597c85',0,.30,0,5.31,.043,2.61);
   for(let j=0;j<14;j++)for(let i=0;i<22;i++)if((i+2*j)%4!==2)
     k.box(g,'#8faca1',(i-10.5)*.221,.325,(j-6.5)*.161,.113,.006,.018,Math.sin(i*j)*.30);
   const halves=[-1,1].map(s=>{
     const data=k.group(g,s*.48,.405,0);
     const shore=(i:number)=>.25*Math.sin(i*.69)+.12*Math.cos(i*1.13);
     const edge=(i:number,offset:number,height:number):V=>[shore(i)+s*offset,height,-1.09+i*.157];
     const fold=(i:number,height:number):V=>[s*(1.53+.13*Math.cos(i*.41)),height,-1.09+i*.157];
     sectionMesh(k,data,quad=>{
       for(let i=0;i<14;i++){
         quad(edge(i,.05,.25),edge(i+1,.05,.25),fold(i+1,.25),fold(i,.25),'#c9ad7f');
         quad(edge(i,.05,0),edge(i+1,.05,0),edge(i+1,.05,.25),edge(i,.05,.25),'#947656');
         quad(fold(i,.25),fold(i+1,.25),fold(i+1,0),fold(i,0),'#987b59');
       }
     });
     for(let i=0;i<15;i++){
       const x=s*(.49+i%3*.25),z=-.88+(i%6)*.36;
       k.rock(data,i%3?'#a7a684':'#bda47d',x,.27,z,.17,.059+i%2*.036,.14,i*.4);
     }
     return data;
   });
   for(const x of [-2.29,2.28]){k.box(g,brass,x,.46,1.26,.34,.27,.12);for(let i=0;i<5;i++)k.box(g,darkWood,x-.132+i*.066,.601,1.26,.013,.02,.09);}
   end.position.set(0,.36,.87);k.box(end,brass,0,.055,0,3.30,.06,.067);k.ball(end,ivory,0,.084,0,.12,.056,.12);
   return(t,p,f,c)=>{const u=unit(f),gap=.48*(1-u);halves[0].position.x=-gap*(1-p*.63-(c[0]?.2:0));
     halves[1].position.set(gap*(1-p*.63),.405,.29*(1-p)*(c[1]?.21:1)*(1-u));end.position.y=.39+.35*u;};
 }
 if(day==='0107'){
   k.box(g,sea,0,.296,.48,5.31,.05,1.53);
   k.box(g,'#d3b48a',0,.35,-.54,5.31,.16,.51);
   for(let i=0;i<9;i++)k.box(g,'#cfb790',0,.42+i*.064,-.87-i*.026,5.20,.048,.074);
   for(let j=0;j<12;j++){
     const x=(j-5.5)*.402;
     k.box(g,'#c1a481',x,.47,-1.12,.247,.145,.23);k.taper(g,'#d5b989',x,1.08,-1.12,.105,1.12);
     k.cyl(g,'#cfac79',x,1.66,-1.12,.145,.102);k.box(g,'#dec69d',x,1.75,-1.12,.302,.099,.31);
   }
   k.box(g,'#d7b88a',0,1.88,-1.13,5.09,.19,.51);
   for(let i=0;i<18;i++)k.box(g,'#b18f6a',-2.39+i*.282,1.87,-.863,.093,.067,.026);
   for(let i=0;i<48;i++)k.box(g,'#b7cabc',(i%11-5)*.48,.326,(i%5)*.27,.224,.008,.013);
   const boat=k.group(g,-1.86,.34,.84,0,.18,0,.48);
   k.box(boat,'#855c49',0,.16,0,1.20,.16,.44);
   k.put('taperUp',boat,'toon','#855c49',.73,.16,0,.23,.39,.23,0,0,-Math.PI/2);
   k.put('taperUp',boat,'toon','#855c49',-.73,.16,0,.23,.39,.23,0,0,Math.PI/2);
   k.cyl(boat,bark,0,.59,0,.042,1.05);k.put('box',boat,'toon',ivory,-.23,.73,0,.49,.44,.057,0,-.26,-.14);
   frame(k,end,2.28,1.86,darkWood,.109);
   for(const s of [-1,1])k.put('box',end,'toon',brass,s*1.04,.81,.06,.14,.14,.042,0,0,s*.4);
   return(t,p,f,c,branch)=>{const u=unit(f),route=branch===2?1:-1;
     boat.position.x=-1.86+3.56*u+(branch===2?.59:.19)*p;boat.position.y=.36+.023*Math.sin(t*2.9);
     end.position.set(route*(.84*p-.84*u),1.58-.28*u,1.05-.24*u);end.rotation.y=route*.22*(1-u)*p;};
 }
 if(day==='0108'){
   const guitar=k.group(g,-.39,.38,.58,-.58,.28,.06,1.04);
   const outline:V[]=[[-.73,-.81,0],[-1.19,-.76,0],[-1.45,-.54,0],[-1.50,-.20,0],[-1.45,.09,0],[-1.19,.34,0],[-.89,.46,0],[-.68,.70,0],[-.43,.80,0],[-.18,.77,0],[.02,.60,0],[.19,.28,0],[.21,-.23,0],[-.02,-.57,0],[-.27,-.62,0],[-.47,-.62,0]];
   sectionMesh(k,guitar,quad=>outline.forEach((a,i)=>{const b=outline[(i+1)%outline.length],top:V=[a[0],a[1],.13],next:V=[b[0],b[1],.13];
     quad(a,top,next,b,'#997155');const center:V=[-.65,-.01,.13];quad(center,top,next,center,i%5===0?'#d7b984':'#cfaa72');}));
   k.put('round',guitar,'toon','#61483f',-.69,.0,.142,.255,.018,.224,Math.PI/2);
   k.ring(guitar,ivory,-.69,0,.156,.244);k.box(guitar,darkWood,.94,-.09,.15,1.90,.31,.17);
   k.box(guitar,lightWood,2.03,-.085,.15,.46,.41,.19);k.box(guitar,'#7b5445',-1.15,-.055,.164,.22,.50,.06);
   for(let i=0;i<12;i++)k.box(guitar,'#ae9a76',.22+i*.11,-.09,.241,.025,.31,.021);
   const lines=[0,1].map((a)=>{const wires=k.group(guitar);for(let i=0;i<3;i++){
     const y=(3*a+i-2.5)*.044-.074;
     k.beam(wires,a?'#d8d8c3':'#9f8c71',[-1.20,y,.21],[2.12,y,.265],.011-a*.002);
     k.cyl(guitar,ivory,1.88+i*.15,a?.17:-.34,.153,.046,.085);}
     return wires;});
   guitar.add(end);k.box(end,'#edd4a4',0,-.085,.22,.076,.39,.078);k.box(end,brass,.015,-.085,.275,.026,.34,.027);
   return(t,p,f,c)=>{const u=unit(f);end.position.x=-1.24+.23*u;
     lines.forEach((l,i)=>{l.position.z=c[i]||u?Math.sin(t*38+i*3)*(.012+.024*u):.028*(1-p);});
     guitar.rotation.x=-.59-.31*u;};
 }
 if(day==='0109'){
   const plate=k.group(g,0,.36,.12,.27,0,0);
   k.box(plate,lightWood,0,0,0,5.21,.14,2.59);
   k.box(plate,paper,0,.082,0,4.53,.026,2.17);
   for(const x of [-2.19,2.19]){k.box(plate,darkWood,x,.165,0,.115,.14,2.43);
     for(let j=0;j<7;j++)k.cyl(plate,brass,x,.255,-1.04+j*.346,.039,.052);}
   const ribbons=[k.group(plate),k.group(plate)];
   ribbons.forEach((r,i)=>{
     const curve=(u:number):V=>i?[(.39*Math.sin(u*7)+.94*Math.sin(u*Math.PI*2))*.60,.139+Math.sin(u*9)*.017,-1.01+2.02*u]:
     [-2.09+4.18*u,.240+.048*Math.sin(u*9),.51*Math.sin(u*6)+.28*Math.sin(u*12)];
     sectionMesh(k,r,(quad)=>{for(let j=0;j<38;j++){const a=curve(j/38),b=curve((j+1)/38),w=.088;
       const corners=(p:V,d:number,h=0):V=>[p[0]+(i?d*w:0),p[1]+h,p[2]+(i?0:d*w)];
       quad(corners(a,-1),corners(b,-1),corners(b,1),corners(a,1),i?'#589093':'#bb7766');
       for(const d of [-1,1])quad(corners(a,d),corners(b,d),corners(b,d,-.028),corners(a,d,-.028),i?'#426f73':'#8c5246');
     }});
   });
   const tab=k.group(plate,.72,.119,.80);k.box(tab,paper,.28,0,0,1.76,.03,.33);
   for(let i=0;i<12;i++)k.box(tab,i%2?'#a87b65':'#789891',-.49+i*.142,.020,0,.109,.007,.19);
   plate.add(end);k.box(end,brass,0,.106,0,.60,.094,.53);k.box(end,'#a27455',0,.24,0,.31,.26,.28);
   return(t,p,f,c)=>{const u=unit(f);end.position.set(.04,.12+.34*u,.15);
     ribbons.forEach((r,i)=>{r.position[i===0?'x':'z']=(i===0?1:-1)*(.34-.28*p-(c[i]?.19:0))*(1-u);});
     plate.rotation.x=.27-.38*u;tab.position.x=.72+.40*u;};
 }
 const cover=k.group(g,0,.303,.27);
 const halfDepth=1.31;k.box(cover,'#886b53',0,-.004,0,5.36,.045,2.62);
 const panels=[-1,1].map(s=>{
   const leaf=k.group(cover,0,.045,0);k.box(leaf,paper,s*1.30,0,0,2.60,.035,halfDepth*1.84);
   for(let i=0;i<14;i++)k.box(leaf,'#ad9b7e',s*(.16+i*.166),.022,.59,(i%2?.11:.072),.007,.056);
   for(const z of [-.53,.20]){
     k.box(leaf,'#a79577',s*1.39,.022,z,2.46,.008,.10);
     for(let j=0;j<11;j++)k.box(leaf,'#e3d3ae',s*(.25+j*.212),.027,z,.09,.003,.020);
   }
   return leaf;
 });
 const frontage=[-1,1].map(s=>{const row=k.group(cover,s*.13,.028,-.58);
   for(let i=0;i<4;i++){
     const x=s*(.33+i*.55),h=.77+(i*3%5)*.118;
     k.box(row,i%3===0?'#c49d7c':'#d9b68a',x,h*.5,0,.492,h,.142);
     k.put('box',row,'toon',i%2?'#8e7971':'#9f7960',x,h+.09,-.04,.53,.105,.26,-.34);
     for(let r=0;r<2;r++)for(const a of [-1,1])k.box(row,'#7d8f89',x+a*.115,.35+r*(h-.26)*.58,.08,.134,.148,.026);
     k.box(row,darkWood,x,.124,.09,.138,.24,.045);
     k.box(row,ivory,x,.017,.133,.28,.033,.09);
   }
   return row;});
 cover.add(end);k.box(end,'#c5a278',0,.025,.07,5.02,.032,.216);for(let j=0;j<12;j++)k.box(end,ivory,-2.39+j*.435,.048,.07,.222,.018,.044);
 return(t,p,f,c,branch)=>{const u=unit(f);frontage.forEach((row,i)=>{const picked=branch===i+1?.27:0;
   row.rotation.x=-1.49+1.49*unit(.13+p*.54+picked+(c[i]?.13:0)+u);});
   panels.forEach((leaf,i)=>leaf.rotation.z=(i?1:-1)*(.13-.13*u));
   end.position.z=.77-.46*u;
 };
}
