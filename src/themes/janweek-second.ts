/** 纸带、浮片、群岛图册、原创银版街景及邮局微缩展具。 */
import * as T from 'three';
import {floor,paint,rod,ring,brass,cream,wood,iron} from './december-chapters';
import {props,table,frame,backdrop} from './monthend-chapters';
import {tiles,ease} from './midwinter-chapters';
import {grain} from './winter-chapters';
import {type Exhibit,instrument,trace,face} from './newyear-chapters';
import type {Stage} from '../level/stage';
import type {JanweekRun} from '../templates/janweek-chapters';

const ochre='#987759',creme='#e8d7ac',oiled='#483f35',cool='#56777c';
function paperStrip(st:Stage,flipped:boolean){
 return paint(st,'#e5d2a7',g=>{
   g.strokeStyle='#c2a97d';g.strokeRect(17,22,738,340);
   for(let j=0;j<10;j++){g.fillStyle='#b09a76';g.fillRect(42+j*75,69,3,15);g.fillRect(42+j*75,308,3,15);}
   g.fillStyle='#5a5541';g.beginPath();g.arc(flipped?520:249,193,34,0,2*Math.PI);g.fill();
   g.fillRect(flipped?171:445,159,142,66);
 });
}
export const telegraph:Exhibit=(b,st)=>{
 floor(b,grain(st,'#85745a'));backdrop(b,'#aaa285','#7c6950');
 for(const k of [-1,1]){
   b.box(iron,k*3.54,1.26,-3.67,.83,1.49,.20);
   b.box(creme,k*3.54,1.26,-3.535,.71,1.37,.047);
   for(let j=0;j<6;j++)b.box('#918163',k*3.54,1.64-j*.147,-3.50,.52-j%3*.043,.028,.017);
 }
 table(b,0,.62,-2.21,5.53,1.37);
 const base=b.box('#614f3c',0,.754,-2.29,3.87,.15,1.10);
 for(const k of [-1,1])b.box(brass,k*1.70,.852,base.position.z,.25,.067,.76);
 const keys=[-1,1].map(k=>props(b,[k*1.33,.85,-2.20],g=>{
   b.oval(brass,0,.063,0,.19,.094,.19,g);
   b.box('#ded1a8',0,.11,0,k<0?.21:.40,.076,.17,g);
   b.box(iron,0,.195,-.20,.073,.087,.40,g);
 }));
 for(const k of [-1,1]){
   b.cylinder('#556968',k*.70,1.03,-2.4,.18,.228,.46);
   b.cylinder('#ac8b56',k*.70,1.295,-2.4,.21,.21,.072);
   for(let j=0;j<5;j++)ring(b,'#6c6149',k*.70,.9+j*.065,-2.4,.188,.014);
   rod(b,iron,[k*.7,1.34,-2.40],[k*.39,1.57,-2.48],.038);
 }
 const roller=props(b,[0,1.03,-2.72],g=>{
   rod(b,brass,[-.51,0,0],[.51,0,0],.11,g);
   for(const k of [-1,1])b.oval('#534b3a',k*.49,0,0,.12,.16,.16,g);
 });
 const print=b.group();print.position.set(0,1.10,-2.42);
 const strips=[false,true].map(o=>b.box(paperStrip(st,o),0,0,0,2.05,.45,.028,print));
 const gauge=instrument(b,0,1.70,-2.66,1.22);
 return(old)=>{
   const s=old as JanweekRun,u=ease(s.end);
   keys.forEach((key,i)=>key.position.y=.85-(i===s.side?s.charge:0)*.095);
   roller.rotation.x=u*9.2+s.mask*1.3;print.position.set(0,1.1+u*.08,-2.42+u*.67);
   print.scale.x=Math.max(.008,u);print.visible=s.end>=0;
   strips[0].visible=s.chosen!==1;strips[1].visible=s.chosen===1;
   gauge(s.charge,s.onMark,...s.threshold);
 };
};
function waterMap(st:Stage,base:string,light:string){
 return paint(st,base,g=>{g.strokeStyle=light;g.lineWidth=2.8;
   for(let j=0;j<26;j++){g.beginPath();for(let n=0;n<47;n++){
     const x=9+n*16,y=8+14.8*j+3*Math.sin(n*.38+j);if(n)g.lineTo(x,y);else g.moveTo(x,y);
   }g.stroke();}
 });
}
export const survey:Exhibit=(b,st)=>{
 const water=waterMap(st,'#5b8c8a','#9bb9a3');floor(b,water);
 for(const side of [-1,1]){
   b.box('#a39779',side*3.30,.07,-.47,1.32,.13,2.91);
   for(let i=0;i<9;i++)b.box(i%2?'#bfac86':'#b6a47f',side*2.86,.164,-1.77+i*.31,.63,.062,.29);
   for(let j=0;j<7;j++)b.oval('#7b8576',side*3.93,.19,-2.03+j*.59,.16,.12,.17);
 }
 b.box('#747e6a',0,.09,-3.10,9.6,.56,.75);
 for(let i=0;i<23;i++){const x=-4.71+i*.427,h=.19+(.13*(i*7%6));
   rod(b,i%3?'#768d68':'#a1a478',[x,.11,-3.11],[x-.09,h,-3.19],.016);}
 const vanes=[-1,1].map((k,i)=>props(b,[k*2.32,.07,-1.40],g=>{
   b.cylinder(iron,0,.46,0,.031,.042,.91,g);
   face(b,g,i?'#904f3e':'#c6a360',[[0,.73],[.35,.92],[0,1.10]],0,.038);
   b.oval(brass,0,.05,0,.13,.058,.13,g);
 }));
 const floats=[-1,1].map((k,i)=>props(b,[k*1.37,.10,-.69],g=>{
   b.oval(i?'#a56045':'#e0c083',0,.038,0,.20,.092,.19,g);
   b.cylinder(iron,0,.17,0,.018,.026,.16,g);
 }));
 table(b,0,.64,-2.36,2.80,1.05);
 const imprint=b.group();imprint.position.set(0,.75,-2.10);frame(b,imprint,2.12,1.13,ochre);
 b.box(waterMap(st,'#d6cfab','#73918a'),0,0,.073,2.04,1.06,.046,imprint);
 const lines=[-1,1].map((k,i)=>props(b,[0,.075,0],g=>{trace(b,g,[[k*2.08,0,.32],[k*1.36,0,-.63],[k*.74,0,-1.32],[k*.34,0,-1.91]],i?'#b9d0b1':'#e4cc88',.022);}));
 return(old,t)=>{
   const s=old as JanweekRun,u=ease(s.end);
   vanes.forEach((m,i)=>m.rotation.y=(s.step&&s.chosen===i?1.44:0)+.11*Math.sin(t+i));
   floats.forEach((m,i)=>m.position.y=.12+.039*Math.sin(t*3+i));
   lines.forEach((l,i)=>l.visible=s.count>=2||s.count===1&&s.chosen===i);
   imprint.rotation.x=-1.54*(1-u);imprint.position.y=.80+u*.71;
 };
};
export const islands:Exhibit=(b,st)=>{
 floor(b,waterMap(st,'#6e9695','#a7c0a8'));
 b.box('#526a61',0,.35,-4.37,10.0,.72,.58);
 for(let j=0;j<15;j++){const x=-4.9+j*.67,y=.45+j*17%7*.08;
    b.part(new T.IcosahedronGeometry(1,0),j%2?'#79917a':'#6a8976',x,y,-4.05,.62,y,.59);}
 const samples=[-1,1].map((k,i)=>props(b,[k*2.22,.12,-2.32],g=>{
   b.part(new T.DodecahedronGeometry(1,0),i?'#9a9a70':'#b0a17a',0,.049,0,1.39,.264,1.02,g);
   for(let j=0;j<5;j++){const x=-.74+j*.37,z=j%2?.22:-.13,y=.29+j%3*.09;
     rod(b,'#496c54',[x,.14,z],[x,y+.59,z+.03],.021,g);
     for(const v of [-1,1]){const leaf=b.oval(j%2?'#658f65':'#71996e',x+v*.12,y+.42,z,.19,.035,.081,g);leaf.rotation.z=v*.48;}
   }
   for(let j=0;j<7;j++){const x=-.95+j*.30,y=.29+j*.03;
      b.oval('#99a077',x,y,-.42,.15,.08,.15,g);}
 }));
 table(b,0,.65,-2.0,1.74,.97);
 const atlas=b.group();atlas.position.set(0,.81,-1.76);
 const sheets=[-1,1].map((k,i)=>props(b,[k*.61,0,0],g=>{
    const tint=i?'#82875f':'#4f7964';
    const plate=paint(st,'#dbcf9f',ctx=>{ctx.strokeStyle=tint;ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(180,308);ctx.quadraticCurveTo(451,168,507,65);ctx.stroke();
      for(let j=0;j<9;j++){const x=226+j*28,y=275-j*22;ctx.fillStyle=tint;ctx.beginPath();ctx.ellipse(x+24*(j%2?1:-1),y,63-j*2,12,j%2?-.46:.33,0,7);ctx.fill();}});
    b.box(plate,0,.52,0,1.18,1.12,.038,g);
    b.box('#b5a071',0,.52,-.048,1.22,1.16,.05,g);
 }));
 for(const page of sheets)atlas.add(page);
 const leaves=[-1,1].map((k,i)=>b.oval(i?'#70a080':'#e2c678',k*1.27,.32,-1.13,.27,.052,.12,b.root));
 return(old,t)=>{
    const s=old as JanweekRun,u=ease(s.end);
    samples.forEach((m,i)=>m.rotation.y=(s.chosen===i?.08:0)+.025*Math.sin(t+i));
    leaves.forEach((m,i)=>{m.visible=s.step===1&&s.chosen===i||s.step===2&&s.other===i;m.position.y=.33+.09*Math.sin(t*2+i);});
    atlas.position.y=.82+u*.43;
    sheets.forEach((m,i)=>{const v=u*(s.chosen===i?1:.89)+u*u*(s.chosen===i?0:.11);m.rotation.x=-1.54*(1-v);m.rotation.y=(i?-.15:.15)*v;});
 };
};
function windowView(st:Stage,back:string,negative:boolean){
 return paint(st,back,g=>{
   const colors=negative?['#4b585b','#78857e','#cecaab']:['#b6a081','#80795e','#c4b58a'];
   g.fillStyle=colors[0];g.beginPath();g.moveTo(0,257);g.lineTo(768,196);g.lineTo(768,384);g.lineTo(0,384);g.fill();
   for(let j=0;j<6;j++){const x=j*123+33,y=124+j*37%58;
      g.fillStyle=colors[j%2];g.fillRect(x,y,101,186);g.fillStyle=colors[2];g.fillRect(x+15,y+39,22,35);g.fillRect(x+61,y+38,25,45);
      g.beginPath();g.moveTo(x-10,y+4);g.lineTo(x+48,y-45);g.lineTo(x+110,y+4);g.fill();}
   g.fillStyle=colors[2];g.fillRect(345,302,68,4);g.fillRect(460,334,121,4);
 });
}
export const silverplate:Exhibit=(b,st)=>{
 floor(b,grain(st,'#716954'));backdrop(b,'#6d6859','#4d4940');
 const raws=['#b6ac83','#627775'];
 for(const k of [-1,1]){
   const pane=b.group();pane.position.set(k*2.20,1.71,-3.70);frame(b,pane,1.6,1.53,'#584a39');
   b.box(windowView(st,raws[k===1?1:0],k===1),0,0,.070,1.52,1.44,.034,pane);
   b.box('#72604a',0,-.81,.12,1.70,.11,.32,pane);
   b.box(iron,0,0,.106,.074,1.45,.032,pane);
   b.box(iron,0,.13,.106,1.52,.066,.032,pane);
 }
 table(b,0,.59,-2.26,5.81,1.39);
 b.box(oiled,0,.837,-2.39,1.33,.37,.67);
 const bellows=props(b,[0,1.03,-2.28],g=>{
   for(let j=0;j<5;j++)b.box(j%2?'#5b4540':'#383733',0,0,j*.073,.69-j*.057,.65-j*.060,.068,g);
   b.cylinder(iron,0,0,.39,.17,.20,.16,g).rotation.x=Math.PI/2;
   b.cylinder(brass,0,0,.49,.18,.18,.07,g).rotation.x=Math.PI/2;
   b.cylinder('#728480',0,0,.532,.127,.13,.022,g).rotation.x=Math.PI/2;
 });
 const plates=[-1,1].map((k,i)=>props(b,[k*1.69,.73,-1.91],g=>{
   b.box('#666f60',0,0,0,.67,.045,.49,g);
   b.box('#a4a492',0,.032,0,.59,.022,.41,g);
 }));
 const portrait=b.group();portrait.position.set(0,.76,-1.76);
 const visuals=[false,true].map((alt,i)=>b.box(windowView(st,i?'#a6aa9c':'#d8cdac',alt),0,0,0,2.49,1.31,.045,portrait));
 frame(b,portrait,2.56,1.39,'#594732');
 const drape=b.box('#6d4b41',0,.62,.077,2.51,.14,.036,portrait);const meter=instrument(b,0,1.78,-3.60,1.33);
 return(old)=>{
   const s=old as JanweekRun,u=ease(s.end);
   plates.forEach((p,i)=>p.position.y=.73+(s.chosen===i&&s.step?.035+s.charge*.12:0));
   bellows.scale.z=1+s.charge*.24;
   portrait.position.set(0,.76+u*.75,-1.76-u*.14);portrait.rotation.x=-1.52*(1-u);
   portrait.visible=s.end>=0;drape.scale.y=Math.max(.01,8.6*(1-u));drape.position.y=.63*(u);
   visuals.forEach((v,i)=>v.visible=i===(s.chosen===1?1:0));meter(s.charge,s.onMark,...s.threshold);
 };
};
export const penny:Exhibit=(b,st)=>{
 floor(b,tiles(st,'#9c8a73','#765e50'));backdrop(b,'#aa9475','#785b44');
 for(const k of [-1,1]){
   b.box('#876142',k*2.50,1.48,-3.59,2.26,1.87,.43);
   for(let row=0;row<3;row++)for(let col=0;col<4;col++){
     const x=k*2.50+.52*(col-1.5),y=.98+row*.49;
     b.box('#513c31',x,y,-3.357,.43,.39,.057);
     b.box('#beab87',x,y-.11,-3.31,.30,.11,.032);
     b.box(brass,x,y+.24,-3.31,.15,.062,.031);
   }
 }
 table(b,0,.62,-2.06,5.71,1.11);
 const scale=props(b,[0,.74,-2.25],g=>{
   b.box('#674c38',0,.043,0,.61,.11,.49,g);b.cylinder(brass,0,.29,0,.048,.076,.44,g);
   b.oval(iron,0,.51,0,.098,.13,.067,g);
 });
 const balance=b.group();balance.position.set(scale.position.x,1.260,scale.position.z);
 rod(b,brass,[-.58,0,0],[.58,0,0],.038,balance);
 for(const d of [-1,1]){
   trace(b,balance,[[d*.52,-.018,0],[d*.72,-.39,.15],[d*.31,-.39,-.15],[d*.52,-.018,0]],ochre,.012);
   b.oval('#b89558',d*.52,-.412,0,.25,.043,.171,balance);
 }
 for(const k of [-1,1]){
   b.cylinder('#965345',k*1.68,.83,-2.19,.083,.14,.12);
   b.cylinder(wood,k*1.68,.98,-2.19,.065,.083,.18);
   const chute=b.box('#a18b65',k*2.23,.779,-1.83,.88,.049,.35);
   chute.rotation.y=-k*.51;chute.rotation.z=-k*.083;
 }
 const sacks=[-1,1].map((k,i)=>props(b,[k*2.64,.02,-1.57],g=>{
   b.oval(i?'#9a8566':'#ae956b',0,.31,0,.34,.46,.28,g);b.oval('#7e6d52',0,.70,0,.27,.062,.205,g);
   ring(b,'#c8ab6e',0,.67,0,.22,.023,g);rod(b,'#ba9b6a',[.235,.42,-.02],[.23,.21,-.01],.013,g);
 }));
 const envelope=props(b,[0,.76,-1.78],g=>{
   b.box('#e6d3ac',0,0,0,.77,.044,.49,g);
   rod(b,'#a38a66',[-.32,.027,-.17],[.01,.029,.079],.010,g);rod(b,'#a38a66',[.01,.029,.079],[.32,.027,-.17],.010,g);
   b.cylinder('#a75d47',.07,.038,.04,.051,.055,.024,g);
 });
 const meter=instrument(b,0,1.40,-3.59,1.15);
 return(old,t)=>{
    const s=old as JanweekRun,u=ease(s.end),side=s.chosen===1?1:-1;
    balance.rotation.z=.19*(s.step>=2?0:1-s.charge)*Math.sin(t*6+side);
    envelope.visible=s.step!==0&&u<.94;
    if(s.step<=2)envelope.position.set(s.step===1?-.50:side*1.70,.83,-2.02);
    else envelope.position.set(side*(1.70+.94*u),.88+.16*Math.sin(u*Math.PI)-u*.16,-2.02+.45*u);
    envelope.rotation.z=u*.45*side;sacks.forEach((m,i)=>m.scale.y=1+(i===s.chosen&&u>.70?.035*Math.sin(u*25):0));
    meter(s.charge,s.onMark,...s.threshold);
 };
};
