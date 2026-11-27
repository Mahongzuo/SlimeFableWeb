/** 纪念馆的银叶玻璃画、原创习作、手稿笔路和力学模型均为游戏演绎。 */
import * as T from 'three';
import {floor,paint,label,rod,ring,cream,iron,brass,wood,jade,red} from './december-chapters';
import {grain,peaked} from './winter-chapters';
import {tiles,ease} from './midwinter-chapters';
import {props,table,frame,backdrop} from './monthend-chapters';
import {type Exhibit,paper,face,trace,floorTrack,arc2} from './newyear-chapters';
export const slides:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#8caaa9','#718d90'));backdrop(b,'#a0b6ae','#819d94');
 for(const k of [-1,1]){b.box('#708a83',k*2.83,1.58,-3.72,1.32,2.55,.15);for(let j=0;j<3;j++)b.box('#d0c8a7',k*2.83,.62+j*.79,-3.605,1.27,.078,.14);}
 table(b,-.46,.52,-2.27,5.39,1.38);
 const scope=props(b,[-1.08,.65,-2.17],g=>{
   b.oval(iron,0,.06,0,.75,.15,.44,g);trace(b,g,[[-.30,.10,0],[-.62,.47,0],[-.69,1.13,0],[-.52,1.50,0],[-.16,1.65,0],[.19,1.55,0]],'#37575b',.143);
   const barrel=rod(b,iron,[.32,1.13,.02],[-.04,2.08,.02],.145,g);
   rod(b,brass,[-.06,2.03,.02],[-.14,2.28,.02],.18,g);rod(b,brass,[.32,1.15,.02],[.37,.98,.02],.062,g);
   b.box(iron,.15,.69,.04,.98,.09,.52,g);b.oval(brass,-.52,1.26,.18,.13,.13,.08,g);
   const disk=b.cylinder('#b0c7bd',.13,.27,.03,.24,.24,.06,g);disk.rotation.z=.36;
 });
 const layers=[-1,1].map((k,i)=>props(b,[k*1.87,.10,-.63],g=>{b.box(i?'#78a7ad':'#a2c3ac',0,0,0,.93,.071,.46,g);for(const end of [-1,1])b.box('#d2ceaa',end*.41,.046,0,.09,.018,.44,g);}));
 const lightbox=props(b,[1.32,1.39,-2.94],g=>{frame(b,g,1.91,1.59,'#675c4e');b.box(paper(st,'silver'),0,0,0,1.83,1.52,.07,g);});
 const blur=b.box(st.toon('#adc8ba',{transparent:true,opacity:.7}),1.32,1.39,-2.826,1.80,1.49,.026,b.root);
 const knob=props(b,[0,.18,.60],g=>{const dial=b.cylinder(iron,0,0,0,.34,.34,.24,g);b.box(brass,.17,.131,0,.31,.032,.055,g);});
 return(s,t)=>{layers.forEach((m,i)=>{const a=(s.mask&(1<<i))?1:0;m.position.set(a?-.93:(i?1:-1)*1.87,a?1.408+i*.081:.10,a?-2.13:-.63);});
   knob.rotation.y=s.focus*4.65;const u=ease(s.end);lightbox.position.y=1.39+u*.24;blur.position.y=lightbox.position.y;
   blur.visible=s.end<0;(blur.material as T.Material).opacity=s.mask===3?Math.min(.88,Math.abs(s.focus-s.focusGoal)*1.7):.92;
 };
};
export const classroom:Exhibit=(b,st)=>{
 floor(b,grain(st,'#aa9270'));backdrop(b,'#d9cbb1','#b39870');
 const windows=[-1,1].map((k,i)=>{const g=props(b,[k*1.48,1.71,-3.47],group=>{
   frame(b,group,1.73,2.36,'#654d3c');
   for(let r=0;r<3;r++)for(let c=0;c<2;c++)b.box((i?['#d99a56','#d4b672','#d08a59']:['#76a8ac','#708eaa','#85b4b1'])[(c+r)%3],(c-.5)*.77,(r-1)*.69,0,.70,.63,.065,group);
 });return g;});
 table(b,0,.50,-1.58,3.78,1.48);const sheet=b.box('#eedeb5',0,.634,-1.57,2.86,.069,1.13,b.root);
 const stains=[-1,1].map((k,i)=>b.oval(i?'#d49148':'#60949f',k*.77,.684+i*.023,-1.57,.54,.016,.39,b.root));
 ring(b,'#a38c65',0,.694,-1.57,.34,.015);
 for(let j=0;j<3;j++){const x=-2.4+j*2.38;b.box(wood,x,.37,.32,1.10,.13,.44);for(const k of [-1,1])b.box('#82654e',x+k*.4,.16,.32,.08,.32,.30);}
 const result=[0,1].map(first=>props(b,[.15,.36,-.78],g=>{frame(b,g,2.27,1.25);
   const painted=paint(st,first?'#e8c694':'#a6c7c2',ctx=>{
     const polygon=(color:string,pts:number[][])=>{ctx.fillStyle=color;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
     const cold='#759a9a',warm='#d2a36c';
     ctx.fillStyle=first?'#ecd3a4':'#e1b87e';ctx.beginPath();ctx.arc(first?234:515,144,70,0,arc2);ctx.fill();
     for(let k=0;k<4;k++){const h=125+k*39,d=first?50:-20;
       polygon([cold,'#94ad9e',warm,'#839987'][first?3-k:k],[[28,352],[28,h+67],[148+d,h-32],[264+d,h+34],[392+d,h-52],[506+d,h+11],[635+d,h-36],[740,h+3],[740,352]]);}
     ctx.strokeStyle='#ede0bf';ctx.lineWidth=10;ctx.strokeRect(20,19,728,346);
   });b.box(painted,0,0,0,2.18,1.16,.052,g);
 }));
 return(s,t)=>{const u=ease(s.end);windows.forEach((g,i)=>{g.rotation.y=(s.meter[i]-.5)*.89;stains[i].position.x=(s.meter[i]-.5)*2.62;});
   result.forEach((g,i)=>{g.visible=s.end>=0&&s.chosen===i;g.position.y=.81+.53*u;g.rotation.x=-1.42+1.40*u;g.rotation.z=i?-.08:.08;});
 };
};
export const courtyard:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#aea991','#918e79'));
 b.box('#b7af90',0,1.37,-4.09,7.27,2.74,.24);
 const moon=ring(b,'#756e5e',-.89,1.53,-3.89,1.11,.114,b.fixed,false);
 const view=b.cylinder('#aac3b0',-.89,1.53,-3.90,1.02,1.02,.07);view.rotation.x=Math.PI/2;
 for(let j=0;j<4;j++){const x=-1.62+j*.42;rod(b,'#6b8777',[x,.93,-3.83],[x+.10,1.76+(j%2)*.34,-3.83],.028);for(let k=0;k<3;k++)b.oval('#8da28a',x+(k-.8)*.12,1.61+k*.12,-3.79,.19,.092,.047);}
 for(const k of [-1,1]){b.box('#756c5b',k*3.05,1.44,-2.74,.20,2.88,.25);}
 b.box('#786951',0,2.88,-2.74,6.45,.18,.31);for(let j=0;j<9;j++)b.box('#837257',-2.83+j*.70,3.01,-2.88,.10,.10,.81);
 table(b,.67,.54,-1.88,3.25,1.19);
 const page=props(b,[.68,.68,-1.88],g=>{b.box(paper(st,'ink'),0,0,0,2.19,.065,.94,g);});
 for(const k of [-1,1]){b.oval(iron,k*2.08,.094,.00,.33,.105,.23);b.oval('#3c5550',k*2.08,.194,.00,.21,.025,.13);}
 const strokes=[-1,1].map((k,i)=>{const at=[i?1.14:.95,.067,i?.55:-.64],color=i?'#665447':'#4b7272';
   const first=props(b,[0,0,0],g=>{trace(b,g,[[-2.12,.067,.36],[k*.50,.067,i?.69:-.69],at],color,.045);
     ring(b,'#d6b373',at[0],.081,at[2],.19,.029,g);});
   const end=props(b,[0,0,0],g=>trace(b,g,[at,[1.66,.067,i?.13:-.74],[2.10,.067,-.45]],color,.045));
   return {first,end};});
 const halo=ring(b,'#ebce86',-.89,1.53,-3.74,.91,.050,b.root,false);
 return(s,t)=>{strokes.forEach(({first,end},i)=>{first.visible=s.chosen===i;end.visible=first.visible&&s.count>0;});halo.visible=s.ready;halo.scale.setScalar(.62+.37*ease(s.end));const u=ease(s.end);page.position.y=.68+u*.66;page.rotation.x=u*1.27;};
};
export const lever:Exhibit=(b,st)=>{
 floor(b,grain(st,'#9c8a74'));backdrop(b,'#858e83','#69786f');
 b.box(paint(st,'#45645f',g=>{g.strokeStyle='#d6cf9d';g.lineWidth=3;for(let j=0;j<9;j++){g.beginPath();g.moveTo(68,57+j*31);g.lineTo(682,57+j*31);g.stroke();}
 g.lineWidth=9;g.beginPath();g.moveTo(109,258);g.lineTo(321,128);g.lineTo(591,217);g.stroke();}),0,1.83,-3.78,4.20,1.73,.12);
 table(b,0,.53,-2.03,5.37,1.56);
 const beam=props(b,[0,1.30,-1.92],g=>{b.box('#9e805c',0,0,0,4.32,.16,.44,g);b.box(brass,0,.093,.01,4.17,.023,.08,g);
 for(let j=-8;j<=8;j++)b.box(cream,j*.235,.096,.14,.026,.027,j%2?.057:.10,g);});
 const supports=props(b,[0,.64,-1.92],g=>{face(b,g,'#566a66',[[-.40,0],[.40,0],[0,.65]],-.15,.30);});
 const weights=[-1,1].map((k,i)=>props(b,[k*.91,1.55,-1.92],g=>{b.cylinder(i?'#8b8072':'#ba975f',0,.04,0,.23,.30,.32,g);
 b.cylinder(brass,0,.23,0,.099,.14,.08,g);ring(b,iron,0,.34,0,.088,.026,g,false);}));
 const bridge=props(b,[0,.93,-1.12],g=>{b.box(wood,0,0,0,3.05,.09,.37,g);for(let j=0;j<9;j++)b.box('#c7ae87',-1.40+j*.35,.067,0,.31,.036,.38,g);});
 const dial=props(b,[-.05,1.79,-2.53],g=>{const faceplate=b.cylinder('#e2cc99',0,0,0,.34,.34,.085,g);faceplate.rotation.x=Math.PI/2;
   for(let j=0;j<9;j++){const a=(j-4)*.26;rod(b,iron,[.245*Math.sin(a),.245*Math.cos(a),.056],[.296*Math.sin(a),.296*Math.cos(a),.056],.010,g);}});
 const dialHand=props(b,[-.05,1.79,-2.454],g=>{rod(b,iron,[0,-.06,0],[0,.28,0],.015,g);b.oval(brass,0,0,.019,.037,.037,.021,g);});
 const dialMark=props(b,[-.05,1.79,-2.452],g=>{face(b,g,'#a05442',[[-.034,.294],[.034,.294],[0,.245]],.023,.013);});
 const prop=b.box('#76877c',1.04,.53,-1.12,.17,1.04,.25,b.root);
 return(s,t)=>{const angle=(s.mask===3?0:(s.meter[0]-s.meter[1])*.29);beam.rotation.z=angle;
 weights.forEach((m,i)=>{const x=(i?1:-1)*(.55+1.25*s.meter[i]);m.position.set(x*Math.cos(angle),1.54+x*Math.sin(angle),-1.92);m.rotation.z=angle;});
 const side=s.side>=0?s.side:s.chosen>=0?s.chosen:0;dialHand.rotation.z=(.5-s.meter[side])*2.1;dialMark.rotation.z=(.5-(s.mask?s.balance:side?.64:.38))*2.1;
 bridge.rotation.z=angle*.67;prop.scale.y=1.04-.77*ease(s.end);prop.position.y=prop.scale.y/2;};
};
