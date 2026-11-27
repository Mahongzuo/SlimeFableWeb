/** Original exhibition models, printed marks, snow and water are game interpretations. */
import * as T from 'three';
import {paint,rod,ring,batch,iron,wood,cream,brass,type Builder,type Bench} from './december-chapters';
import type {Stage} from '../level/stage';
import type {MidwinterRun} from '../templates/midwinter-chapters';
export type Exhibit=Builder<MidwinterRun>;
export function tiles(st:Stage,base:string,line:string){
 return paint(st,base,g=>{g.strokeStyle=line;g.lineWidth=2;for(let j=0;j<7;j++){const y=j*68;g.beginPath();g.moveTo(0,y);g.lineTo(768,y);g.stroke();
  for(let k=-1;k<7;k++){const x=k*142+(j%2)*68;g.beginPath();g.moveTo(x,y);g.lineTo(x,y+68);g.stroke();}}});
}
export function ripples(st:Stage,base:string,line:string){return paint(st,base,g=>{
 g.strokeStyle=line;g.lineWidth=3;for(let i=0;i<71;i++){const x=i*127%730,y=i*67%379;
 g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+13,y+5,x+31+i%19,y);g.stroke();}});}
export function paper(st:Stage,base:string,kind:'mountain'|'bell'|'rows'|'cols'|'fire'|'snow'){
 return paint(st,base,g=>{g.strokeStyle='#92744b';g.lineWidth=5;g.strokeRect(27,22,715,338);g.fillStyle='#6e7464';
 if(kind==='rows'||kind==='cols'){for(let i=0;i<10;i++)for(let j=0;j<6;j++)if(kind==='rows')g.fillRect(62+i*64,58+j*48,38+(i+j)%6,5);
 else g.fillRect(60+i*65,55+j*48,6,27);return;}
 if(kind==='mountain'){g.beginPath();g.moveTo(32,281);for(const [x,y] of [[140,182],[206,220],[320,91],[362,131],[421,93],[579,224],[619,185],[728,263],[728,319],[32,319]])g.lineTo(x,y);g.fill();}
 if(kind==='bell'){g.lineWidth=15;g.beginPath();g.moveTo(278,266);g.bezierCurveTo(340,224,296,111,384,95);g.bezierCurveTo(474,104,430,220,491,266);g.closePath();g.stroke();g.beginPath();g.arc(384,275,18,0,7);g.fill();}
 if(kind==='fire'){g.fillStyle='#ac624b';g.beginPath();g.moveTo(260,282);g.bezierCurveTo(259,217,372,164,354,76);g.bezierCurveTo(500,180,478,259,438,291);g.fill();}
 if(kind==='snow'){g.strokeStyle='#648894';g.lineWidth=6;for(let j=0;j<6;j++){const a=j*Math.PI/3;g.beginPath();g.moveTo(384,180);g.lineTo(384+112*Math.cos(a),180+105*Math.sin(a));g.stroke();}}});
}
export function wheel(b:Bench,x:number,y:number,z:number,r:number){const g=b.group();g.position.set(x,y,z);ring(b,brass,0,0,0,r,.035,g,false);
 for(let k=0;k<4;k++){const a=k*Math.PI/4;rod(b,wood,[-r*Math.cos(a),-r*Math.sin(a),0],[r*Math.cos(a),r*Math.sin(a),0],.023,g);}batch(g);return g;}
export function folded(b:Bench,col:string,pts:number[][],p:T.Object3D=b.fixed){
 const pos:number[]=[];for(let i=1;i<pts.length-1;i++)pos.push(...pts[0],...pts[i],...pts[i+1],...pts[0],...pts[i+1],...pts[i]);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.computeVertexNormals();return b.part(geo,col,0,0,0,1,1,1,p);
}
export function tree(b:Bench,x:number,z:number,k:number){rod(b,wood,[x,0,z],[x+.05,k*.66,z],.075);
 for(let i=0;i<3;i++)b.part(new T.ConeGeometry((.43-i*.075)*k,.61*k,7),'#526e60',x,k*(.42+i*.20),z,1,1,1);}
export function skyline(b:Bench,x:number,z:number,k:number,color:string){const g=b.group(b.fixed);g.position.set(x,0,z);g.scale.setScalar(k);
 b.box(color,0,.73,0,1.38,1.46,.89,g);const roof=b.part(new T.ConeGeometry(1.17,.60,4),iron,0,1.74,0,1,1,.82,g);roof.rotation.y=Math.PI/4;
 for(const side of [-1,1]){b.box(cream,side*.36,.83,.465,.22,.39,.06,g);}batch(g);return g;}
export const ease=(end:number)=>T.MathUtils.smoothstep(end,0,1.5);

