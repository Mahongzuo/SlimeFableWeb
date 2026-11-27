import * as T from 'three';
import type {Stage} from '../level/stage';
import type {WinterDay,WinterVoyage} from '../templates/winter-voyage';
import {batch,bakeDesk,texture,workbench} from './jan01-chapter';

export const winterLooks:Record<WinterDay,{skyTop:string;skyHorizon:string;wash:string}>={
 '1207':{skyTop:'#08172e',skyHorizon:'#354861',wash:'#b8c5c7'},
 '1208':{skyTop:'#819aa0',skyHorizon:'#e7c8aa',wash:'#efdfc7'},
 '1209':{skyTop:'#365866',skyHorizon:'#98b6a4',wash:'#cfddc8'},
 '1210':{skyTop:'#796779',skyHorizon:'#e4c19c',wash:'#e9d1b5'},
 '1211':{skyTop:'#7aa9af',skyHorizon:'#f3d3a2',wash:'#efe1be'}
};
const floors=['#5f7380','#ab8b6c','#718d86','#a98777','#a39380'];
export function buildWinterVoyageSet(stage:Stage,b:WinterVoyage){
 const {root,fixed,part,box,cylinder,oval,group}=workbench(stage),day=b.day;
 root.name='voyage-'+day;
 const cream='#f0e5c9',ink='#344857',blue='#52778d',steel='#8ea7a6',brass='#d6a359',copper='#ba7451',lamp='#ffdb85',wood='#88634d';
 const floor=texture(512,1024,g=>{g.fillStyle=floors[Number(day)-1207];g.fillRect(0,0,512,1024);
   for(let i=0;i<30;i++){const stride=day==='1210'?24:56,y=i*stride;g.fillStyle=day==='1208'?'#775d414f':'#273d4544';g.fillRect(0,y,512,2);
     for(let j=0;j<8;j++)g.fillRect(j*78+(i%2)*33,y+3,2,day==='1210'?16:6);}
   g.fillStyle='#efcb7966';for(let i=0;i<3;i++){const y=448+i*116;for(let j=0;j<15;j++)g.fillRect(129+j*17,y,10,3);}
 });
 box(stage.toon('#fff',{map:floor}),0,-.21,-.8,13,.42,26,fixed,'solid-deck');
 const dyn:T.Group[]=[],effects:((t:number,f:number)=>void)[]=[];
 const moving=(x=0,y=0,z=0)=>{const o=group();o.position.set(x,y,z);dyn.push(o);return o;};
 const hoop=(c:string,x:number,y:number,z:number,r:number,w=.063,o:T.Group=fixed)=>part(new T.TorusGeometry(r,w,8,44),c,x,y,z,1,1,1,o);
 const rod=(c:string,a:number[],d:number[],r:number,o:T.Group=fixed)=>{const delta=new T.Vector3(d[0]-a[0],d[1]-a[1],d[2]-a[2]);
   const m=cylinder(c,(a[0]+d[0])/2,(a[1]+d[1])/2,(a[2]+d[2])/2,r,r,delta.length(),o);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;};
 if(day==='1207'){
   for(const side of [-1,1])for(let i=0;i<5;i++){
     const z=6-i*4.4;rod(steel,[side*7.1,-.3,z],[side*6.2,3.75,z],.18);
     rod(blue,[side*6.2,3.75,z],[side*4.8,4.8,z],.14);
     box(ink,side*7.14,.15,z,.6,.79,3.36);
   }
 }else{
   const carpet=day==='1208'?'#ad8e70':day==='1209'?'#60776c':day==='1210'?'#af8f79':'#a3987b';
   box(carpet,0,-.71,-1,39,.45,53);
   for(const s of [-1,1])for(let j=0;j<6;j++){
     const x=s*9.3,z=7-j*4.36;
     if(day==='1211'){box(wood,x,1.78,z,.29,4.53,.33);rod(wood,[x,3.42,z],[x-s*1.45,4.51,z],.13);}
     else{
       box(day==='1208'?'#bdab91':day==='1209'?'#698582':'#9b8276',x,1.55,z,.42,4.15,3.86);
       const inner=x-s*.24;
       box(ink,inner,1.89,z,.07,1.75,2.38);
       for(let k=-1;k<=1;k++)box(day==='1209'?'#a6bdae':'#d9c6a1',inner-s*.052,1.89,z+k*.71,.038,1.48,.64);
     }
   }
 }
 const leg=(i:number)=>({x:-2.65*b.initialSide*(i%2?-1:1),z:.1-i*3.05});
 if(day==='1207'){
   for(let i=0;i<110;i++)oval(i%5?cream:lamp,i*71%74-37,1+i*31%17,-23-i%17,.043,.043,.043);
   const earth=moving(0,2.65,-13);
   const map=texture(512,256,g=>{g.fillStyle='#447da2';g.fillRect(0,0,512,256);
     const land=(points:number[][],cl:string)=>{g.fillStyle=cl;g.beginPath();points.forEach(([x,y],j)=>j?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
     land([[217,95],[239,70],[266,72],[283,94],[306,104],[283,124],[271,156],[256,179],[244,161],[237,128],[217,124]],'#b7a06b');
     land([[260,65],[272,51],[307,56],[330,40],[384,55],[403,85],[368,92],[354,114],[330,92],[305,94],[294,77]],'#859977');
     land([[340,158],[365,144],[391,156],[395,175],[367,179],[344,171]],'#bb9570');
     land([[70,88],[103,72],[134,83],[119,102],[109,110],[118,121],[104,133],[88,108]],'#95a879');
     land([[113,127],[137,121],[159,136],[147,164],[130,188],[119,160]],'#9fab78');
     for(let i=0;i<34;i++){const x=i*101%545-25,y=28+i*43%202;g.strokeStyle='#e3ede2ab';g.lineWidth=2+i%4;g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+21,y-16,x+43,y+9,x+65,y-5);g.stroke();}
   });
   part(new T.SphereGeometry(1,56,34),stage.toon('#fff',{map}),0,0,0,1.96,1.96,1.96,earth);
   hoop(steel,0,2.42,-12.04,2.94,.21);hoop(ink,0,2.42,-12.24,3.25,.16);
   for(let i=0;i<12;i++){const a=i*Math.PI/6;oval(brass,3.1*Math.cos(a),2.42+3.1*Math.sin(a),-12.13,.095,.095,.08);}
   for(const side of [-1,1])for(let i=0;i<6;i++){const x=side*6.85,z=6-i*3.4;box(blue,x,.75,z,.46,1.75,1.74);box(steel,x,1.65,z,.51,.12,1.88);}
   const photo=moving(0,1.34,-10.81);box(cream,0,0,0,1.48,1.38,.11,photo);box(ink,0,.07,.064,1.24,.99,.03,photo);oval('#78b6bb',0,.1,.105,.4,.4,.05,photo);
   effects.push((t,f)=>{earth.rotation.y=-1.7+t*.012;photo.visible=f>0;photo.position.y=.62+Math.min(1,f)*1.78;photo.rotation.z=-.1*Math.min(1,f);});
 }else if(day==='1208'){
   box('#c1a982',0,2.7,-14.8,16,5.8,.38);
   for(let i=-3;i<=3;i++){cylinder(cream,i*2.22,2.25,-14.15,.26,.34,4.9);box(brass,i*2.22,4.81,-14.15,.82,.21,.84);}
   box(wood,0,.97,-11.26,6.4,.32,2.46);
   for(const x of [-2.48,2.48])for(const z of [-10.58,-11.94])cylinder(ink,x,.43,z,.14,.19,.89);
   for(const side of [-1,1]){const book=moving(side*.89,1.2,-11.2);
     box(copper,0,.045,0,1.61,.09,1.62,book);
     for(let j=0;j<4;j++)box(cream,0,.116+j*.037,0,1.52-j*.014,.03,1.51-j*.014,book);
     for(let j=0;j<5;j++)box(ink,0,.266,-.4+j*.135,1.02-(j%2)*.25,.014,.024,book);
     oval(copper,side*.4,.293,.44,.13,.029,.13,book);
     const cover=moving(side*.10,1.49,-11.2);box('#507b77',side*.79,0,0,1.58,.082,1.61,cover);
     effects.push((_,f)=>{cover.rotation.z=side*(Math.PI*.97-Math.min(1,f/1.42)*Math.PI*.97);});}
   for(const x of [-6.3,6.3])for(let i=0;i<4;i++){const z=5-i*4.55;box(wood,x,.68,z,1.41,.16,1.65);box(blue,x,1.19,z-.74,1.45,.95,.14);for(const v of [-.54,.54])cylinder(wood,x+v,.3,z,.07,.09,.62);}
 }else if(day==='1209'){
   box('#526e67',0,2.09,-12.85,7.1,4.36,1.2);
   for(let j=0;j<3;j++)for(let i=0;i<9;i++){const x=-2.86+i*.695,y=1.77+j*.68;box(ink,x,y,-12.18,.55,.45,.11);
     oval(i%3?brass:lamp,x,y,-12.1,.088,.088,.035);}
   for(const s of [-1,1]){const reel=moving(s*1.92,1.05,-11.7);hoop(cream,0,0,0,.60,.091,reel);
     for(let i=0;i<5;i++){const a=i*1.257;rod(steel,[0,0,0],[.54*Math.cos(a),.54*Math.sin(a),0],.048,reel);}
     effects.push(t=>reel.rotation.z=s*t*(b.engaged?1.8:.25));}
   const tape=moving(0,.96,-11.58);box(cream,0,0,.69,.67,.07,1.4,tape);for(let j=0;j<7;j++)for(let i=0;i<3;i++)if((i+j)%3)box(ink,(i-1)*.16,.041,.15+j*.172,.07,.018,.067,tape);
   effects.push((_,f)=>tape.scale.z=.25+b.round*.16+Math.min(1,f)*2.5);
   for(const x of [-6.88,6.88])for(let i=0;i<5;i++){const z=6-i*3.45;box(blue,x,1.07,z,1.15,2.52,1.74);for(let j=0;j<5;j++)box(steel,x-Math.sign(x)*.59,.45+j*.29,z,.06,.12,1.14);}
 }else if(day==='1210'){
   for(const x of [-2.35,2.35]){box(wood,x,1.77,-11.6,.3,3.68,2.03);box(copper,x,3.68,-11.6,.43,.21,2.55);}
   box(wood,0,3.47,-11.85,4.72,.25,.32);
   const shuttle=moving(0,1.88,-10.75);oval(ink,0,0,0,.58,.16,.22,shuttle);oval(brass,0,.09,0,.28,.10,.11,shuttle);
   for(let i=0;i<33;i++){const x=(i-16)*.119;rod(i%3?'#e3b47f':'#96b7aa',[x,.55,-10.94],[x,3.37,-11.84],.021);}
   const cloth=moving(0,2.16,-10.63);const textile=texture(192,128,g=>{g.fillStyle='#6c94a0';g.fillRect(0,0,192,128);
     for(let j=0;j<16;j++)for(let i=0;i<24;i++){g.fillStyle=(i+j)%7===0?'#f3c382':Math.abs(i%8-4)===j%4?'#b15953':'#6d9c95';g.fillRect(i*8,j*8,7,7);}});
   box(stage.toon('#fff',{map:textile}),0,-.71,0,4.08,1.42,.09,cloth);
   for(let i=0;i<9;i++){const x=i%2?6.9:-6.9,z=5-Math.floor(i/2)*3.93;for(let j=0;j<3;j++)cylinder(j===1?'#a06569':wood,x,.27+j*.3,z,j===1?.62:.79,j===1?.62:.79,.27);}
   effects.push((t,f)=>{shuttle.position.x=Math.sin(t*(b.engaged?3:.8))*1.5;cloth.scale.y=.08+b.round*.15+Math.min(1,f)*.88;});
 }else{
   for(const x of [-6.3,6.3])for(let i=0;i<4;i++){const z=5-i*4.6;
     for(let j=0;j<2;j++){box(wood,x,.36+j*.91,z,1.73,.12,2.71);
       for(let n=0;n<3;n++)box(n%2?'#bf9968':'#cfaa80',x,.7+j*.91,z+(n-1)*.78,1.3,.5,.68);}
     for(const dz of [-1.29,1.29])box(blue,x,1.17,z+dz,.16,2.45,.16);}
   for(let j=0;j<5;j++){const x=(j-2)*3;box(j%2?'#b17a60':'#cdab80',x,1.2,-15,2.68,3.5,2.08);
     box(ink,x,1.75,-13.94,1.81,1.07,.09);for(const xx of [-.44,.44])box(lamp,x+xx,1.75,-13.876,.79,.86,.038);}
   const cart=moving(-1.62,.05,-10.8);box(blue,0,.56,0,2.29,.17,1.27,cart);
   for(const x of [-.85,.85])for(const z of [-.57,.57])oval(ink,x,.28,z,.27,.27,.095,cart);
   for(let i=0;i<3;i++){const x=(i-1)*.67;box('#cca26e',x,.94,0,.62,.59,.96,cart);box(blue,x,.95,.492,.12,.58,.025,cart);box(blue,x,1.248,0,.12,.025,.95,cart);}
   effects.push((_,f)=>{cart.position.x=-1.62+Math.min(1,f/1.65)*3.8;});
 }
 for(let i=0;i<3;i++){
   const {x,z}=leg(i),src=moving(x,.05,z+.58),dst=moving(-x,.05,z+(day==='1209'?(i-1)*.65:0));
   if(day==='1207'){cylinder(steel,0,.14,-.60,.26,.35,.28,src);hoop(brass,0,.57,-.60,.34,.05,src);const needle=moving(x,.60,z-.02);
     rod(lamp,[0,0,0],[0,.26,0],.031,needle);effects.push(()=>needle.rotation.z=(b.wind-.5)*2.6);}
   else if(day==='1208'){box(cream,0,.035,-.58,.94,.06,.59,src);rod(ink,[-.43,.09,-.82],[.4,.09,-.82],.035,src);}
   else if(day==='1209'){box(steel,0,.19,-.67,.71,.38,.6,src);box(ink,0,.42,-.58,.53,.04,.11,src);}
   else if(day==='1210'){box(copper,0,.14,-.65,.79,.28,.51,src);for(let j=0;j<4;j++)oval(ink,-.23+j*.15,.29,-.65,.045,.023,.055,src);}
   else{box(brass,0,.14,-.59,.71,.28,.61,src);box(blue,0,.15,-.27,.14,.28,.03,src);hoop(cream,0,.07,z,.79,.035).rotation.x=-Math.PI/2;}
   const ring=hoop(steel,0,.05,0,.53,.035,dst);ring.rotation.x=-Math.PI/2;
 }
 const marker=moving();hoop(lamp,0,.078,0,.83,.051,marker).rotation.x=-Math.PI/2;
 const paths=b.layout.branches.map(([x,,z],i)=>{const v=moving(x,.06,z);hoop(i?brass:'#94cab7',0,0,0,.79,.064,v).rotation.x=-Math.PI/2;return v;});
 const world=bakeDesk(stage,root);world.bounds={min:[-6.15,-2,-12.75],max:[6.15,12,11.4]};[fixed,...dyn].forEach(batch);
 return {world,update(t:number,f:number){const q=b.phase==='warmup'?b.layout.warm:b.phase==='finale'?b.layout.end:b.nextSpot;
   marker.position.set(q[0],0,q[2]);marker.visible=b.phase!=='route'&&b.phase!=='curtain';paths.forEach(r=>r.visible=b.phase==='route');effects.forEach(fn=>fn(t,f));}};
}
