import {isNewyearDay} from '../templates/newyear-defense';
import {buildNewyearMatch} from './newyear-match';
import {isMonthendDay} from '../templates/monthend-defense';
import {buildMonthMatch} from './monthend-match';
import {isYearendDay} from '../templates/yearend-defense';
import {buildYearendMatch} from './yearend-match';
import {isMidDay} from '../templates/midwinter-defense';
import {buildMidMatch} from './midwinter-match';
import {winterDay} from '../templates/winter-defense';
import {buildWinterMatch} from './winter-match';
import * as T from 'three';
import {Kit} from './folio-landmarks';
import {buildDecemberMatchTable} from './december-match';
import {isDecemberDefense} from './december-defense';
import {boat,rocket,gantry} from './season-defense';
import type {Stage} from '../level/stage';
import type {MatchDay} from '../templates/season-match';

/** A continuous, imaginary estuary plotted in two adjoining swaths. */
function radarSwaths(){
 const atlas=document.createElement('canvas');atlas.width=800;atlas.height=400;
 const g=atlas.getContext('2d')!;
 const coast=(x:number)=>170+55*Math.sin(x/80)+29*Math.cos(x/41)+9*Math.sin(x/16);
 const shore=()=>{g.beginPath();g.moveTo(0,400);for(let x=0;x<=800;x+=3)g.lineTo(x,coast(x));g.lineTo(800,400);g.closePath();};
 g.fillStyle='#658c83';g.fillRect(0,0,800,400);
 for(let n=0;n<18;n++){g.beginPath();for(let x=0;x<=800;x+=3){
   const v=coast(x)-n*9-5*Math.sin(x/38+n*.12);if(x===0)g.moveTo(x,v);else g.lineTo(x,v);}
   g.strokeStyle=n%4?'#779a8d':'#afd0b0';g.lineWidth=n%4?1:2;g.stroke();}
 shore();g.fillStyle='#cfc297';g.fill();g.strokeStyle='#f1dfaf';g.lineWidth=5;g.stroke();
 g.save();shore();g.clip();
 for(let n=0;n<22;n++){g.beginPath();for(let x=0;x<=800;x+=4){
   const y=coast(x)+7+n*10+12*Math.sin(x/42+n*.28);if(!x)g.moveTo(x,y);else g.lineTo(x,y);}
   g.strokeStyle=n%4?'#a5a57c':'#84977a';g.lineWidth=n%4?1.7:3.1;g.stroke();}
 g.beginPath();g.moveTo(235,408);g.bezierCurveTo(310,355,188,323,357,266);g.bezierCurveTo(430,239,343,185,407,coast(407)-2);
 g.strokeStyle='#729a91';g.lineWidth=8;g.stroke();g.restore();
 for(let i=0;i<6;i++){const x=103+i*103,y=coast(x)-27-i%3*12;g.beginPath();g.ellipse(x,y,18+i%3*6,5+i%2*3,i*.3,0,Math.PI*2);g.fillStyle='#d4c69e';g.fill();}
 g.strokeStyle='#e5e0ba56';g.lineWidth=1;
 for(let i=0;i<=800;i+=40){g.fillStyle='#dde2bd38';g.fillRect(i,0,1,400);if(i<=400)g.fillRect(0,i,800,1);}
 for(const x of [240,400,600]){const y=coast(x);g.strokeStyle='#9a503f';g.lineWidth=2;g.strokeRect(x-7,y-7,14,14);
   g.beginPath();g.moveTo(x-14,y);g.lineTo(x+14,y);g.moveTo(x,y-14);g.lineTo(x,y+14);g.stroke();}
 return [0,1].map(i=>{const part=document.createElement('canvas');part.width=part.height=400;
   part.getContext('2d')!.drawImage(atlas,i*400,0,400,400,0,0,400,400);
   const texture=new T.CanvasTexture(part);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
   return new T.MeshBasicMaterial({map:texture});});
}

