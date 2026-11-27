import * as T from 'three';
import {Kit} from './folio-landmarks';
import type {MidwinterReception} from '../templates/midwinter-skirmish';
import type {Vec} from '../slime/types';
const ink='#344955',ivory='#ebe3c9',brass='#d6a45e',teal='#679c9a',rust='#b76a4d',glow='#ffda78';
export const midwinterGround:Record<string,string>={cartworks:'#8a9d7d',dunes:'#c4a07a',returnmark:'#656e83',halves:'#84999b',nest:'#34455f'};
export const midwinterEyes:Record<string,Vec>={cartworks:[4.4,4.3,10.2],dunes:[5.6,4.2,10.8],returnmark:[4.6,3.8,10.8],halves:[5.4,4.35,11],nest:[4.2,4.55,10.9]};
export const midwinterOutlines:Record<string,[number,number][]>={
 cartworks:[[-2.1,7],[2.1,7],[2.1,3.7],[4.9,2.7],[4.9,-2.9],[2.6,-3.9],[2.6,-7],[-2.6,-7],[-2.6,-3.4],[-4.8,-2.6],[-4.8,2.7],[-2.1,3.7]],
 dunes:[[-1.9,7],[2.3,7],[2.7,3.1],[4.75,2.2],[4.8,-1.6],[2.15,-4.4],[1.8,-7],[-2.05,-7],[-2.9,-3.3],[-4.9,-2.7],[-4.8,1.5],[-2.3,3.4]],
 returnmark:[[-2.5,7],[2.3,7],[4.7,2.7],[4.7,-2.75],[2.7,-4.15],[2,-7],[-2,-7],[-2.7,-4.1],[-4.7,-2.6],[-4.7,2.55]],
 halves:[[-2.3,7],[2.3,7],[2.3,3.1],[4.8,3.1],[4.8,-3.25],[2.3,-3.25],[2.3,-7],[-2.3,-7],[-2.3,-3.25],[-4.8,-3.25],[-4.8,3.1],[-2.3,3.1]],
 nest:[[-1.9,7],[1.9,7],[1.9,4.0],[4.65,2.3],[4.65,-2.4],[2.0,-4.1],[2,-7],[-2,-7],[-2,-4.1],[-4.65,-2.4],[-4.65,2.3],[-1.9,4]]
};
export function paintMidwinterDeck(g:CanvasRenderingContext2D,c:MidwinterReception){
 const d=c.day;
 const line=(x:number,y:number,xx:number,yy:number,col:string,w:number)=>{g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();};
 if(d==='1213'){
   g.fillStyle='#6e7373';g.beginPath();g.moveTo(250,840);g.bezierCurveTo(130,620,455,355,251,0);g.lineTo(395,0);g.bezierCurveTo(585,355,270,620,395,840);g.fill();
   g.setLineDash([17,22]);g.strokeStyle=ivory;g.lineWidth=4;g.beginPath();g.moveTo(322,840);g.bezierCurveTo(204,620,520,355,323,0);g.stroke();g.setLineDash([]);
   for(let j=0;j<260;j++){const x=j*73%640,y=j*39%840;if(Math.abs(x-320)>165)line(x,y,x+15+j%21,y-3,'#9a774f65',2);}
 }else{
   for(let i=0;i<18;i++){line(0,i*54,640,i*54,'#3c53634d',2);for(let j=0;j<8;j++){const x=j*91+(i%2)*33;line(x,i*54,x,i*54+51,'#56657560',1);}}
   if(d==='1212')for(let i=0;i<24;i++)for(const x of [230,405])line(x,95+i*24,x+11,82+i*24,'#e4c48b',3);
   if(d==='1214'){g.strokeStyle='#e1a853';g.lineWidth=8;g.beginPath();g.ellipse(320,390,200,245,0,3.2,5.7);g.stroke();}
   if(d==='1215')for(const x of [307,333])line(x,675,x,120,'#dac381',5);
   if(d==='1216')for(const x of [200,440]){line(320,620,x,520,brass,4);line(x,520,x,375,brass,4);line(x,375,320,220,brass,4);}
 }
}
export function midwinterPad(k:Kit,o:T.Group,c:MidwinterReception,i:number){
 switch(c.day){
 case '1212':k.box(o,ink,0,.15,0,.57,.30,.51);k.box(o,i%2?rust:teal,0,.46,0,.39,.30,.13);break;
 case '1213':k.beam(o,ink,[0,0,0],[0,.72,0],.045);k.box(o,brass,0,.55,0,.68,.28,.077);k.box(o,ink,.02,.55,.05,.36,.045,.018);break;
 case '1214':k.taper(o,ink,0,.17,0,.25,.34);k.ring(o,ivory,0,.56,0,.27,-.16);break;
 case '1215':k.box(o,ink,0,.11,0,.68,.22,.59);k.beam(o,brass,[-.25,.13,0],[0,.51,0],.06);k.beam(o,brass,[.25,.13,0],[0,.51,0],.06);break;
 case '1216':k.cyl(o,teal,0,.11,0,.28,.22);k.ball(o,glow,0,.38,0,.17,.19,.17,'glow');k.ring(o,ivory,0,.38,0,.23,-.4);break;
 }
}
export function buildMidwinterVenue(k:Kit,root:T.Group,c:MidwinterReception){
 const motion=(x:number,y:number,z:number)=>{const o=k.group(root,x,y,z);o.userData.hinged=true;return o;};
 const effects:((t:number,f:number)=>void)[]=[];
 const xbeam=(o:T.Group,a:Vec,b:Vec,col:string,w:number)=>k.beam(o,col,a,b,w);
 function bays(z:number,a:number,b:number,h:number){
   for(const x of [a,b]){k.box(root,ink,x,h/2-.5,z,.22,h,.28);for(const n of [-1,1])k.beam(root,ivory,[x,.4,z+n*.98],[x,h-.45,z],.07);}
   k.box(root,ink,(a+b)/2,h-.46,z,b-a+.4,.19,.35);
 }
 function lamp(x:number,z:number){k.cyl(root,ink,x,.42,z,.066,2.35);k.beam(root,ink,[x,1.58,z],[x+.37,1.69,z],.047);const lit=motion(x+.37,1.61,z);
   k.ball(lit,glow,0,0,0,.16,.13,.16,'lamp');return lit;}
 if(c.day==='1212'){
   k.box(root,'#899184',0,-.99,-10.78,11.72,1.95,6.04);
   for(const x of [-2.9,2.9])k.box(root,'#d3bc83',x,.005,-10.91,.075,.028,4.73);
   const z=-10.6;for(let j=0;j<3;j++)bays(z-j*.94,-3.5,3.5,3.8);
   k.box(root,teal,0,3.53,z-.98,7.84,.18,3.83);
   for(let i=0;i<15;i++)k.box(root,ivory,-3.55+i*.50,3.68,z-.97,.04,.105,3.65);
   for(const s of [-1,1])for(let i=0;i<3;i++){const x=s*(6.5+i*.89),zz=-2-i*4.3;
     k.ball(root,'#82936e',x,-1.87,zz,1.05,.23,.83);k.beam(root,'#987653',[x,-1.92,zz],[x+s*.32,2.75+i*.28,zz-.35],.16);
     const crown=k.group(root,x+s*.32,2.75+i*.28,zz-.35);
     for(let j=0;j<8;j++){const leaf=k.group(crown,0,0,0,0,j*Math.PI/4,.21);k.ball(leaf,'#739067',.8,.06,0,.9,.11,.22);}
   }
   const cart=motion(-2.6,.0,z+.12);k.box(cart,brass,0,.43,0,2.47,.31,1.16);k.box(cart,rust,-.72,.86,0,.76,.65,1.04);
   k.box(cart,'#a8cad0',-.72,1.12,.53,.51,.23,.027);k.box(cart,ivory,.56,.96,0,1.29,.77,.85);
   for(const x of [-.9,.8])for(const zz of [-.56,.56])k.ball(cart,ink,x,.23,zz,.24,.24,.11);
   const shutter=motion(0,2.01,z+.82);k.box(shutter,teal,0,0,0,5.05,1.32,.10);for(let i=0;i<6;i++)k.box(shutter,ivory,0,-.53+i*.21,.07,4.96,.032,.035);
   for(const s of [-1,1]){const flag=motion(s*3.1,.52,-1.59);k.box(flag,s<0?teal:rust,0,0,0,.49,.28,.12);effects.push(()=>flag.position.y=.52+(c.first===(s<0?1:2)?Math.min(1,c.charge)*.64:0));}
   effects.push((_,f)=>{shutter.position.y=2.01+Math.min(1,f*1.5)*1.18;cart.position.x=-2.6+Math.min(1,Math.max(0,f-.48)/1.86)*5.55;});
 }else if(c.day==='1213'){
   for(let j=0;j<37;j++){const side=j%2?-1:1,x=side*(8.4+j*7%23),z=8-j%19*2.28;
     k.ball(root,j%3?'#c49d70':'#d7b17d',x,-2.36,z,3+j%4,.75+(j%5)*.48,1.95+j%4);}
   k.box(root,'#a38460',0,-1.42,-10.2,20.08,1.01,2.1);k.box(root,'#676e70',0,-.76,-10.2,20,.31,1.84);
   for(let i=0;i<17;i++)k.box(root,ivory,-9+i*1.11,-.581,-10.2,.49,.024,.082);
   const lamps:T.Group[]=[];for(let i=0;i<7;i++)lamps.push(lamp(-5.7+i*1.89,-11.1));
   for(const s of [-1,1]){k.beam(root,ink,[s*4.9,-1.72,-2.3],[s*4.9,1.97,-2.3],.077);const vane=motion(s*4.9,1.94,-2.3);
     k.box(vane,rust,.53,0,0,1.04,.18,.05);k.box(vane,ivory,.73,0,.036,.13,.2,.022);effects.push(()=>vane.rotation.z=(c.sweep-.5)*.95);}
   k.box(root,teal,0,.67,-10.7,2.7,.85,.16);for(let i=0;i<3;i++)k.box(root,ivory,-.63+i*.52,.66,-10.59,.34,.105,.048);
   effects.push((_,f)=>lamps.forEach((o,i)=>o.visible=f>.14+i*.14));
 }else if(c.day==='1214'){
   k.box(root,'#637384',0,-.96,-10.96,9.32,1.90,6.04);
   for(let j=0;j<3;j++)bays(-9-j*1.75,-4.2,4.2,4.6);
   k.box(root,ink,0,4.08,-11,8.8,.27,4.91);k.box(root,'#6a7989',0,1.47,-13,8.65,4.75,.27);
   for(let i=0;i<12;i++){const a=(i/12)*Math.PI*1.27-.34,b=((i+1)/12)*Math.PI*1.27-.34;
     const pt=(n:number):Vec=>[Math.cos(n)*3.45,2.37+Math.sin(n)*.32,-10.49+Math.sin(n)*1.3];xbeam(root,pt(a),pt(b),i>7?brass:ivory,.057);}
   const model=motion(0,2,-10.5);k.ball(model,ivory,0,0,0,.92,.23,.32);
   for(const s of [-1,1]){const fin=k.group(model,-.26,0,s*.51,0,s*.28,0);k.ball(fin,teal,0,0,0,.53,.053,.43);}
   k.ball(model,'#799aa7',.34,.18,0,.33,.16,.21);
   k.box(root,ink,0,.18,-10.6,2.71,.39,1.7);for(const side of [-1,1])k.beam(root,brass,[side*.69,.43,-10.65],[side*.47,.80,-10.55],.075);
   effects.push((t,f)=>{const q=Math.min(1,f/1.55),a=c.done.size===4?2.53:c.held?.15+c.markerSweep*2.61:Math.sin(t*.32)*.25;
     model.position.set(Math.cos(a)*3.45*(1-q),2.1+Math.sin(a)*.32-q*1.47,-10.49+Math.sin(a)*1.3*(1-q));model.rotation.y=-a;});
 }else if(c.day==='1215'){
   k.cyl(root,'#7c898a',0,-1.02,-10.66,2.57,1.80);
   for(const s of [-1,1]){const x=s*5.8;k.box(root,ink,x,-1.60,.12,1.04,.53,13.04);for(let j=0;j<4;j++){k.box(root,teal,x,.10,5-j*3.25,.85,2.65,2.24);k.box(root,ivory,x-s*.44,.42,5-j*3.25,.076,.64,1.54);}}
   const z=-10.66;k.cyl(root,ink,0,.12,z,2.42,.48);k.cyl(root,brass,0,.43,z,1.96,.14);
   for(const s of [-1,1]){
     const shell=motion(s*.94,.53,z);for(let i=0;i<9;i++){const a=(i+.5)/9*Math.PI-Math.PI*.5,xx=s*(Math.cos(a)*.95-.91),zz=Math.sin(a)*.95;
       const panel=k.group(shell,xx,1.33,zz,0,-s*a,0);k.box(panel,ivory,0,0,0,.155,2.58,.37);k.box(panel,teal,0,.63,0,.165,.13,.38);
       k.beam(shell,ivory,[xx,2.66,zz],[-s*.78,3.39,0],.115);}
     effects.push((_,f)=>{const i=s<0?1:2;shell.position.x=s*(.94+(c.done.has(i)?0:.38));shell.rotation.z=-s*Math.min(1,f/1.41)*.91;});
   }
   const payload=motion(0,.58,z);k.box(payload,brass,0,.47,0,.90,.83,.77);k.ring(payload,ivory,0,.99,0,.29,-.54);k.box(payload,teal,0,.47,.404,.55,.44,.055);
   effects.push((_,f)=>payload.position.y=.58+Math.min(1,Math.max(0,f-.31)/1.57)*1.19);
 }else{
   for(let j=0;j<88;j++)k.ball(root,j%4?ivory:brass,j*73%65-32,1+j*19%18,-21-j%17,.043);
   const hub=motion(0,2.03,-10.83);k.box(hub,brass,0,0,0,.91,.88,.76);k.ring(hub,ivory,0,.65,0,.44,-.61);for(const s of [-1,1])k.box(hub,teal,s*.87,0,0,.68,.12,.52);
   for(let j=0;j<8;j++){const a=j*Math.PI/4;const dot=motion(0,0,0);k.box(dot,ivory,0,0,0,.19,.20,.19);for(const s of [-1,1])k.box(dot,teal,s*.2,0,0,.18,.055,.23);
     const spoke=motion(0,2,-10.85);k.beam(spoke,brass,[0,0,0],[Math.cos(a)*2.65,Math.sin(a)*1.58,-.23],.022);
     effects.push((_,f)=>{const q=Math.min(1,Math.max(0,f-j*.052)/1.42);dot.visible=j<c.socket*2||f>0;
       dot.position.set(Math.cos(a)*(.65+q*2),2.03+Math.sin(a)*(.41+q*1.17),-10.83-q*.23);spoke.visible=q>.15;spoke.scale.setScalar(Math.max(.02,q));});}
   for(const [j,pt] of [[0,[-.92,0,1.1]],[1,[1.63,0,-2.08]]] as const){const slot=motion(pt[0],.09,pt[2]);k.ring(slot,brass,0,0,0,.35,Math.PI/2);
     effects.push(()=>{const q=c.sockets[j];slot.position.x=q[0];slot.position.y=c.socket>j?.24:.09;});}
 }
 return (t:number,f:number)=>effects.forEach(fn=>fn(t,f));
}
