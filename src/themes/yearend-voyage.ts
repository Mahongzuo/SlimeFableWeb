import * as T from 'three';
import type {Stage} from '../level/stage';
import type {YearendDay,YearendVoyage} from '../templates/yearend-voyage';
import {batch,bakeDesk,texture,workbench} from './jan01-chapter';
export const yearendLooks:Record<YearendDay,{skyTop:string;skyHorizon:string;wash:string}>={
 '1217':{skyTop:'#293a3d',skyHorizon:'#786c57',wash:'#c3b99e'},'1218':{skyTop:'#7098a7',skyHorizon:'#d6d8ba',wash:'#dde2cc'},
 '1219':{skyTop:'#142442',skyHorizon:'#546783',wash:'#b4b8c1'},'1220':{skyTop:'#749dae',skyHorizon:'#e8c9a3',wash:'#eedcc4'},'1221':{skyTop:'#66546a',skyHorizon:'#b4a4a0',wash:'#d8c8b7'}
};
type Point=[number,number];
const outlines:Record<YearendDay,Point[]>={
 '1217':[[-2.76,11.47],[2.76,11.47],[3.38,6.55],[4.69,3.76],[4.25,-.52],[4.72,-4.07],[4.39,-8.33],[3.52,-13.52],[-3.4,-13.52],[-4.51,-7.4],[-4.4,-4.2],[-4.79,.29],[-4.65,5.9],[-3.21,7.39]],
 '1218':[[-2.43,11.47],[2.43,11.47],[3.21,7.39],[4.66,6.27],[5.0,2.25],[4.39,-.83],[5.14,-3.76],[4.58,-6.20],[3.93,-10.21],[3.85,-13.51],[-4.37,-13.51],[-5.33,-9.27],[-4.67,-6.02],[-5.12,-3.13],[-4.28,.99],[-5.48,4.88],[-3.43,7.75]],
 '1219':[[-2.46,11.47],[2.46,11.47],[2.64,7.55],[4.59,5.98],[5.40,3.68],[5.51,-.74],[4.90,-3.98],[4.32,-7.61],[3.94,-12.89],[3.28,-13.64],[-3.43,-13.64],[-4.19,-12.89],[-4.57,-7.15],[-5.01,-3.54],[-5.47,.1],[-5.4,3.94],[-4.65,6.05],[-2.71,7.64]],
 '1220':[[-3.09,11.47],[3.75,11.47],[4.12,10.72],[4.12,7.23],[5.22,6.70],[5.22,-8.2],[4.54,-8.95],[4.54,-13.61],[-5.55,-13.61],[-5.55,7.0],[-3.57,7.0],[-3.57,10.96]],
 '1221':[[-2.37,11.47],[2.37,11.47],[2.37,7.43],[4.84,7.43],[4.84,-2.25],[4.34,-2.25],[4.34,-8.22],[3.74,-8.22],[3.74,-13.64],[-4.71,-13.64],[-4.71,-3.44],[-5.28,-3.44],[-5.28,6.83],[-2.37,7.45]]
};
const ink='#344650',cream='#ecdfc1',brass='#ce9c58',gold='#ffda86',blue='#678d9e',wood='#8d654b',rust='#b37153',leaf='#799679';
function floorTexture(day:YearendDay){
 return texture(512,1024,g=>{
   g.fillStyle=({'1217':'#776650','1218':'#9eac89','1219':'#627386','1220':'#b7a998','1221':'#89725e'})[day];g.fillRect(0,0,512,1024);
   for(let i=0;i<530;i++){g.fillStyle=i%3?'#dfd5ae40':'#34353b29';g.fillRect(i*79%512,i*197%1024,day==='1217'?7:4,2);}
   if(day==='1217'){for(let j=0;j<36;j++){g.fillStyle='#483f36';g.fillRect(0,j*29,512,3);}for(const x of [138,374]){g.fillStyle='#b3a68d';g.fillRect(x,0,5,1024);}}
   if(day==='1218'){g.fillStyle='#72999f';g.beginPath();g.moveTo(405,0);for(let y=0;y<=1024;y+=8)g.lineTo(368+43*Math.sin(y*.013)+21*Math.cos(y*.043),y);g.lineTo(512,1024);g.lineTo(512,0);g.fill();
     for(let j=0;j<9;j++){g.strokeStyle='#6c866344';g.beginPath();g.ellipse(125,462,45+j*12,96+j*26,-.31,0,Math.PI*2);g.stroke();}}
   if(day==='1219'){g.strokeStyle='#d6bf8991';g.lineWidth=2;for(let j=1;j<6;j++){g.beginPath();g.arc(256,507,j*54,0,Math.PI*2);g.stroke();}
     for(let j=0;j<12;j++){const a=j*Math.PI/6;g.beginPath();g.moveTo(256,507);g.lineTo(256+Math.cos(a)*252,507+Math.sin(a)*252);g.stroke();}}
   if(day==='1220'){for(let j=0;j<24;j++){g.fillStyle='#756f674c';g.fillRect(0,j*46,512,2);for(let n=0;n<8;n++)g.fillRect(n*76+j%2*31,j*46,2,46);}g.fillStyle='#b6844b';g.fillRect(155,0,4,1024);}
   if(day==='1221'){for(let j=0;j<15;j++){g.fillStyle='#675244';g.fillRect(j*36,0,2,1024);}
     g.fillStyle='#ceab71';for(let i=0;i<44;i++){g.fillRect(49,18+i*23,i%5?9:18,2);g.fillRect(440,18+i*23,i%5?9:18,2);}}
 });
}
export function buildYearendVoyageSet(stage:Stage,b:YearendVoyage){
 const {root,fixed,part,box,cylinder,oval,group}=workbench(stage),day=b.day;root.name='voyage-'+day;
 const edge=outlines[day],shape=new T.Shape(edge.map(([x,z])=>new T.Vector2(x,-z)));const floor=new T.ShapeGeometry(shape);floor.rotateX(-Math.PI/2);
 const uv=floor.getAttribute('uv'),pos=floor.getAttribute('position');for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+6.5)/13,(pos.getZ(i)+13.8)/26);
 part(floor,stage.toon('#fff',{map:floorTexture(day)}),0,0,0,1,1,1,fixed,'solid-deck');
 const verts:number[]=[];for(let i=0;i<edge.length;i++){const [x,z]=edge[i],[u,v]=edge[(i+1)%edge.length];verts.push(x,0,z,u,0,v,u,-.46,v,x,0,z,u,-.46,v,x,-.46,z);}
 const siding=new T.BufferGeometry();siding.setAttribute('position',new T.Float32BufferAttribute(verts,3));siding.computeVertexNormals();part(siding,stage.toon(day==='1221'?wood:ink,{side:T.DoubleSide}),0,0,0,1,1,1);
 const groups:T.Group[]=[],fx:((t:number,f:number)=>void)[]=[];
 const mov=(x=0,y=0,z=0)=>{const o=group();o.position.set(x,y,z);groups.push(o);return o;};
 const ring=(col:string,x:number,y:number,z:number,r:number,o:T.Group=fixed,w=.05)=>part(new T.TorusGeometry(r,w,7,40),col,x,y,z,1,1,1,o);
 const rod=(col:string,a:number[],z:number[],r:number,o:T.Group=fixed)=>{const v=new T.Vector3(z[0]-a[0],z[1]-a[1],z[2]-a[2]);const m=cylinder(col,(a[0]+z[0])/2,(a[1]+z[1])/2,(a[2]+z[2])/2,r,r,v.length(),o);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;};
 const rock=(c:string,x:number,y:number,z:number,w:number,h:number,d:number,o:T.Group=fixed)=>part(new T.IcosahedronGeometry(1,0),c,x,y,z,w,h,d,o);
 function tile(col:string,x:number,y:number,z:number,w:number,h:number,d:number,o:T.Group=fixed){return box(col,x,y,z,w,h,d,o);}
 function lamp(o:T.Group,s:number){cylinder(ink,0,.10*s,0,.40*s,.45*s,.20*s,o);cylinder(brass,0,.25*s,0,.34*s,.39*s,.13*s,o);
   oval(gold,0,.77*s,0,.19*s,.46*s,.19*s,o);for(let j=0;j<12;j++){const a=j*Math.PI/6;rod(ink,[.3*s*Math.cos(a),.28*s,.3*s*Math.sin(a)],[.3*s*Math.cos(a),1.27*s,.3*s*Math.sin(a)],.021*s,o);}
   for(let j=0;j<7;j++)ring(brass,0,(.42+j*.113)*s,0,.30*s,o,.012*s).rotation.x=Math.PI/2;
   cylinder(ink,0,1.30*s,0,.24*s,.37*s,.19*s,o);ring(brass,0,1.58*s,0,.19*s,o,.035*s);}
 function chair(x:number,y:number,z:number,rot:number,o:T.Group=fixed){
   const seat=group(o);seat.position.set(x,y,z);seat.rotation.y=rot;
   cylinder(ink,0,.20,0,.33,.44,.4,seat);cylinder(brass,0,.53,0,.099,.14,.32,seat);tile('#936951',0,.78,0,1.03,.17,1.01,seat);
   tile('#b39068',0,1.19,-.46,1.04,.74,.14,seat);for(const s of [-1,1])rod(brass,[s*.53,.77,-.24],[s*.53,1.04,.34],.052,seat);
   groups.push(seat);return seat;
 }
 const ridge=(c:string,x:number,y:number,z:number,w:number,h:number,d:number,o:T.Group=fixed)=>part(new T.ConeGeometry(1,1,5),c,x,y,z,w,h,d,o);
 if(day==='1217'){
   box('#6f6454',0,-.89,-4,31,.68,42);
   for(let j=0;j<8;j++){const z=7.60-j*2.83,w=4.65+.18*Math.sin(j);
     for(const s of [-1,1]){rod(wood,[s*(w-.43),-.62,z],[s*w,2.78,z],.19);rod('#80654c',[s*w,2.63,z],[s*(w-1.17),3.52,z],.20);
       rock(j%2?'#837766':'#776d5e',s*(w+.70),.65,z,.98,.97+j%3*.41,1.52);
       if(j<7)rod(ink,[s*(w+.13),2.44,z],[s*(w+.13),2.44,z-2.83],.066);}
     rod('#72583f',[-w+1.11,3.52,z],[w-1.11,3.52,z],.21);
   }
   const display=mov(-3.28,.52,5.12);tile(ink,-3.28,.25,5.12,1.46,.51,1.36);lamp(display,1.32);
   for(const z of [2.02,-1.91,-5.55]){const o=mov(3.64,.72,z);lamp(o,.60);rod(wood,[3.64,-.26,z],[3.64,.74,z],.09);}
   for(let i=0;i<3;i++){const s=b.initialSide*(i%2?-1:1),x=s*3.86,z=.13-i*3.02;
     const wall=mov(x,1.27,z-.75);tile('#a58c66',0,0,0,1.32,1.48,.16,wall);ring(ink,.26,.27,.115,.14,wall,.031);
     const shadow=mov(x,1.27,z-.637);oval('#705f49',0,0,0,.15,.28,.027,shadow);ring('#705f49',0,.34,0,.095,shadow,.024);
     fx.push(()=>{const q=b.round>i||b.round===i&&b.steps?1:b.round===i&&b.engaged?b.displacement:0;
       shadow.position.x=x-.29+.54*q;shadow.position.y=1.10+.10*q;});}
   const hanging=mov(.12,.40,-11.7);lamp(hanging,1.31);rod(ink,[-2.75,2.81,-11.7],[.13,2.81,-11.7],.095);
   ring(brass,.12,2.67,-11.7,.17,fixed,.044);tile(wood,.12,.18,-11.7,2.62,.32,1.83);
   const glowPool=mov(.12,.36,-11.7);oval('#c7a477',0,.01,0,.97,.021,.58,glowPool);
   fx.push((t,f)=>{hanging.position.y=.41+.20*Math.min(1,f/1.30);hanging.rotation.z=.07*Math.sin(t*1.9)*Math.min(1,f);glowPool.scale.setScalar(.56+.51*Math.min(1,f));});
 }else if(day==='1218'){
   tile('#71969d',0,-1.11,-5,85,.64,90);
   for(let j=0;j<24;j++){const s=j%2?1:-1,x=s*(7.15+j*3%14),z=8-j*7%30;rock(j%3?leaf:'#b5a584',x,-.69,z,2.2+j%4,.82+j%4*.58,2.88);}
   for(let j=0;j<13;j++){const x=-4.25+(j%3)*.36,z=5.92-j*.67;cylinder(wood,x,.23,z,.061,.09,.46);ridge(leaf,x,.94,z,.36,.95,.40);}
   for(const s of [-1,1]){const x=s*3.50;rod(ink,[x,-.67,7.51],[x,1.08,7.51],.073);ring(cream,x,1.24,7.51,.17);}
   function terrainLayer(o:T.Group,id:number,scale:number){
     tile(ink,0,0,-.50*scale,2.75*scale,.09*scale,.082*scale,o);
     for(const s of [-1,1])tile(brass,s*1.31*scale,.015*scale,0,.082*scale,.08*scale,.91*scale,o);
     if(id===0){tile(blue,0,.03*scale,0,2.53*scale,.09*scale,.89*scale,o);for(let j=0;j<7;j++)rock('#b8ad89',(j-3)*.32*scale,.11*scale,.17*Math.cos(j)*scale,.38*scale,.22*scale,.34*scale,o);}
     if(id===1)for(let j=0;j<9;j++){const x=(j%5-2)*.29*scale,z=(Math.floor(j/5)-.5)*.32*scale;ridge('#608b6d',x,.17*scale,z,.17*scale,.32*scale,.19*scale,o);}
     if(id===2)for(let j=0;j<5;j++)oval(cream,(j-2)*.40*scale,.14*scale,.17*Math.sin(j)*scale,.31*scale,.085*scale,.16*scale,o);
   }
   const atlas=mov(3.16,.36,4.89);terrainLayer(atlas,0,1.24);const tree=mov(3.16,.85,4.89);terrainLayer(tree,1,1.24);
   const cloud=mov(3.16,1.31,4.89);terrainLayer(cloud,2,1.24);
   for(const x of [1.48,4.83])rod(brass,[x,-.39,4.24],[x,1.65,4.24],.074);
   tile(wood,0,.56,-11.66,4.54,1.13,2.45);
   for(let j=0;j<3;j++){const o=mov((j-1)*.41,1.32+j*.51,-11.69);terrainLayer(o,j,1.46);
     fx.push((_,f)=>{const q=Math.min(1,f/1.43),tracked=b.round>j||b.round===j&&b.steps?1:b.round===j&&b.engaged?b.displacement:0;o.position.x=(j-1)*.57*(1-q)*(1-tracked);o.position.y=1.28+j*(.51-.36*q);});}
 }else if(day==='1219'){
   tile('#58616d',0,-.95,-4,62,.69,69);
   for(let i=0;i<140;i++){const r=.035+(i%5)*.023;oval(i%4?cream:gold,i*71%84-42,1+i*37%22,-21-i%18,r,r,r);}
   for(const x of [-3.26,3.26])for(const z of [4.29,-.82,-6.77,-11.25])cylinder(ink,x,-.54,z,.17,.24,.34);
   const dome=mov(-3.26,1.04,4.32);const bow=part(new T.TorusGeometry(1.46,.065,8,44,Math.PI),brass,0,0,0,1,1,1,dome);bow.rotation.y=-.35;
   for(let n=0;n<7;n++){const a=.2+n*.45;oval(cream,1.46*Math.cos(a)*.94,1.46*Math.sin(a),.49*Math.cos(a),.066,.066,.066,dome);}
   for(let j=0;j<13;j++){const a=j*.29-1.69,x=Math.sin(a)*8.21,z=-2.51-Math.cos(a)*7.32;
     tile('#657485',x,.15,z,1.79,1.48,.74).rotation.y=-a;tile(cream,x,.96,z,1.87,.15,.85).rotation.y=-a;}
   const near=mov(-3.26,.05,4.32);cylinder(blue,0,.07,0,1.47,1.55,.13,near);chair(0,.13,0,-.72,near);
   const arm=mov(-3.24,1.25,4.33);rod(brass,[-.87,0,0],[.87,0,0],.088,arm);
   for(const s of [-1,1]){rod(ink,[s*.73,0,.04],[s*.73,.37,-.52],.14,arm);ring(cream,s*.73,.39,-.54,.16,arm,.037);}
   fx.push(t=>{arm.rotation.y=-.72+.33*Math.sin(t*.6);});
   cylinder(blue,0,.26,-11.72,2.26,2.41,.5);const rotating=mov(0,.51,-11.71);chair(0,0,0,.2,rotating);
   const points:number[][]=[[-2.77,2.42],[-1.7,3.38],[-.52,2.91],[.37,3.76],[1.37,3.03],[2.74,3.51]];
   const web=mov(0,0,-12.93);for(let i=0;i<points.length;i++){const [x,y]=points[i];oval(gold,x,y,0,.095,.095,.095,web);if(i){const [u,v]=points[i-1];rod(cream,[u,v,0],[x,y,0],.025,web);}}
   const cross=mov(.12,2.23,-12.53);ring(brass,0,0,0,.22,cross,.037);
   fx.push((_,f)=>{rotating.rotation.y=.2+Math.min(1,f/1.48)*1.52;web.scale.x=.65+.35*Math.min(1,f);cross.position.x=f?-.52:-1.53+b.wave*3.04;});
 }else if(day==='1220'){
   tile('#b2a58a',0,-.88,-5,77,.76,82);
   for(const z of [6.38,2.14,-2.04,-6.18,-10.35]){tile(ink,-5.40,1.79,z,.24,4.29,.22);
     tile(cream,-5.39,3.97,z-1.94,.29,.19,4.21);tile(blue,-5.42,.64,z-1.95,.16,.13,3.88);}
   for(let j=0;j<6;j++){const z=5.32-j*1.31;ridge(j%2?'#849a88':'#a79a80',-8.49-j%3*.74,.68,z,1.37,2.38+j%3*.35,1.32);}
   tile('#689aa4',-8.59,-.421,-2.25,4.18,.106,3.83);
   for(let j=0;j<17;j++)tile('#b6cdc5',-10.10+j*7%13*.23,-.352,-3.82+j*5%15*.18,.36,.022,.044);
   for(let j=0;j<10;j++){const x=-9.46-j%2*.55,z=-4.36-j*.52,h=.78+(j*7%6)*.22;
     tile(j%3?blue:'#958574',x,h*.5-.47,z,.57,h,.42);for(let w=0;w<3;w++)tile(cream,x+.31,h*.39-.33+w*.20,z,.033,.058,.14);}
   for(let j=0;j<3;j++){const z=.2-j*3.02+(j===1?.61:-.91);
     tile(wood,-4.73,.41,z,.53,.83,1.12);tile(cream,-4.73,.89,z,.61,.12,1.27);
     ring(brass,-4.72,1.28,z,.26).rotation.y=Math.PI/2;}

   for(let j=0;j<4;j++)for(let n=0;n<3;n++)chair(3.75,.02,6.42-j*3.76-n*.86,-Math.PI/2);
   function card(o:T.Group,id:number,s:number){tile(cream,0,.46*s,0,.91*s,.66*s,.075*s,o);tile(blue,0,.50*s,.047*s,.78*s,.43*s,.025*s,o);
     if(id===0)for(let i=0;i<3;i++)ridge(i%2?'#aba783':leaf,(i-1)*.19*s,.46*s,.076*s,.19*s,.30*s,.04*s,o);
     if(id===1){oval('#75a8ad',0,.41*s,.079*s,.32*s,.075*s,.024*s,o);oval(gold,.21*s,.58*s,.08*s,.062*s,.062*s,.022*s,o);}
     if(id===2)for(let i=0;i<4;i++)tile(i%2?wood:ink,(i-1.5)*.135*s,.43*s,.077*s,.11*s,(.13+i%3*.075)*s,.028*s,o);}
   const trunk=mov(2.78,.10,4.75);tile('#8a6859',0,.42,0,.90,.79,.40,trunk);for(const x of [-.26,.26])tile(brass,x,.42,.22,.073,.80,.032,trunk);
   ring(ink,0,.92,0,.12,trunk,.036);tile(cream,.16,.72,.252,.17,.22,.026,trunk).rotation.z=-.18;
   const timetable=texture(384,144,g=>{g.fillStyle='#374b52';g.fillRect(0,0,384,144);g.fillStyle='#f2ddb1';g.font='bold 38px sans-serif';g.fillText('候 机 窗',26,55);
     g.font='25px sans-serif';g.fillText('山  ·  湾  ·  城',28,111);g.fillStyle='#b1c4b9';g.fillRect(24,70,332,2);});
   tile(ink,0,3.53,2.21,2.85,1.14,.13);box(stage.toon('#fff',{map:timetable}),0,3.52,2.292,2.68,1.02,.027);for(const x of [-1.11,1.11])rod(ink,[x,4.11,2.21],[x,4.53,2.21],.041);
   tile(cream,0,4.60,2.21,10.95,.18,.29);
   const rack=mov(-3.18,.50,4.20);tile(wood,0,.16,0,1.98,.32,.86,rack);for(let i=0;i<3;i++){const stand=mov(-3.76+i*.55,.71,4.20);card(stand,i,.63);}
   for(const x of [-3.75,3.75])tile(cream,x,2.35,-11.67,.29,4.78,.43);tile(ink,0,4.81,-11.67,7.81,.22,.45);tile(blue,0,.42,-11.67,7.78,.19,.46);
   const plane=mov(-4.04,2.40,-15.4);oval(cream,0,0,0,1.32,.17,.21,plane);for(const s of [-1,1]){const wing=tile(blue,0,-.035,s*.51,.45,.053,.94,plane);wing.rotation.y=s*.27;tile(cream,-.96,.12,s*.17,.32,.046,.36,plane);}
   tile(blue,-.96,.19,0,.28,.35,.06,plane);for(let i=0;i<7;i++)oval(ink,-.52+i*.15,.04,.197,.040,.041,.016,plane);
   for(let i=0;i<3;i++){const o=mov((i-1)*1.11,.54,-10.76);card(o,i,1.03);fx.push(()=>o.visible=b.round>i);}
   fx.push((_,f)=>plane.position.x=-4.04+Math.min(1,f/1.58)*6.27);
 }else{
   tile('#746a62',0,-1.45,-4,40,.62,49);
   for(const x of [-6.18,6.18])for(let j=0;j<5;j++){const z=5.27-j*4.14;tile(wood,x,.92,z,.37,4.50,.37);
     rod(wood,[x,.13,z],[x,2.83,z-2.45],.092);}
   function deer(o:T.Group,s:number){
     oval(ink,0,.36*s,0,.39*s,.16*s,.065*s,o);oval(ink,.35*s,.58*s,0,.16*s,.14*s,.058*s,o);rod(ink,[.22*s,.36*s,0],[.33*s,.56*s,0],.072*s,o);
     for(const n of [-1,1]){rod(ink,[n*.22*s,.29*s,0],[(n*.22-.11)*s,.10*s,0],.036*s,o);rod(ink,[(n*.22-.11)*s,.10*s,0],[(n*.22-.04)*s,.01*s,0],.030*s,o);
       rod(ink,[.34*s,.67*s,0],[(.34+n*.13)*s,.88*s,0],.026*s,o);rod(ink,[(.34+n*.08)*s,.80*s,0],[(.34+n*.19)*s,.85*s,0],.021*s,o);}
     oval(ink,.45*s,.71*s,0,.10*s,.046*s,.044*s,o);oval(ink,.49*s,.56*s,0,.085*s,.044*s,.042*s,o);
   }
   function rig(x:number,y:number,z:number,scale:number){
     const frame=mov(x,y,z);for(const xx of [-1.56,1.56])for(const zz of [-.76,.76])rod(brass,[xx*scale,0,zz*scale],[xx*scale,2.44*scale,zz*scale],.060*scale,frame);
     tile(wood,0,.15*scale,0,3.53*scale,.31*scale,1.82*scale,frame);tile(ink,0,2.46*scale,0,3.51*scale,.21*scale,1.90*scale,frame);
     for(let j=0;j<3;j++){const h=(.63+j*.54)*scale;for(const zz of [-.68,.68])tile('#a9bab1',0,h,zz*scale,3.11*scale,.053*scale,.081*scale,frame);
       tile(brass,-1.49*scale,h,0,.08*scale,.08*scale,1.37*scale,frame);}
     cylinder(ink,0,2.74*scale,0,.30*scale,.39*scale,.39*scale,frame);
     for(let n=0;n<4;n++)tile(n%2?ink:brass,0,(2.55+n*.08)*scale,0,(1.03-n*.072)*scale,.072*scale,.70*scale,frame);
     for(const x of [-.53,.53]){ring(ink,x*scale,3.14*scale,0,.39*scale,frame,.063*scale);
       for(let j=0;j<4;j++){const a=j*Math.PI/2+.25;rod(brass,[x*scale,3.14*scale,0],[(x+.32*Math.cos(a))*scale,(3.14+.32*Math.sin(a))*scale,0],.033*scale,frame);}}
     tile('#e7c79f',0,.35*scale,0,2.93*scale,.075*scale,1.44*scale,frame);

     const sky=mov(x,y+.68*scale,z-.36*scale);for(let i=0;i<4;i++)ridge('#878ea1',(i-1.5)*.68*scale,.13*scale,0,.53*scale,.39*scale,.14*scale,sky);
     const trees=mov(x,y+1.20*scale,z);for(let i=0;i<5;i++){const x=(i-2)*.49*scale;ridge(i%2?leaf:'#647e74',x,.16*scale,0,.25*scale,.40*scale,.10*scale,trees);
       ridge(i%2?leaf:'#647e74',x,.34*scale,0,.17*scale,.36*scale,.09*scale,trees);}
     const actor=mov(x-.44*scale,y+1.68*scale,z+.44*scale);deer(actor,scale*.78);
     return {sky,trees,actor};}
   const near=rig(-3.54,.02,4.09,.96);const hero=rig(0,.02,-11.66,1.29);
   const crank=mov(2.10,1.24,-11.0);ring(wood,0,0,0,.41,crank);rod(brass,[0,0,0],[.32,.20,0],.064,crank);
   fx.push((t,f)=>{near.actor.position.x=-3.96+(b.engaged?.72*b.fill:.24*Math.sin(t*.86));hero.sky.position.x=.13*(b.round+Math.min(1,f));hero.trees.position.x=-.21*(b.round+Math.min(1,f));
     hero.actor.position.x=-.71+Math.min(1,f/1.58)*1.72;hero.actor.position.y=2.18+Math.sin(Math.min(1,f/1.58)*Math.PI*3)*.08;crank.rotation.z=f*5;});
 }
 const legSide=(i:number)=>b.initialSide*(i%2?-1:1);
 for(let j=0;j<3;j++){const x=-2.65*legSide(j),z=.32-j*3.02,o=mov(x,.06,z-.70);
   if(day==='1217'){ring(brass,0,.43,0,.18,o);rod(ink,[0,0,0],[0,.27,0],.05,o);}
   if(day==='1218'){tile(wood,0,.13,0,.64,.26,.41,o);tile(j%2?leaf:blue,0,.30,0,.52,.053,.31,o);}
   if(day==='1219'){cylinder(blue,0,.17,0,.25,.35,.33,o);rod(ink,[-.18,.38,0],[.25,.55,0],.14,o);}
   if(day==='1220'){tile(wood,0,.17,0,.60,.34,.42,o);tile(cream,0,.40,0,.39,.14,.071,o);}
   if(day==='1221'){tile(wood,0,.13,0,.67,.26,.55,o);tile(cream,0,.29,0,.51,.041,.39,o);}
 }
 const marker=mov();ring(gold,0,.084,0,.78,marker,.05).rotation.x=-Math.PI/2;
 const branches=b.layout.branches.map(([x,,z],i)=>{const o=mov(x,.073,z);ring(i?brass:'#98c4ac',0,0,0,.78,o,.061).rotation.x=-Math.PI/2;return o;});
 const world=bakeDesk(stage,root);world.bounds={min:[-6.15,-2,-12.75],max:[6.15,12,11.4]};[fixed,...groups].forEach(batch);
 return {world,update(t:number,f:number){const p=b.phase==='warmup'?b.layout.warm:b.phase==='finale'?b.layout.end:b.nextSpot;
   marker.position.set(p[0],0,p[2]);marker.visible=b.phase!=='route'&&b.phase!=='curtain';branches.forEach(o=>o.visible=b.phase==='route');fx.forEach(fn=>fn(t,f));}};
}
