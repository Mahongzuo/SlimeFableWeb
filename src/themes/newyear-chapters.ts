/** 原创展台用浏览器绘制纹理；史实仅取原章节。 */
import * as T from 'three';
import type {Bench,Builder} from './december-chapters';
import {paint,wood,brass,cream,rod,batch} from './december-chapters';
import type {NewyearRun} from '../templates/newyear-chapters';
import type {Stage} from '../level/stage';
export type Exhibit=Builder<NewyearRun>;
export const arc2=Math.PI*2;
export function face(b:Bench,parent:T.Object3D,mat:string|T.Material,points:number[][],z:number,depth=.04){
 const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 return b.part(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),mat,0,0,z,1,1,1,parent);
}
export function paper(st:Stage,theme:'silver'|'sill'|'city'|'grove'|'ink',base='#f2e3c4',color='#465b59'){
 return paint(st,base,g=>{
 const line=(points:number[][],stroke:string,w:number)=>{g.lineWidth=w;g.strokeStyle=stroke;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();};
 if(theme==='silver'){
   g.save();g.translate(375,196);g.rotate(-.32);g.beginPath();g.moveTo(-224,0);g.bezierCurveTo(-128,-151,104,-133,238,0);g.bezierCurveTo(139,117,-78,153,-224,0);g.closePath();g.fillStyle='#7aaba2';g.fill();g.strokeStyle='#f2edcd';g.lineWidth=7;g.stroke();
   line([[-249,8],[-143,4],[-55,-3],[53,5],[153,-2],[234,0]],'#f4eac5',6);
   for(let i=0;i<8;i++){const x=-159+i*41,h=77*Math.sin((i+1)*Math.PI/9);line([[x,0],[x+18,-h*.57],[x+43,-h]],'#d7e5cb',4);line([[x,0],[x+17,h*.58],[x+46,h]],'#dceacf',4);}g.restore();
 }else if(theme==='sill'||theme==='city'){
   g.fillStyle=theme==='sill'?'#81999d':'#293e55';g.fillRect(32,32,704,269);
   if(theme==='sill'){g.fillStyle='#e6c984';g.beginPath();g.arc(487,123,61,0,arc2);g.fill();g.strokeStyle='#485662';g.lineWidth=18;g.beginPath();g.ellipse(487,124,107,20,-.28,0,arc2);g.stroke();}
   else{for(let j=0;j<18;j++){const x=38+j*40,ht=35+j*47%151;g.fillStyle=j%2?'#729d9c':'#899caa';g.fillRect(x,278-ht,34,ht);g.fillStyle='#e9d69e';for(let k=0;k<3;k++)g.fillRect(x+7,282-ht+k*15,5,6);}}
   g.fillStyle=color;g.textAlign='center';g.font='bold 30px serif';g.fillText(theme==='sill'?'下一扇舷窗，还亮着。':'远处的星港，刚开灯。',384,349);
 }else if(theme==='grove'){
   g.fillStyle='#e1d1ab';g.fillRect(37,34,694,316);for(let j=0;j<21;j++){const x=68+j*73%635,y=59+j*41%197;
     g.fillStyle=j%2?'#76927a':'#617c6a';g.beginPath();g.moveTo(x,y);g.lineTo(x-16,y+40);g.lineTo(x+16,y+40);g.fill();g.fillRect(x-3,y+34,6,16);}
   line([[59,289],[217,247],[290,185],[435,235],[512,178],[672,94]],color,9);
   g.fillStyle=color;g.font='bold 48px serif';g.fillText(color==='#835c4a'?'山 · 木':'木 · 山',64,332);
 }else{
   for(let j=0;j<5;j++)line([[82,71+j*57],[171,69+j*57],[211,78+j*57],[300+(j%2)*66,72+j*57]],'#a19373',5);
   g.strokeStyle=color;g.lineWidth=16;g.beginPath();g.ellipse(504,194,115,99,-.32,.36,Math.PI*2+.27);g.stroke();
 }
 g.strokeStyle='#ab9775';g.lineWidth=3;g.strokeRect(15,15,738,354);
 });
}
export function books(b:Bench,x:number,z:number,shelf:number){for(let row=0;row<2;row++){const y=.35+row*.77;
 b.box(wood,x,y,z,2.53,.10,.54);for(let j=0;j<10;j++){const h=.34+(j*7%5)*.055;
 const m=b.box(['#936455','#647674','#b69268','#858469'][j%4],x-1.11+j*.23,y+.06+h/2,z,.18,h,.35);if(j===8)m.rotation.z=.10;}}
 for(const k of [-1,1])b.box(wood,x+k*1.25,.98,z,.1,1.86,.58);
 b.box(wood,x,1.94,z,2.64,.10,.62);
}
export function shaft(b:Bench,color:string,from:number[],to:number[],radius:number,parent:T.Object3D=b.fixed){return rod(b,color,from,to,radius,parent);}
export function trace(b:Bench,parent:T.Group,points:number[][],col:string,width=.03){for(let i=1;i<points.length;i++)shaft(b,col,points[i-1],points[i],width,parent);}
export function floorTrack(b:Bench,points:number[][],col=brass){trace(b,b.fixed,points.map(([x,z])=>[x,.038,z]),col,.021);}

/** Narrow scale with a physical moving pointer and a marked acceptance window. */
export function instrument(b:Bench,x:number,y:number,z:number,width=1.32){
 const gauge=b.group();gauge.position.set(x,y,z);
 b.box('#493a30',0,0,0,width+.19,.22,.12,gauge);
 b.box('#ddc997',0,0,.075,width,.15,.04,gauge);
 for(let i=0;i<=10;i++)b.box('#796954',width*(i/10-.5),-.038,.102,.013,i%5?.042:.062,.012,gauge);
 batch(gauge);
 const gold=b.box('#79946e',0,.025,.103,1,.048,.018,gauge);
 const needle=b.box('#973f36',0,0,.133,.032,.144,.025,gauge);
 const light=b.oval('#dbb65c',width/2+.057,0,.082,.033,.033,.018,gauge);
 return (value:number,ready:boolean,low=.72,high=1)=>{
   needle.position.x=width*(value-.5);gold.position.x=width*((low+high)*.5-.5);
   gold.scale.x=width*(high-low);light.visible=ready;
 };
}
