import * as T from 'three';
import {type Bench,paint,wood,iron,brass,cream,rod,batch} from './december-chapters';
import type {Builder} from './december-chapters';
import type {Stage} from '../level/stage';
import type {WinterRun} from '../templates/winter-chapters';
export type WinterBuilder=Builder<WinterRun>;
export function grain(st:Stage,c='#a58263'){
  return paint(st,c,g=>{g.strokeStyle='#775f483b';g.lineWidth=3;for(let i=0;i<14;i++){g.beginPath();g.moveTo(0,i*32);g.bezierCurveTo(170,i*32-7,510,i*32+13,768,i*32+3);g.stroke();}});
}
export function inked(st:Stage,kind:'branch'|'page'|'lane'|'field'|'circle'|'diamond'){
  return paint(st,'#e8d9af',g=>{g.strokeStyle='#665945';g.lineWidth=4;g.strokeRect(26,24,716,336);
    if(kind==='branch'){g.strokeStyle='#68846c';g.lineWidth=9;g.beginPath();g.moveTo(186,333);g.quadraticCurveTo(358,178,581,57);g.stroke();
      for(let i=0;i<10;i++){const x=220+i*35,y=301-i*24;g.fillStyle=i%2?'#728c67':'#94a775';g.beginPath();g.ellipse(x+(i%2?22:-9),y-16,40,10,i%2?.2:-1.2,0,7);g.fill();}}
    else if(kind==='page'){g.fillStyle='#6d6651';for(let i=0;i<10;i++)g.fillRect(89+(i===0?26:0),73+i*25,425+(i*73%140),4);g.fillStyle='#aa664e';g.fillRect(538,282,53,44);}
    else if(kind==='field'||kind==='lane'){g.fillStyle='#a98464';g.beginPath();g.moveTo(29,268);g.quadraticCurveTo(340,137,740,233);g.lineTo(740,358);g.lineTo(29,358);g.fill();
      if(kind==='field'){for(let i=0;i<48;i++){const x=36+i*15,y=211+(i*33)%98;g.strokeStyle='#715e4c';g.beginPath();g.moveTo(x,356);g.lineTo(x+9,y);g.stroke();g.fillStyle='#9d5240';g.beginPath();g.ellipse(x+9,y,6,18,.32,0,7);g.fill();}}
      else{for(let j=0;j<6;j++){const x=65+j*106,y=168+(j%2)*27;g.fillStyle='#b6a184';g.fillRect(x,y,79,58);g.fillStyle='#707775';g.beginPath();g.moveTo(x-12,y);g.lineTo(x+33,y-39);g.lineTo(x+92,y);g.fill();}}}
    else{for(let i=0;i<14;i++){const x=110+(i*127)%565,y=75+(i*61)%227;g.strokeStyle=i%2?'#7b8d78':'#927b65';g.lineWidth=3;g.beginPath();if(kind==='circle')g.arc(x,y,9+i%4*3,0,7);else{g.moveTo(x,y-13);g.lineTo(x+13,y);g.lineTo(x,y+13);g.lineTo(x-13,y);g.closePath();}g.stroke();}}});
}
export function starwall(b:Bench,st:Stage,base:string){
  const night=paint(st,base,g=>{for(let i=0;i<140;i++){g.fillStyle=i%3?'#abbbb7':'#dcd3af';g.fillRect(i*317%768,i*89%384,i%5?1:4,i%5?1:3);}});
  b.box(night,0,2.1,-5.04,13.5,6.1,.19);
}
export function peaked(b:Bench,col:string,x:number,y:number,z:number,w:number,h:number,d:number){
  const g=new T.Shape();g.moveTo(-.5,-.5);g.lineTo(-.43,.04);g.lineTo(-.21,.39);g.lineTo(-.11,.32);g.lineTo(.13,.50);g.lineTo(.36,.17);g.lineTo(.51,-.50);g.closePath();
  return b.part(new T.ExtrudeGeometry(g,{depth:1,bevelEnabled:false}),col,x,y,z,w,h,d);
}
export function dish(b:Bench,p:T.Group,x:number,y:number,z:number,scale:number){
  const g=b.group(p);g.position.set(x,y,z);g.scale.setScalar(scale);rod(b,brass,[0,0,0],[0,.72,0],.052,g);
  const bowl=b.part(new T.SphereGeometry(.47,20,6,0,Math.PI*2,0,1.24),cream,0,.81,0,1,.47,1,g);bowl.rotation.z=.48;
  rod(b,iron,[0,.81,0],[-.18,1.14,.07],.025,g);batch(g);return g;
}
export function shed(b:Bench,x:number,z:number,width:number,walls:string){
  b.box(walls,x,.82,z,width,1.64,1.1);for(const side of [-1,1]){
    const roof=b.box('#596c69',x,1.89,z+side*.32,width+.29,.12,.90);roof.rotation.x=side*.51;
    b.box(wood,x+side*.33*width,.81,z+.59,.065,1.62,.08);}
  b.box('#73634e',x,.60,z+.60,.44,1.18,.08);
  b.box('#b4bead',x+width*.29,.96,z+.61,.39,.50,.09);
}
