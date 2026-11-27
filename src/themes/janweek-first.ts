/** 原创译桌、车渡、山水、天图和街区展具。 */
import * as T from 'three';
import {type Bench,floor,paint,rod,ring,iron,brass,cream,wood,batch} from './december-chapters';
import {table,frame,props} from './monthend-chapters';
import {grain} from './winter-chapters';
import {tiles,ease} from './midwinter-chapters';
import {instrument,trace,books,floorTrack,type Exhibit} from './newyear-chapters';
import type {Stage} from '../level/stage';
import type {JanweekRun} from '../templates/janweek-chapters';

const pewter='#708a89',indigo='#324f5d',pine='#5c6248',ink='#293e43';
function blockWall(b:Bench,color:string,trim:string){
 b.box(color,0,1.52,-3.98,9.8,3.04,.23);
 b.box(trim,0,.12,-3.82,9.74,.16,.075);
 b.box(trim,0,2.90,-3.82,9.74,.12,.075);
}
function domeLamp(b:Bench,g:T.Object3D,col:string,x:number,y:number,z:number){
 const stem=b.cylinder(iron,x,y+.09,z,.028,.034,.18,g);
 const shade=b.cylinder(col,x,y+.22,z,.10,.22,.18,g);shade.position.z=stem.position.z;
 b.oval('#f3d489',x,y+.13,z,.124,.043,.115,g);
}
function casement(b:Bench,x:number,h:number,tint:string){
 const y=1.86,z=-3.83;
 b.box('#483d35',x,y,z,1.49,h+.16,.12);
 b.box(tint,x,y,z+.081,1.32,h,.036);
 b.box('#71533c',x,y,z+.12,.068,h+.02,.052);
 b.box('#71533c',x,y+.16,z+.12,1.30,.065,.052);
 b.box('#90704d',x,y-h/2-.06,z+.13,1.56,.105,.27);
}
function mountain(st:Stage,inkOrder:boolean){
 return paint(st,'#e6d4a9',g=>{
  g.strokeStyle='#9d8a69';g.strokeRect(23,21,722,344);
  g.fillStyle='#d8bd8e';g.beginPath();g.arc(560,94,36,0,Math.PI*2);g.fill();
  for(let i=0;i<2;i++){
   const x=i*301,deep=(i===1)===inkOrder;
   g.fillStyle=deep?'#3b5550':'#788e79';g.beginPath();g.moveTo(49+x,280);
   [[104,217],[180,118],[225,152],[270,72],[351,198],[416,285]].forEach(([u,v])=>g.lineTo(u+x,v));g.fill();
   g.strokeStyle=deep?'#6b8273':'#98a08a';g.lineWidth=2;
   for(let n=0;n<12;n++){g.beginPath();g.moveTo(x+175+n*12,153+n*5);g.lineTo(x+134+n*16,261-n*2);g.stroke();}
  }
  g.fillStyle='#a15442';g.fillRect(641,270,26,26);g.fillRect(673,295,23,23);
 });
}
export const translation:Exhibit=(b,st)=>{
 floor(b,grain(st,'#917859'));blockWall(b,'#b7ae8c','#766048');
 casement(b,0,1.57,'#7a9a98');books(b,-3.32,-3.37,2);books(b,3.33,-3.37,2);
 table(b,0,.57,-2.16,5.45,1.35);
 for(const side of [-1,1]){
   b.box('#c5ad78',side*2.28,.10,.14,.65,.079,.48);b.box(iron,side*2.42,.155,.08,.20,.07,.18);
   b.box(wood,side*2.73,.63,-2.35,.74,.11,.43);
   for(let n=0;n<4;n++)b.box(n%2?'#ad9a72':'#d0bd96',side*2.73+n*.006,.71+n*.055,-2.34,.61,.045,.36);
 }
 const lamp=props(b,[0,.71,-2.55],g=>{
   b.cylinder(iron,0,.02,0,.17,.21,.065,g);rod(b,brass,[0,.05,0],[.34,.63,0],.041,g);
   domeLamp(b,g,'#537769',.44,.48,.08);
 });
 const desk=b.group();desk.position.set(0,.83,-1.88);
 const folio=(mirror:boolean)=>paint(st,'#f0dfb7',g=>{
    g.strokeStyle='#ae956c';g.strokeRect(33,25,696,327);
    g.fillStyle='#735546';g.fillRect(376,33,3,311);
    for (let n=0;n<9;n++)for (const c of [0,1]){
      g.fillStyle=n===0?'#663b33':'#5e6254';
      g.fillRect(76+c*355,65+n*29,220-(n*7+c*21+(mirror?23:0))%67,n===0?13:4);
    }
    g.fillStyle='#9d5439';g.fillRect(mirror?557:157,313,44,11);
 });
 const pages=[b.box(folio(false),0,.63,0,2.77,1.28,.042,desk),b.box(folio(true),0,.63,0,2.77,1.28,.042,desk)];
 const pageLight=st.toon('#e9ca80',{emissive:'#c99538',emissiveIntensity:.48});
 const pads=[b.box(pageLight,-1.33,.685,-2.0,1.16,.034,.45),b.box(pageLight,1.34,.686,-2.0,1.13,.035,.45)];
 pads.forEach((p,i)=>p.name=i?'translation-right-lit':'translation-left-lit');
 const signs=[
   [-1.87,-1.13,'左栏'],[1.88,-1.20,'右栏'],[.06,1.00,'册扣'],
 ] as const;
 for(const [x,z,caption] of signs){
   const tag=paint(st,'#c8b38a',g=>{
      g.strokeStyle='#715a3c';g.lineWidth=12;g.strokeRect(25,24,718,336);
      g.textAlign='center';g.textBaseline='middle';g.font='bold 183px sans-serif';g.fillStyle='#4b392e';g.fillText(caption,384,196);
   });
   b.box(tag,x,.032,z,.97,.058,.33,b.root,'translation-label-fx');
 }
 let previousTime=0;
 return(old,t)=>{
   const s=old as JanweekRun,u=ease(s.end),dt=Math.max(0,Math.min(.05,t-previousTime));
   previousTime=t;
   const direction=s.side<0||s.ready?0:s.side===0?.84:-.84;
   lamp.rotation.y=T.MathUtils.damp(lamp.rotation.y,direction,10,dt);
   pads.forEach((p,i)=>p.visible=!!(s.mask&(1<<i)));
   desk.rotation.x=(1-u)*(-1.53);desk.position.z=-1.88+u*.08;
   pages.forEach((p,i)=>p.visible=i===(s.chosen===1?1:0));
 };
};
export const ferry:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#829c9b','#657e83'));
 b.box(paint(st,'#548f96',g=>{g.strokeStyle='#a1b2a1';g.lineWidth=2;for(let j=0;j<15;j++){g.beginPath();for(let i=0;i<24;i++){const x=i*34,y=j*25+5*Math.cos(i*.43+j);if(i)g.lineTo(x,y);else g.moveTo(x,y);}g.stroke();}}),0,-.18,-4.31,11.3,.25,3.21);
 for(const k of [-1,1]){
   b.box('#807869',k*2.84,.10,-3.18,1.03,.55,1.20);
   for(let j=0;j<8;j++)b.box('#917b56',k*2.83,.422,-3.65+j*.136,1.03,.06,.115);
   for(const offset of [-.41,.41]){
     b.cylinder(iron,k*2.83+offset,.56,-3.68,.071,.083,.24);
     b.cylinder(iron,k*2.83+offset,.56,-2.67,.071,.083,.24);
   }
   b.box('#b2a77b',k*3.07,.86,-3.48,.42,.83,.43);domeLamp(b,b.fixed,'#815246',k*3.07,1.25,-3.48);
 }
 for(let j=0;j<12;j++)b.box('#665c4e',0,.043,-.70+j*.276,.94,.065,.107);
 for(const x of [-.27,.27])b.box(iron,x,.133,-.098,.054,.044,4.602);
 const ship=props(b,[0,.31,-3.90],g=>{
   b.box('#376574',0,-.233,0,4.50,.236,1.54,g);
   for(const k of [-1,1]){
     b.box('#3c6872',k*1.42,.005,0,1.68,.252,1.54,g);
     b.box('#e4d1a8',k*1.452,.172,0,1.744,.082,1.62,g);
   }
   b.box('#876d56',0,-.093,.033,1.16,.043,1.62,g);
   for(let i=0;i<7;i++)b.box('#655546',0,-.048,.685-i*.208,.90,.045,.082,g);
   for(const x of [-.27,.27])b.box(iron,x,-.002,.025,.058,.071,1.59,g);
   b.box(cream,-.63,.52,-.45,3.24,.42,.58,g);
   b.box('#a86449',-.62,.77,-.42,3.34,.086,.73,g);
   b.box(cream,-1.91,1.03,-.38,1.02,.44,.68,g);
   b.box('#526b69',-1.91,1.27,-.38,1.13,.10,.77,g);
   for(let j=0;j<12;j++)b.box(indigo,-1.98+j*.267,.60,-.09,.158,.142,.033,g);
   for(const x of [-1.62,1.54]){b.cylinder('#854633',x,.97,-.60,.12,.14,.50,g);b.cylinder(iron,x,1.21,-.60,.13,.15,.060,g);}
 });
 const ramp=props(b,[0,.0645,-2.40],g=>{
   b.box(pewter,0,0,-.346,.94,.085,.691,g);
   for(const z of [-.18,-.36,-.54])b.box('#c3a260',0,.060,z,.86,.035,.036,g);
   for(const x of [-.27,.27])b.box(iron,x,.055,-.344,.052,.075,.687,g);
 });
 const railcar=props(b,[0,.252,-.88],g=>{
   b.box('#3b695b',0,.11,0,.47,.45,1.25,g);b.box('#c4b97f',0,.36,0,.52,.093,1.33,g);
   for(const k of [-1,1])for(let j=0;j<5;j++)b.box('#c0b8a0',k*.246,.228,-.465+j*.23,.038,.135,.14,g);
   for(const k of [-1,1])for(const z of [-.45,.45])b.oval(iron,k*.235,-.057,z,.057,.08,.08,g);
 });
 const weights=[-1,1].map(k=>props(b,[k*1.92,.26,-1.39],g=>{
   b.box('#b1a784',0,.23,0,.34,.53,.33,g);rod(b,iron,[0,.5,0],[0,1.08,0],.025,g);ring(b,brass,0,1.14,0,.082,.027,g,false);
 }));
 ship.name='rail-ferry-ship';ramp.name='rail-ferry-hinge';railcar.name='rail-ferry-car';
 const gauge=instrument(b,0,1.37,-3.02);
 return(old)=>{
   const s=old as JanweekRun,u=ease(s.end);
   ship.position.y=.1+(s.ready?.50:s.dockLevel)*.29;
   ramp.rotation.x=.174+(s.ready?0:(s.pin?0:.13)+(s.dockLevel-.5)*.39);
   railcar.position.z=-.88-2.51*u;railcar.position.y=.266+.122*Math.max(0,Math.min(1,(-railcar.position.z-2.40)/.68));
   weights.forEach((p,i)=>p.position.y=(i===s.chosen&&s.count)?.12:.3);
   gauge(s.dockLevel,s.aligned,.33,.67);
 };
};
export const inkstone:Exhibit=(b,st)=>{
 floor(b,grain(st,'#987453'));blockWall(b,'#aaa587','#6e5942');
 for(const k of [-1,1]){
   for(let j=0;j<4;j++)b.box('#826047',k*(2.86+j*.34),1.6,-3.83,.052,2.4,.08);
   casement(b,k*2.86,1.96,'#8ca29b');
 }
 b.box('#705842',0,1.91,-3.81,2.99,1.73,.095);
 const back=paint(st,'#c4bea0',g=>{g.strokeStyle='#8e9981';for(let j=0;j<27;j++){
   const x=j*29,y=140+Math.sin(j*.92)*28;g.beginPath();g.moveTo(x,365);g.quadraticCurveTo(x+96,235,x+139,y);g.stroke();}});
 b.box(back,0,1.91,-3.745,2.79,1.53,.032);
 table(b,0,.61,-2.10,5.33,1.42);
 const bowl=props(b,[-1.81,.72,-2.18],g=>{
   b.oval('#4c5757',0,.05,0,.69,.115,.51,g);
   b.oval('#253838',0,.119,-.025,.52,.025,.37,g);
   b.oval('#172d30',-.08,.144,-.02,.38,.012,.27,g);
 });
 const pestle=props(b,[-1.9,.90,-2.14],g=>{
    b.cylinder(ink,0,0,0,.091,.11,.31,g);b.box('#866446',0,.18,0,.13,.045,.13,g);
 });
 for(let j=0;j<4;j++){
   rod(b,['#ab8051','#745943','#957050','#be9163'][j],[.92+j*.25,.81,-2.54],[1.42+j*.25,.81,-1.74],.032);
   rod(b,ink,[1.42+j*.25,.81,-1.74],[1.52+j*.25,.81,-1.64],.024);
 }
 const roll=b.group();roll.position.set(.30,.78,-1.86);
 for(const y of [0,1.36])rod(b,wood,[-1.48,y,.01],[1.48,y,.01],.062,roll);
 const views=[b.box(mountain(st,false),0,.68,0,2.82,1.36,.044,roll),b.box(mountain(st,true),0,.68,0,2.82,1.36,.044,roll)];
 const slide=instrument(b,.19,1.43,-2.36);
 return(old,t)=>{
   const s=old as JanweekRun,u=ease(s.end),a=s.charge*6.6+s.step;
   roll.rotation.x=(1-u)*(-1.53);roll.position.set(.30,.78+u*.45,-1.86-u*.26);
   views.forEach((v,i)=>v.visible=i===(s.chosen===1?1:0));
   pestle.position.x=bowl.position.x+Math.cos(a)*.20;pestle.position.z=bowl.position.z+Math.sin(a)*.14;
   pestle.rotation.z=.76+.07*Math.sin(t*2);
   slide(s.charge,s.onMark,...s.threshold);
 };
};
export const lobster:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#697d83','#506671'));blockWall(b,'#304b55','#617477');
 const display=paint(st,'#203244',g=>{
   for(let i=0;i<141;i++){g.fillStyle=i%5?'#89a0aa':'#e3d499';g.fillRect(27+i*171%712,32+i*113%319,i%7?2:4,i%7?2:4);}
   g.strokeStyle='#9db4b2';g.lineWidth=3;
   for(let s=0;s<6;s++){g.beginPath();g.ellipse(384,187,60+s*44,36+s*21,-.17,0,Math.PI*2);g.stroke();}
   g.strokeStyle='#e3ad7b';g.lineWidth=12;g.beginPath();g.moveTo(134,94);g.lineTo(283,191);g.lineTo(481,137);g.lineTo(646,254);g.stroke();
 });
 const screen=b.group();screen.position.set(0,1.60,-3.63);frame(b,screen,4.65,2.38,'#55696f');
 b.box(display,0,0,.081,4.58,2.30,.039,screen);
 const shutters=[-1,1].map(k=>b.box('#334d59',k*1.17,0,.164,2.26,2.26,.089,screen));
 const halo=b.group();halo.position.set(0,.82,-2.5);
 const plate=props(b,[0,0,0],g=>{
   b.box('#43616e',0,0,0,2.02,.91,.33,g);b.box('#d9bd80',0,.052,.181,1.87,.74,.06,g);
   for(let j=0;j<11;j++)b.box(indigo,-.832+j*.166,.055,.221,.037,.73,.034,g);
   for(let j=0;j<5;j++)b.box(indigo,0,-.23+j*.14,.246,1.70,.030,.034,g);
   for(const x of [-.94,.94])b.cylinder(iron,x,-.49,0,.065,.125,.60,g);
 });
 halo.add(plate);plate.position.set(0,0,0);
 const signal=b.oval('#ffca7a',0,1.42,-3.36,.19,.15,.045,b.root);
 const lamps=[-1,1].map(k=>b.oval('#ffd587',k*1.78,1.63,-3.32,.165,.165,.065,b.root));
 for(const k of [-1,1]){
   b.box('#4b6471',k*3.67,.76,-2.8,1.09,1.52,.81);
   for(let j=0;j<9;j++)b.box('#a6b6ab',k*3.66+.37*Math.cos(j*.68),.40+j*.078,-2.375,.045,.036,.023);
 }
 const gauge=instrument(b,0,2.92,-3.58,1.82);
 return(old,t)=>{
   const s=old as JanweekRun,u=ease(s.end);
   shutters.forEach((m,i)=>m.position.x=(i?1:-1)*(1.17+2.50*u));
   halo.rotation.y=.22*Math.sin(s.turn);signal.position.x=(s.scanPosition-.5)*4.20;
   signal.visible=!s.ready&&s.step>0;
   lamps.forEach((m,i)=>m.visible=s.count>=2||s.count===1&&s.chosen===i||s.scan(i));
   gauge(s.scanPosition,s.locked,s.side===1?.72:0,s.side===1?1:.28);
 };
};
export const dispatch:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#99a49a','#798e89'));blockWall(b,'#a8afa0','#656f60');
 const map=b.group();map.position.set(0,.80,-2.7);
 const urban=paint(st,'#c7c3a4',g=>{
   g.fillStyle='#758c83';g.fillRect(29,157,710,39);g.fillRect(355,22,33,340);
   g.fillStyle='#98977a';for(let z=0;z<3;z++)for(let x=0;x<8;x++){
    if(x===3||x===4)continue;g.fillRect(53+x*86,57+z*102,52,37);}
   g.strokeStyle='#b3a077';g.lineWidth=8;g.beginPath();g.moveTo(38,347);g.lineTo(277,220);g.lineTo(617,337);g.stroke();
 });
 b.box(wood,0,0,0,5.57,.18,1.46,map);b.box(urban,0,.107,0,5.42,.024,1.37,map);
 for(let j=0;j<15;j++){
   const x=-2.48+j*.347,h=.14+(j*17%9)*.049,z=j%3===0?-.37:.37,c=['#9b8470','#728783','#dccbb1'][j%3];
   b.box(c,x,.12+h/2,z,.26,h,.27,map);
   b.box('#776451',x,.126+h,z,.30,.065,.30,map);
   if(j%3===2)for(let row=0;row<3;row++)b.box('#dcbf7c',x,.171+row*.083,z+.14,.087,.034,.016,map);
 }
 const stripes=[-1,1].map((k,i)=>props(b,[0,.15,0],g=>{trace(b,g,[[0,0,.08],[k*.65,0,.08],[k*.88,0,-.23],[k*1.79,0,-.23],[k*2.29,0,.07]],i?'#f4c467':'#9ad4ca',.022);}));
 batch(map);
 for(const stripe of stripes)map.add(stripe);
 for(const side of [-1,1]){
   table(b,side*2.33,.65,-1.73,1.08,.79);
   b.box(iron,side*2.35,.785,-1.86,.55,.195,.37);
   const ph=b.box('#52594d',side*2.35,.922,-1.85,.51,.06,.14);ph.rotation.y=.17*side;
   for(let n=0;n<5;n++)b.box('#c0b589',side*2.35+(n-2)*.067,.89,-1.74,.04,.033,.032);
   b.box('#677b76',side*3.61,1.22,-3.70,1.33,1.78,.25);
   b.box('#a6b5a5',side*3.61,1.65,-3.52,.95,.50,.15);
 }
 const meter=instrument(b,0,.63,-1.8,.95);
 return(old,t)=>{
   const s=old as JanweekRun,u=ease(s.end);map.rotation.x=u*.50;map.position.y=.80+u*.52;
   stripes.forEach((m,i)=>{m.visible=!!(s.mask&(1<<i));m.position.y=.15+u*.010*Math.sin(t*5+i);});
   meter(s.charge,s.onMark);
 };
};