/** Animated fictional miniatures driven by actual board contacts, never by the HUD clock. */
export function buildMatchMachine(stage:Stage,day:MatchDay){
 const material=stage.toon('#ffffff'),lamp=new T.MeshBasicMaterial({color:0xffffff});
 const k=new Kit({toon:material,lit:material,glass:material,glow:lamp,lamp},day);
 const root=k.group(stage.scene,0,0,-.80);root.name='tabletop-'+day;
 const wood='#88664b',iron='#495d65',cream='#e8d8b0',copper='#b7784c';
 const focus=new T.Vector3(),points:T.Group[]=[],parts:T.Group[]=[];
 let branch=0,first=false,second=false,progress=0,previous=0;
 let animate:(t:number,p:number,f:number)=>void;
 const contacts=[false,false];
 function platform(color:string,y:number){k.box(root,color,0,y-.12,0,5.86,.24,3.02);}
 function brace(x:number,z:number){k.beam(root,iron,[x-.42,.06,z],[x+.42,.72,z],.063);k.beam(root,iron,[x+.42,.06,z],[x-.42,.72,z],.063);}
 if(isNewyearDay(day)){const motion=buildNewyearMatch(k,root,day);animate=(t,p,f)=>motion(t,p,f,contacts,branch);}
 else if(isMonthendDay(day)){const motion=buildMonthMatch(k,root,day);animate=(t,p,f)=>motion(t,p,f,contacts,branch);}
 else if(isYearendDay(day)){const motion=buildYearendMatch(k,root,day);animate=(t,p,f)=>motion(t,p,f,contacts,branch);}
 else if(isMidDay(day)){const motion=buildMidMatch(k,root,day);animate=(t,p,f)=>motion(t,p,f,contacts,branch);}
 else if(winterDay(day)){
   const motion=buildWinterMatch(k,root,day);animate=(t,p,f)=>motion(t,p,f,contacts,branch);
 }else if(isDecemberDefense(day)){
   const motion=buildDecemberMatchTable(k,root,day);
   animate=(t,p,f)=>motion(t,p,f,contacts,branch);
 }else switch(day){
 case '1127':{
   platform('#839b9b',.25);
   for(const z of [-.57,.57]){k.box(root,iron,-.18,.38,z,4.92,.17,.10);for(let i=0;i<10;i++)k.box(root,wood,-2.27+i*.46,.33,z,.17,.14,.48);}
   const hull=k.group(root,-.27,.62,.05);boat(k,hull);
   for(const x of [-1.4,.18,1.20]){const chock=k.group(root,x,.49,.42);
     k.put('box',chock,'toon','#c18d55',0,0,0,.36,.21,.52,0,0,-.16);
     k.beam(chock,'#685b4e',[0,.04,.21],[0,.03,.57],.033);parts.push(chock);}
   for(const x of [-2.42,1.75]){gantry(k,root,x,-1.42,1.81,'#877258');k.beam(root,iron,[x,1.82,-1.42],[x+.71,2.19,-1.12],.07);k.beam(root,iron,[x+.71,2.19,-1.12],[x+.71,1.45,-1.12],.017);}
   for(let i=0;i<4;i++)k.cyl(root,i%2?'#a86c4e':iron,-2.28+i*.27,.46,.98,.11,.37);
   animate=(t,p,f)=>{parts.forEach((a,i)=>{a.position.z=.42+.75*Math.min(1,Math.max(0,p*3-i));});
     hull.position.x=-.27+p*.21+Math.min(1,f)*.55;hull.position.y=.62-p*.13+Math.sin(t*2)*p*.012;};break;}
 case '1128':{
   platform('#485d68',.32);const table=k.group(root,0,.37,0,.46);
   k.box(table,iron,0,.11,-.07,4.85,.22,2.48);
   const plates=radarSwaths();
   for(let j=0;j<2;j++){
     const img=k.group(table,j?1.087:-1.087,.255,0);parts.push(img);
     k.box(img,'#665d4f',0,0,0,2.16,.065,2.21);
     const print=new T.Mesh(new T.PlaneGeometry(2.145,2.16),plates[j]);
     print.position.y=.039;print.rotation.x=-Math.PI/2;img.add(print);
     for(const z of [-1.04,1.04])for(const x of [-.92,.92])k.cyl(img,copper,x,.071,z,.043,.045);}
   const head=k.group(root,0,1.81,-.92);
   for(const x of [-2.32,2.32])k.cyl(root,iron,x,1.09,-1.14,.10,1.56);
   k.box(root,'#ad915e',0,1.93,-1.14,4.90,.13,.15);
   k.box(head,'#59706c',0,0,0,.43,.32,.42);k.taper(head,'#c3ba93',0,-.23,.14,.19,.27);
   animate=(t,p)=>{head.position.x=Math.sin(t*.8)*2.02;parts[1].position.z=.36*(1-p);parts[1].rotation.y=.12*(1-p);};break;}
 case '1129':{
   platform('#769879',.22);
   for(let i=0;i<19;i++){const x=-2.78+i*.3,z=-1.32-.09*Math.sin(i),h=.30+(i%5)*.11;
     k.rock(root,i%3?'#6c896b':'#a1a37c',x,.25,z,.43,h,.44,i);
     if(i%2)k.cone(root,'#4c7163',x,h+.37,z,.18,.56);}
   const parachute=k.group(root);k.taper(parachute,'#876747',0,.27,0,.31,.45,true);
   k.cyl(parachute,iron,0,.12,0,.32,.14);k.ball(parachute,'#d2a76b',0,.53,0,.30,.15,.30);
   for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.cos(a),z=Math.sin(a);
     k.ball(parachute,i%2?'#ede4bd':'#db7358',x*.57,1.72,z*.57,.45,.35,.45);
     k.beam(parachute,'#e8ddbe',[x*.17,.51,z*.17],[x*.91,1.63,z*.91],.012);}
   k.ball(parachute,'#e6b58d',0,1.83,0,.67,.34,.67);
   k.cyl(root,wood,2.02,1.05,-.30,.043,1.66);const sock=k.group(root,2.02,1.87,-.30);k.put('taperUp',sock,'toon','#c99061',.34,0,0,.12,.68,.12,0,0,Math.PI/2);
   for(let i=0;i<4;i++)k.box(root,cream,-.67+i*.38,.24,.71,.18,.033,.08);
   animate=(t,p)=>{const sway=(1-p)*.75;parachute.position.set(sway*Math.sin(t*1.31),1.20*(1-p)+.24,.02);parachute.rotation.z=sway*.18*Math.sin(t*1.31+.4);sock.rotation.y=Math.sin(t)*.36;};break;}
 case '1130':{
   platform('#596c76',.24);const craft=k.group(root,-.40,.25,0);rocket(k,craft);
   gantry(k,root,1.04,-.32,3.23,'#b27659');
   for(let level=0;level<3;level++){
     const arm=k.group(root,1.04,.95+level*.81,-.32);parts.push(arm);
     k.box(arm,iron,-.61,0,.13,1.24,.128,.39);
     for(const z of [-.07,.34]){k.beam(arm,cream,[-1.16,.34,z],[-.04,.34,z],.026);
       for(const x of [-1.14,-.59,-.04])k.beam(arm,cream,[x,.06,z],[x,.34,z],.023);}
     k.cyl(root,'#dccba6',1.04,.95+level*.81,-.32,.15,.21);}
   for(let i=0;i<3;i++){const x=-2.18+i*.33;k.cyl(root,'#9aafb0',x,.55,-1.01,.12,.60);k.ball(root,cream,x,.85,-1.01,.12,.07,.12);}
   animate=(t,p,f)=>{parts.forEach((a,i)=>a.rotation.y=Math.min(1,Math.max(0,p*3-(2-i)))*1.68);craft.position.y=.25+Math.min(1.38,f)*1.03;};break;}
 case '1201':{
   platform('#c5d7d6',.28);
   for(let i=0;i<22;i++){const x=-2.77+i*.256;k.box(root,'#9a9a87',x,.34,0,.112,.08,.84);if(i>8)k.box(root,'#82999a',x,.34,-.65,.112,.079,.67);}
   for(const z of [-.25,.25]){k.box(root,iron,0,.41,z,5.57,.08,.055);k.beam(root,iron,[-.66,.41,z],[.99,.41,z-.73],.031);k.box(root,iron,1.86,.41,z-.73,1.75,.08,.055);}
   const blade=k.group(root,-.66,.47,0);blade.name='points';k.box(blade,copper,.56,0,0,1.11,.058,.07);
   for(const x of [.98,1.97]){brace(x,-1.14);k.box(root,'#6a858b',x,1.04,-1.05,.10,1.52,.12);}
   k.box(root,'#c4cfd0',1.48,1.85,-1.10,2.42,.17,.91);
   const train=k.group(root,-1.73,.49,0);train.name='train';k.ball(train,'#eee7cc',0,.28,0,.86,.28,.27);
   k.box(train,'#d8ded2',-.39,.30,0,.85,.45,.43);
   for(const s of [-1,1]){for(let i=0;i<6;i++)k.box(train,'#506a78',-.70+i*.22,.37,.229*s,.15,.114,.034);
      k.box(train,'#5b91ab',-.16,.20,.235*s,1.20,.05,.028);}
   for(let i=0;i<6;i++)k.cone(root,'#6d938c',-2.35+i*.43,.69,-1.28,.25,.84);
   animate=(t,p,f)=>{train.position.x=-1.73+p*2.66+Math.min(1,f)*.34;train.position.z=branch===2?-.72*Math.max(0,p*2-1):0;blade.rotation.y=branch===2?.41:.055;};break;}
 }
 for(let i=0;i<3;i++)points.push(k.group(root,-1.2+i*1.17,.96,.14));
 k.flush();
 return {destination:(step:number)=>points[Math.min(2,step)].getWorldPosition(focus),
   passed:()=>true,contacts:(a:boolean,b:boolean)=>{first=a;second=b;contacts[0]=a;contacts[1]=b;},
   setThird:(done:boolean)=>{contacts[2]=done;},
   setBranch:(b:number)=>{branch=b;},
   update:(time:number,target:number,f:number)=>{
     const dt=Math.min(.12,Math.max(0,time-previous));previous=time;
     progress+=(target-progress)*(1-Math.exp(-dt*4.1));animate(time,progress,f);
     root.userData.contacts=(first?1:0)+(second?2:0);
   }};
}
