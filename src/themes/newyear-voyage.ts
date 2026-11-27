import * as T from 'three';
import type {Stage} from '../level/stage';
import {texture,bakeDesk,batch,workbench} from './jan01-chapter';
import type {Vec} from '../slime/types';
import type {NewyearDay,NewyearVoyage} from '../templates/newyear-voyage';
const ink='#35464e',slate='#72898e',wood='#896749',brass='#c9a060',gold='#efc46f',cream='#eae0c7',red='#b97157',teal='#729fa4',blue='#758ba6',ice='#c7dcd8';
export const newyearLooks:Record<NewyearDay,{skyTop:string;skyHorizon:string;wash:string}>={
 '0102':{skyTop:'#648aab',skyHorizon:'#e0bb9e',wash:'#d9cbac'},'0103':{skyTop:'#8f9c9b',skyHorizon:'#dbc4a2',wash:'#dac7aa'},
 '0104':{skyTop:'#1e2746',skyHorizon:'#57516b',wash:'#a69aa9'},'0105':{skyTop:'#6493a6',skyHorizon:'#d2dedd',wash:'#d8e3d9'},
 '0106':{skyTop:'#182c42',skyHorizon:'#567482',wash:'#93a2a3'},'0107':{skyTop:'#152b46',skyHorizon:'#547290',wash:'#8b99a7'},
 '0108':{skyTop:'#648489',skyHorizon:'#e2d1a7',wash:'#dccba9'},'0109':{skyTop:'#14223c',skyHorizon:'#506377',wash:'#85979c'},
 '0110':{skyTop:'#778e93',skyHorizon:'#e3ca9f',wash:'#e1ccad'}
};
export function buildNewyearVoyageSet(stage:Stage,b:NewyearVoyage){
 const {root,fixed,part,box,cylinder,oval,group}=workbench(stage),d=b.day;root.name='voyage-'+d;
 const groups:T.Group[]=[],actions:((t:number,f:number)=>void)[]=[];
 const obj=(x=0,y=0,z=0,s=1,o=root)=>{const g=group(o);g.position.set(x,y,z);g.scale.setScalar(s);groups.push(g);return g;};
 const rect=(o:T.Group,c:string,x:number,y:number,z:number,w:number,h:number,l:number)=>box(c,x,y,z,w,h,l,o);
 const ball=(o:T.Group,c:string,x:number,y:number,z:number,w:number,h:number,l:number)=>oval(c,x,y,z,w,h,l,o);
 const peg=(o:T.Group,c:string,x:number,y:number,z:number,r:number,h:number)=>cylinder(c,x,y,z,r,r,h,o);
 const rod=(o:T.Group,c:string,a:Vec,b:Vec,w=.045)=>{const v=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const m=cylinder(c,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,w,w,v.length(),o);
   m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;};
 const ring=(o:T.Group,c:string,x:number,y:number,z:number,r:number,w=.045)=>part(new T.TorusGeometry(r,w,7,42),c,x,y,z,1,1,1,o);
 const rock=(o:T.Group,c:string,x:number,y:number,z:number,w:number,h:number,l:number)=>part(new T.IcosahedronGeometry(1,0),c,x,y,z,w,h,l,o);
 const line=(o:T.Group,c:string,p:Vec[],r:number)=>{for(let j=1;j<p.length;j++)rod(o,c,p[j-1],p[j],r);};
 function plinth(o:T.Group,w:number,h:number,l:number){for(const x of [-1,1])for(const z of [-1,1])rect(o,wood,x*(w/2-.15),h/2-.26,z*(l/2-.14),.18,h+.53,.19);rect(o,wood,0,h,0,w,.17,l);}
 const sc=('0102'===d?'#60885e':d==='0103'?'#b29b78':d==='0104'?'#57596d':d==='0105'?'#c4d8d3':d==='0106'?'#697c80':d==='0107'?'#527280':d==='0108'?'#9d8767':d==='0109'?'#647785':'#ab9273');
 const ground=texture(512,1024,g=>{g.fillStyle=sc;g.fillRect(0,0,512,1024);
  if(d==='0102'){
   g.font='bold 23px sans-serif';g.textAlign='center';
   for(let j=0;j<13;j++){const y=32+j*78;g.fillStyle=j%2?'#628c62':'#698f65';g.fillRect(0,y,512,78);g.fillStyle='#e3e3b6';g.fillRect(23,y,466,3);
    for(const x of [53,459])g.fillText(String(10+(j%5)*10),x,y+28);for(let k=1;k<5;k++)for(const x of [179,326])g.fillRect(x,y+k*15,9,2);}
   for(const x of [19,490])g.fillRect(x,0,3,1024);
  }else if(d==='0103'){for(let j=0;j<23;j++){g.fillStyle='#92795c';g.fillRect(j*24,0,1.5,1024);}g.fillStyle='#dac59b';for(let j=0;j<54;j++)g.fillRect(39,12+j*19,j%5?8:20,2);}
  else if(d==='0104'){g.strokeStyle='#a38e995d';for(let i=0;i<8;i++){g.beginPath();g.ellipse(256,512,49+i*43,102+i*69,.34,0,Math.PI*2);g.stroke();}}
  else if(d==='0106'||d==='0107'||d==='0109'){g.strokeStyle='#b9c8bd59';g.lineWidth=1.8;
   for(let j=0;j<24;j++){g.beginPath();g.ellipse(256,99+j*42,(d==='0109'?130:144)+j%4*17,21+j%4*6,(d==='0109'?.12:0),.31,6.10);g.stroke();}
   for(let j=0;j<3;j++)for(let k=0;k<6;k++){g.fillStyle='#dfc18a73';g.fillRect(34+k*13,437-j*104,8,k%2?5:10);}
  }else if(d==='0108'||d==='0110'){for(let j=0;j<36;j++){g.strokeStyle=j%5?'#65534565':'#e3d0a17a';g.beginPath();
    if(d==='0108'){g.moveTo(j*14,0);g.lineTo(j*14+4,1024);}else{g.moveTo(24,j*30);g.lineTo(488,j*30);}g.stroke();}
  }else{g.strokeStyle='#98b2b357';for(let j=0;j<40;j++){g.beginPath();g.moveTo(j*71%512,j*119%1009);g.lineTo(j*71%512+34,j*119%1009+4);g.stroke();}}
  for(let j=0;j<970;j++){g.fillStyle=j%2?'#e3d7af24':'#47555924';g.fillRect(j*83%512,j*131%1023,3+j%5,2);}
 });
 const edges:Partial<Record<NewyearDay,[number,number][]>>={
 '0102':[[-5.1,11.9],[5.1,11.9],[5.1,-14.1],[-5.1,-14.1]],
 '0103':[[-2.75,11.9],[3.22,11.9],[3.22,7],[4.96,6.15],[4.96,-8.46],[4.34,-9.16],[4.34,-14.1],[-4.87,-14.1],[-4.87,6.56],[-2.75,7.22]],
 '0104':[[-2.60,11.9],[2.57,11.9],[3.36,7.89],[5.15,4.11],[5.29,.52],[4.42,-3.23],[4.76,-7.74],[3.96,-14.1],[-4.13,-14.1],[-4.81,-7.49],[-4.37,-3.06],[-5.41,1.33],[-4.97,5.76],[-3.07,7.92]],
 '0105':[[-2.73,11.9],[2.66,11.9],[3.26,7.47],[5.04,6.07],[4.61,2.77],[5.13,-1.75],[4.52,-5.42],[4.69,-8.92],[3.75,-14.1],[-4.67,-14.1],[-4.88,-5.44],[-4.59,-1.21],[-5.09,4.81],[-3.25,7.44]]};
 const edge=edges[d]??[[-2.76,11.9],[2.86,11.9],[3.20,7.97],[4.99,6.42],[4.58,-7.64],[4.91,-14.1],[-4.58,-14.1],[-4.58,-7.83],[-4.88,5.39],[-3.07,7.29]],floor=new T.ShapeGeometry(new T.Shape(edge.map(([x,z])=>new T.Vector2(x,-z))));floor.rotateX(-Math.PI/2);
 const uv=floor.getAttribute('uv'),pos=floor.getAttribute('position');for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+5.53)/11.06,(pos.getZ(i)+14.15)/26.08);
 part(floor,stage.toon('#fff',{map:ground}),0,0,0,1,1,1,fixed,'solid-deck');const verts:number[]=[];
 for(let i=0;i<edge.length;i++){const [x,z]=edge[i],[u,v]=edge[(i+1)%edge.length];verts.push(x,0,z,u,0,v,u,-.49,v,x,0,z,u,-.49,v,x,-.49,z);}
 const skirt=new T.BufferGeometry();skirt.setAttribute('position',new T.Float32BufferAttribute(verts,3));skirt.computeVertexNormals();part(skirt,stage.toon(d==='0105'?ice:ink,{side:T.DoubleSide}),0,0,0,1,1,1);
 rect(fixed,d==='0105'?'#b8cccb':d==='0102'?'#788c72':d==='0104'?'#514f61':'#8c7f6a',0,-1.01,-4,69,.91,75);
 function ramp(name:string,x:number,z:number,side:number,width:number,height:number,length:number,col:string){
   // The closed side profile rises from both ends. Its bottom sits inside the deck.
   const s=new T.Shape([new T.Vector2(-width*.5,-.12),new T.Vector2(width*.5,-.12),new T.Vector2(width*.5,.043),
     new T.Vector2(width*.19,height),new T.Vector2(-width*.19,height),new T.Vector2(-width*.5,.043)]);
   const m=part(new T.ExtrudeGeometry(s,{depth:length,bevelEnabled:false}),stage.toon(col),x,0,z-length/2,1,1,1,fixed,'solid-'+name);
   if(side<0){m.rotation.y=Math.PI;m.position.z=z+length/2;}return m;
 }
 const q=(f:number)=>Math.min(1,f/1.61);
 if(d==='0102'){
   const football=(o:T.Group,s:number)=>{ball(o,'#985a3e',0,0,0,.36*s,.21*s,.21*s);for(const a of [-1,1])ring(o,cream,a*.205*s,0,0,.157*s,.021*s).rotation.y=Math.PI/2;
    rod(o,cream,[-.115*s,.176*s,.079*s],[.115*s,.176*s,.079*s],.016*s);for(let j=0;j<5;j++)rod(o,cream,[(j-2)*.047*s,.16*s,.099*s],[(j-2)*.047*s,.205*s,.039*s],.012*s);};
   // A player's-eye tunnel entrance with tiered sidelines, a bench, tee case and striped windsocks.
   for(const s of [-1,1]){for(let j=0;j<14;j++){const z=7.15-j*1.53;for(let k=0;k<4;k++){const x=s*(6.02+k*.74),y=-.23+k*.44;
      rect(fixed,j%3===0?'#a37966':'#89948a',x,y,z,.72,.44,1.50);for(let n=0;n<2;n++)ball(fixed,(j+k+n)%3?red:cream,x,y+.31,z+(n-.5)*.63,.13,.18,.12);}}
    for(let j=0;j<3;j++){const z=7.04+j*.89;rect(fixed,ink,s*3.40,1.11,z,.23,2.94,.26);rod(fixed,ink,[s*3.41,2.56,z],[s*2.48,3.08,z],.11);}
   }
   for(const z of [7.04,8.82])rod(fixed,ink,[-2.46,3.08,z],[2.46,3.08,z],.11);
   const bench=obj(-3.83,.02,4.62);plinth(bench,2.05,.44,.81);const caseBall=obj(-.38,.77,0,1,bench);football(caseBall,1.05);
   for(let j=0;j<3;j++)peg(bench,cream,.34+j*.19,.64,.13,.064,.23);
   const flags:T.Group[]=[];for(const [x,z] of [[3.43,4.51],[-4.04,-.73],[3.94,-5.95]]){rod(fixed,ink,[x,-.30,z],[x,2.48,z],.064);
    const flag=obj(x,2.40,z);for(let j=0;j<5;j++){const tube=part(new T.CylinderGeometry(.147-j*.020,.17-j*.020,.21,8),j%2?cream:red,(j+.5)*.203,0,0,1,1,1,flag);tube.rotation.z=Math.PI/2;}flags.push(flag);}
   const gateZ=-11.57;rod(fixed,gold,[0,0,gateZ-.50],[0,2.08,gateZ-.50],.105);rod(fixed,gold,[0,2.08,gateZ-.50],[0,2.24,gateZ],.106);
   rod(fixed,gold,[-1.75,2.24,gateZ],[1.75,2.24,gateZ],.071);for(const s of [-1,1]){rod(fixed,gold,[s*1.75,2.24,gateZ],[s*1.75,5.18,gateZ],.072);
    rect(fixed,red,s*1.75,5.20,gateZ,.21,.13,.057);}
   const chalk=obj();ring(chalk,cream,0,0,0,.25,.028).rotation.x=-Math.PI/2;
   const ballGroup=obj();football(ballGroup,.70);const cursor=obj();ring(cursor,gold,0,0,0,.145,.027);
   const score=obj(3.74,.02,-11.65);for(const s of [-1,1])rect(score,ink,s*.95,.87,0,.15,1.79,.17);
   const panel=obj(0,1.82,0,1,score);rect(panel,ink,0,0,0,2.44,1.12,.17);
   const display=texture(256,110,g=>{g.fillStyle='#394953';g.fillRect(0,0,256,110);g.fillStyle='#f1c37c';g.textAlign='center';g.font='bold 61px monospace';g.fillText('52·49',128,73);});
   box(stage.toon('#fff',{map:display}),0,0,.108,2.23,.91,.033,panel);
   actions.push((t,f)=>{const p=b.safeSpot,shot=b.shot;flags.forEach(flag=>{flag.rotation.y=(b.wave-.5)*2.73;flag.rotation.z=(b.wave-.5)*.34;});
    chalk.position.set(p[0],.033,p[2]);cursor.position.set(b.kickX,2.76,gateZ+.11);cursor.visible=b.engaged&&!shot;
    if(shot){const a=Math.min(1,shot.age/.87);ballGroup.position.set(shot.start[0]+(shot.crossX-shot.start[0])*a,shot.start[1]+2.62*a+Math.sin(Math.PI*a)*1.77,shot.start[2]+(gateZ-.57-shot.start[2])*a);ballGroup.rotation.z=a*6.6;}
    else{ballGroup.position.set(p[0],.22,p[2]);ballGroup.rotation.z=.82;}ballGroup.visible=b.phase!=='curtain';panel.rotation.x=-.91+.91*q(f);});
 }else if(d==='0103'){
   function helix(o:T.Group,w:number,r:number,pitch:number,col:string){
    const points:Vec[]=[];for(let j=0;j<=84;j++){const u=j/84,a=u*pitch*Math.PI*2;points.push([(u-.5)*w,r*Math.cos(a),r*Math.sin(a)]);}line(o,col,points,.064);
   }
   function paperRibbon(parent:T.Group){
     const ribbon=group(parent),base:number[]=[],closed:number[]=[],uv:number[]=[],tri:number[]=[];
     const segments=132,turns=4.67,pitch=2.68/turns,radius=.34;
     for(let j=0;j<=segments;j++){const u=j/segments,angle=u*turns*Math.PI*2;
       for(let n=0;n<4;n++){const side=n%2?1:-1,rad=n<2?radius:radius-.026,center=(u-.5)*2.68;
         const y=rad*Math.cos(angle),z=rad*Math.sin(angle);
         base.push(center+side*pitch*.19,y,z);closed.push(center+side*pitch*.499,y,z);uv.push(n%2,u);}
       if(j){const a=j*4-4,z=j*4;
         for(const [v,w] of [[0,1],[1,3],[3,2],[2,0]])tri.push(a+v,z+v,a+w,a+w,z+v,z+w);}}
     const geom=new T.BufferGeometry();geom.setIndex(tri);geom.setAttribute('position',new T.Float32BufferAttribute(base,3));
     geom.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geom.morphAttributes.position=[new T.Float32BufferAttribute(closed,3)];geom.computeVertexNormals();
     const stripes=texture(96,160,g=>{g.fillStyle='#ecdcba';g.fillRect(0,0,96,160);g.fillStyle='#be7257';g.fillRect(5,0,16,160);
       g.fillStyle='#c4a67f';g.fillRect(83,0,3,160);for(let j=0;j<27;j++){g.fillStyle='#afa38580';g.fillRect(28+j*11%50,j*23%160,4,1);}});
     const mesh=part(geom,stage.toon('#fff',{map:stripes,side:T.DoubleSide}),0,0,0,1,1,1,ribbon);mesh.updateMorphTargets();return mesh;
   }
   function bench(o:T.Group,specimen:boolean){
    plinth(o,3.81,.78,1.76);for(const sx of [-1,1]){rect(o,ink,sx*1.49,1.25,0,.24,.90,.64);ring(o,brass,sx*1.48,1.69,0,.34,.067).rotation.y=Math.PI/2;}
    const core=obj(0,1.69,0,1,o);const cyl=peg(core,'#976e51',0,0,0,.27,3.24);cyl.rotation.z=Math.PI/2;
    const paper=obj(0,1.69,0,1,o),wrap=paperRibbon(paper);
    ring(o,wood,1.89,1.71,0,.43,.054).rotation.y=Math.PI/2;rod(o,brass,[1.87,1.71,0],[1.90,2.09,0],.055);
    if(specimen)for(let j=0;j<3;j++){const roll=obj(-.85+j*.47,1.06,.65,.52,o);helix(roll,.78,.096,2.44,j%2?cream:brass);}
    return {core,paper,wrap};}
   const near=obj(-3.69,.03,4.45,1.03);near.rotation.y=.49;const n=bench(near,true);const end=obj(.15,.03,-11.77,1.35);const a=bench(end,false);
   for(const s of [-1,1])for(let j=0;j<6;j++){const z=6.3-j*3.48;rect(fixed,wood,s*5.56,1.30,z,.23,3.55,.25);
    if(j<5){rect(fixed,wood,s*5.55,2.99,z-1.74,.31,.21,3.48);if(s>0)rect(fixed,'#b6b49a',s*5.55,1.83,z-1.74,.1,1.64,2.88);}}
   for(let j=0;j<3;j++){const s=b.initialSide*(j%2?-1:1),z=.04-j*2.64;
    const spool=obj(-s*3.24,.05,z-.96,.78);peg(spool,wood,0,.24,0,.34,.46);for(const y of [.08,.46])peg(spool,brass,0,y,0,.43,.084);
    ring(fixed,gold,-s*3.22,.071,z-.97,.49,.036).rotation.x=Math.PI/2;
    const paper=obj(0,.19,z-.94);helix(paper,2.62,.115,3,cream);actions.push(()=>paper.scale.x=b.round>j?1:b.round===j?Math.max(.16,b.displacement):.14);}
   actions.push((t,f)=>{n.paper.rotation.x=b.elapsed*.10+b.displacement*4.68;n.wrap.morphTargetInfluences![0]=.20+.69*b.displacement;
    a.paper.rotation.x=b.round*.67+q(f)*2.53;a.wrap.morphTargetInfluences![0]=Math.min(1,.20+b.round*.15+q(f)*.35);
    a.core.position.x=-q(f)*3.10;a.paper.position.x=q(f)*.39;});
 }else if(d==='0104'){
   function bow(o:T.Group,s:number){const points:Vec[]=[];for(let j=0;j<=38;j++){const x=(j/38-.5)*3.63;points.push([x,(1.65-.40*x*x)*s,.02]);}line(o,s>1?red:gold,points,s>1?.078:.049);}
   for(let j=0;j<128;j++){const x=j*73%81-41,z=-12-j%18,y=1+j*17%14;ball(fixed,j%3?cream:blue,x,y,z,.043+j%3*.018,.061,.044);}
   const near=obj(-3.60,.09,4.21,.92);near.rotation.y=.4;plinth(near,3.83,.59,1.22);const profile=obj(0,.79,0,1,near);bow(profile,1.23);bow(profile,.98);
   ball(profile,cream,0,.66,.06,.16,.16,.16);for(let j=0;j<8;j++)rod(profile,blue,[(j-3.5)*.43,2.72,0],[(j-3.5)*.43,2.24,.03],.029);
   const sky=obj(0,.43,-12.11,1.54);rect(sky,'#384658',0,1.41,-.18,4.31,2.96,.19);bow(sky,1.32);bow(sky,1.05);ball(sky,cream,0,.70,0,.21,.21,.15);
   for(let j=0;j<49;j++)ball(sky,j%2?cream:teal,(j*17%39-19)*.102,.19+(j*31%24)*.106,-.065,.026,.026,.015);
   for(const s of [-1,1])for(let j=0;j<4;j++){const z=4.25-j*4.18,arc=obj(s*5.18,-.23,z,.70);arc.rotation.y=-s*.47;bow(arc,.99);}
   for(let j=0;j<3;j++){const s=b.initialSide*(j%2?-1:1),z=.04-j*2.64;
     for(const [x,h,zz] of [[-1.28*s,.26,z-.86],[1.05*s,.27,z-1.29]]){
       ramp('bow-rim',x,zz,s,1.86,h,.84,'#827483');
       const fringe:Vec[]=[];for(let n=0;n<8;n++){const u=n/7;fringe.push([x-.77+1.54*u,.14+.30*Math.sin(Math.PI*u),zz-.44]);}line(fixed,red,fringe,.043);
     }}
   const ribbons:T.Group[]=[];for(let j=0;j<15;j++){const o=obj(0,.17+(j%3)*.17,.14-Math.floor(j/3)*1.62);rod(o,j%3?blue:cream,[-.31,0,0],[.31,0,0],.029);ribbons.push(o);}
   const trace=obj(0,.01,.085,1,sky);bow(trace,.79);actions.push((t,f)=>{ribbons.forEach((o,j)=>o.position.x=((t*(1.3+j%3*.17)+j*2.04)%8.70)-4.35);
    trace.scale.x=.18+b.round*.18+q(f)*.28;profile.rotation.z=(b.wave-.5)*.13;});
 }else if(d==='0106'){
   function camera(o:T.Group,small=false){
     plinth(o,3.16,.68,1.52);rect(o,ink,-.46,1.29,0,1.42,.89,.72);
     for(let j=0;j<7;j++)rect(o,j%2?slate:ink,-.24+j*.145,1.29,.02,.075,.98-j*.063,.76-j*.056);
     const lens=peg(o,brass,.84,1.28,0,.35,.31);lens.rotation.z=Math.PI/2;
     const glass=peg(o,teal,.99,1.28,0,.262,.062);glass.rotation.z=Math.PI/2;
     if(!small){const knob=peg(o,wood,-.73,1.88,.05,.16,.29);knob.rotation.z=.20;}
   }
   const near=obj(-3.37,.03,4.49,1.06);near.rotation.y=.52;camera(near);
   for(const sg of [-1,1])for(let j=0;j<11;j++){
     const x=sg*(6.02+j%4*1.66),z=4.3-j*2.77;kRock(x,z,j);}
   function kRock(x:number,z:number,j:number){
     rock(fixed,j%3?'#839095':'#576d75',x,-.28,z,1+j%4*.31,.62+j%3*.42,.84+j%4*.28);
     if(j%2)rock(fixed,'#617780',x+.62,.171,z-.74,.6,.51,.74);}
   for(let j=0;j<3;j++){const s=b.initialSide*(j%2?-1:1),z=.04-j*2.64;
     const shield=obj(-s*3.13,.03,z-1.33,.68);rect(shield,ink,0,.62,0,1.18,1.15,.15);
     for(const x of [-.47,.47])rod(shield,brass,[x,.50,.070],[x,.04,.49],.046);}
   // Layer the darkroom's sidelights in front of a low-contrast, two-lobed comet model.
   for(const sign of [-1,1]){
     const lamp=obj(sign*3.60,.06,-10.77,.92);rect(lamp,ink,0,.18,0,.35,.36,.32);
     rod(lamp,brass,[0,.35,0],[0,2.49,0],.036);
     rect(lamp,wood,0,2.20,0,.79,.43,.38);rect(lamp,red,0,2.22,.208,.63,.26,.045);
     rect(lamp,cream,0,2.16,.239,.53,.038,.013);
   }
   const comet=obj(-8.75,4.22,-20.53,1.16);comet.rotation.z=.36;
   rock(comet,'#516879',-.91,-.26,0,2.12,1.53,1.15);
   rock(comet,'#596f7b',1.62,.66,-.05,1.63,1.18,1.06);
   rock(comet,'#506a75',.39,.13,.06,.92,.72,1.08);
   for(let j=0;j<32;j++)ball(fixed,j%5?slate:ice,(j*47%62-31)*.28,4.65+j%9*.42,-19.11-j%6*.41,.031+j%3*.019,.034,.038);
   const end=obj(0,0,-11.98,1.23);plinth(end,4.69,.68,1.84);const frame=obj(0,.81,.08,1,end);frame.name='coma-film';
   const scene=texture(512,295,g=>{g.fillStyle='#1d3443';g.fillRect(0,0,512,295);
     g.fillStyle='#768f91';g.beginPath();const rim=[[0,182],[51,169],[96,181],[152,132],[213,150],[282,118],[326,148],[400,119],[512,172],[512,295],[0,295]];
     rim.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.fill();
     for(let j=0;j<146;j++){const x=12+j*71%490,y=8+j*29%207;g.fillStyle=j%2?'#f2dbc8':'#aecbd0';g.fillRect(x,y,j%5?1:3,j%3?2:4);}
     g.strokeStyle='#90b7bec9';for(let j=0;j<11;j++){const x=32+j*42,y=183+j%4*9;g.beginPath();g.moveTo(x,y);g.lineTo(x+27,y-41-j%4*7);g.stroke();}
   });
   rect(frame,wood,0,1.14,0,4.19,2.28,.17);
   part(new T.BoxGeometry(3.94,2.02,.07),stage.toon('#fff',{map:scene}),0,1.14,.111,1,1,1,frame);
   const slit=obj(-1.75,1.80,.10,1,frame);rect(slit,brass,0,0,0,.057,.94,.032);
   actions.push((t,f)=>{frame.rotation.x=-1.16*(1-q(f));slit.position.x=-1.71+3.42*b.wave*(1-q(f));});
 }else if(d==='0107'){
   for(let j=0;j<77;j++)ball(fixed,j%4?cream:ice,j*109%72-36,1.46+j*17%21,-14.48-j%22,.053+j%4*.016,.056,.048);
   function optic(o:T.Group,r:number){
     for(const v of [-1,1])rod(o,brass,[v*.46,.11,.44],[0,1.19,0],.063);
     rod(o,wood,[0,1.19,0],[0,.09,-.59],.073);
     ring(o,brass,0,1.39,.21,r,.083);ring(o,teal,0,1.39,.285,r*.82,.060);
     ball(o,'#585c7c',0,1.39,.12,r*.85,r*.87,.12);
   }
   const near=obj(-3.62,.06,4.15,1.33);near.rotation.y=.57;plinth(near,2.50,.48,1.15);const scope=obj(0,.51,0,1,near);optic(scope,.67);
   for(let j=0;j<3;j++){
     const z=.04-j*2.64,s=b.initialSide*(j%2?-1:1);const o=obj(-s*3.20,.02,z-1.27,.56);optic(o,.69);
     for(const sg of [-1,1]){const stand=obj(sg*4.65,.03,z-.84,.73);rect(stand,slate,0,.46,0,.79,.94,.62);ring(stand,brass,0,.88,.35,.34,.055);}
   }
   const end=obj(0,.01,-11.91,1.45);plinth(end,4.60,.40,1.84);
   const frames=[obj(-1.37,.55,.01,1,end),obj(1.37,.55,.06,1,end)];
   for(let j=0;j<2;j++){
     const frame=frames[j],col=j?'#b19ac2':teal;const cx=j?-1.28:1.28;
     for(const y of [.088,2.14])rect(frame,ink,cx,y,0,2.55,.12,.19);
     for(const x of [-1.28,1.28])rect(frame,ink,cx+x,1.14,0,.13,2.13,.19);
     for(let k=0;k<4;k++){const r=ring(frame,k%2?col:cream,cx,1.13,.073+k*.035,1.02-k*.179,.042-k*.005);r.scale.y=.72+(.17-j*.09)*k/3;r.rotation.z=j?.32:-.23;}
   }
   const pupil=obj(0,1.69,.196,1,end);pupil.name='cat-eye-pupil';ball(pupil,gold,0,0,0,.17,.25,.104);
   actions.push((_,f)=>{const v=q(f);frames[0].rotation.y=1.02*(1-v);frames[1].rotation.y=-.98*(1-v);frames[0].position.z=-.16;frames[1].position.z=.12;scope.rotation.y=.25*(b.wave-.5);pupil.visible=f>.39;});
 }else if(d==='0108'){
   const green='#486159',oak='#896145';
   function ledge(o:T.Group,w:number){rect(o,oak,0,0,.14,w,.13,.30);
     for(let i=0;i<9;i++)rect(o,brass,(i-4)*w/10,.077,.20,.015,.012,i%2?.071:.132);}
   for(const s of [-1,1])for(let j=0;j<6;j++){const z=5.9-j*3.03,x=s*5.70;
     rect(fixed,oak,x,1.10,z,.16,2.57,2.72);rect(fixed,cream,x-s*.099,1.95,z,.033,.12,2.68);
     if(j%2===0){rect(fixed,ink,x-s*.10,1.13,z,.078,1.27,1.81);for(let k=0;k<4;k++)rect(fixed,oak,x-s*.168,.69+k*.27,z,.135,.088,1.75);}}
   const near=obj(-3.55,.01,3.81,1.10);near.rotation.y=.28;plinth(near,2.23,.62,1.43);ledge(obj(0,.71,.41,1,near),1.95);
   for(let j=0;j<6;j++){const p=peg(near,j%3?cream:teal,-.62+j*.24,.736,-.16,.049,.44);p.rotation.set(Math.PI/2,0,-.2+j*.2);}
   for(let j=0;j<3;j++){const z=.04-j*2.64;
     const slack=obj(0,.094,z-1.63,.77);ledge(slack,1.45);rect(slack,teal,0,-.042,.14,1.45,.091,.23);}
   rect(fixed,'#c4ab85',0,1.76,-15.55,10.87,4.59,.22);
   for(const s of [-1,1]){
     const x=s*3.62,z=-15.41;
     rect(fixed,oak,x,2.83,z,1.92,2.05,.12);
     for(let col=0;col<2;col++)for(let row=0;row<3;row++){
       const xx=x+(col-.5)*.88,y=2.80+(row-1)*.64;
       rect(fixed,row===2?'#a5bcbd':'#d3cb9b',xx,y,z+.072,.78,.55,.03);
     }
     rect(fixed,cream,x,1.78,z+.08,2.14,.12,.34);
     rect(fixed,'#746957',x,.66,z+.228,1.86,1.10,.54);
     for(let j=0;j<11;j++)rect(fixed,j%3?oak:green,x+(j-5)*.143,.92+(j%3)*.043,z+.524,.121,.38+j%3*.087,.082);
   }
   const tutor=obj(-3.31,.04,-9.64,.78);plinth(tutor,1.61,.62,.91);
   rect(tutor,green,-.32,.77,-.11,.47,.17,.36);rect(tutor,cream,-.32,.849,-.11,.42,.048,.39);
   for(let j=0;j<20;j++)ball(tutor,j%4?cream:'#b6ad91',.17+j*33%22*.027,.714,.04+j*17%21*.023,.018,.012,.017);
   const end=obj(0,.03,-11.99,1.28);plinth(end,4.58,.55,1.64);
   rect(end,wood,0,1.93,-.21,4.66,2.68,.21);rect(end,green,0,1.93,-.067,4.40,2.40,.062);
   ledge(obj(0,.75,-.01,1,end),4.52);
   for(let j=0;j<3;j++){
     const stroke=obj((j-1)*.47,1.90+(j===1?.19:0),.034+j*.032,1,end);stroke.rotation.z=(j-1)*.24;
     const pts:Vec[]=[];for(let k=0;k<=24;k++){const t=.23+k/24*(2.33+j*.49);pts.push([(1.67-j*.35)*Math.cos(t),(.76-j*.13)*Math.sin(t)-.15,0]);}
     line(stroke,j%2?'#cdd7ae':cream,pts,.034);if(j===2)actions.push((_,f)=>stroke.scale.x=.05+.95*q(f));
   }
   const chalk=obj(-1.67,.84,.24,1,end);chalk.name='chalk-boundary';const p=peg(chalk,cream,0,0,0,.079,.42);p.rotation.z=1.25;
   actions.push((_,f)=>{chalk.position.x=-1.67+3.15*q(f);chalk.position.y=.84+.55*Math.sin(Math.PI*q(f));});
 }else if(d==='0109'){
   const coral='#ccab9a',cyan='#97c7bf';
   for(let j=0;j<110;j++)ball(fixed,j%3?cream:cyan,j*109%72-36,1.3+j*17%23,-14.48-j%22,.049+j%4*.014,.053,.037);
   const near=obj(-3.53,.03,4.07,1.1);plinth(near,2.65,.49,1.34);const viewer=obj(0,.53,0,1,near);
   for(const s of [-1,1])rod(viewer,brass,[s*.81,.11,0],[s*.81,1.5,0],.066);
   const glass=part(new T.DodecahedronGeometry(1,0),stage.toon('#89aeb6',{transparent:true,opacity:.68}),0,.88,0,.88,.68,.21,viewer);
   for(let j=0;j<3;j++)for(const s of [-1,1]){
     const z=.04-j*2.64,x=s*3.68;
     const shield=obj(x,.04,z-1.28,.76);shield.rotation.y=.63*s;
     ring(shield,ink,0,.98,.04,.59,.061);rect(shield,cyan,0,.93,0,.86,.83,.074);
     for(const k of [-1,1])rod(shield,brass,[k*.5,.04,.26],[k*.40,.72,.051],.053);
   }
   const end=obj(0,.02,-11.94,1.32);plinth(end,4.51,.54,1.51);
   const crown=obj(0,1.07,0,1,end);crown.name='nebula-crown';ball(crown,teal,0,1.01,0,.90,.78,.26);
   for(let i=0;i<3;i++){
     const l=obj((i-1)*1.28,.61,.14+i*.029,1,crown);l.rotation.z=(i-1)*1.15;
     for(let j=0;j<5;j++){const pts:Vec[]=[];for(let k=0;k<22;k++){
       const t=k/21,x=(t-.5)*1.89;pts.push([x,Math.sin(t*Math.PI)*(.61+j*.075)+j*.049,.07+j*.028]);}
       line(l,j%2?coral:cyan,pts,.047-j*.005);}
     actions.push((_,f)=>{l.position.x=(i-1)*(1.83-.64*q(f));l.rotation.z=(i-1)*(1.44-.33*q(f));});
   }
   actions.push((_,f)=>{crown.position.y=1.07+.68*q(f);glass.rotation.z=(b.wave-.5)*.34;});
 }else if(d==='0110'){
   const press='#3b4a4e',paper='#ecdab6',rust='#915f40';
   for(const s of [-1,1])for(let j=0;j<6;j++){const z=6.1-j*3.08;rect(fixed,wood,s*5.61,1.24,z,.27,2.78,.21);
     if(j<5)rect(fixed,wood,s*5.61,2.73,z-1.54,.33,.21,3.08);
     for(let k=0;k<4;k++)rect(fixed,paper,s*5.18,.17+k*.086,z-.65,.71,.079,.88);}
   const near=obj(-3.57,.05,4.31,1.07);near.rotation.y=.39;plinth(near,2.55,.52,1.50);
   rect(near,rust,0,1.02,0,1.80,.91,.63);rect(near,ink,0,1.67,0,.16,.49,.24);
   const roller=peg(near,press,.012,1.46,.36,.22,1.41);roller.rotation.z=Math.PI/2;
   for(let j=0;j<14;j++)rect(near,brass,(j%7-3)*.159,.533,.46+Math.floor(j/7)*.19,.135,.089,.15);
   for(let j=0;j<3;j++){const z=.04-j*2.64,s=b.initialSide*(j%2?-1:1);const o=obj(-s*3.26,.069,z-1.47,.60);
     rect(o,rust,0,.12,0,1.95,.23,.83);for(let k=0;k<8;k++)rect(o,k%4?press:cream,(k-3.5)*.183,.277,.12,.156,.085,.51);}
   const end=obj(0,.02,-11.87,1.29);plinth(end,4.49,.63,1.59);
   const page=obj(0,.71,0,1,end);page.name='newspaper-impression';
   const proof=(route:number)=>texture(540,380,g=>{
     g.fillStyle='#eadabd';g.fillRect(0,0,540,380);g.fillStyle='#43514e';g.fillRect(20,21,500,3);g.fillRect(20,70,500,2);
     g.font='bold 32px serif';g.textAlign='center';g.fillText(route?'街角来信 · 夜雨':'街角来信 · 借窗',270,58);
     for(let panel=0;panel<3;panel++){
       const x=28+panel*166,y=82;g.strokeStyle='#5c5b4e';g.lineWidth=3;g.strokeRect(x,y,153,226);
       g.fillStyle=route?'#899a8f':'#b9ad86';g.fillRect(x+7,y+9,139,207);
       g.strokeStyle='#6d6655';g.lineWidth=1;for(let k=0;k<16;k++){g.beginPath();g.moveTo(x+7+k*8,y+11);g.lineTo(x+7+k*8,y+128+k%4*14);g.stroke();}
       g.fillStyle='#776951';g.fillRect(x+8,y+113,61,104);g.fillRect(x+95,y+94,48,123);
       g.fillStyle='#dfc99e';for(let k=0;k<3;k++)g.fillRect(x+16+k*16,y+126,10,24);
       const xx=x+42+panel*(route?17:34),yy=y+151;
       if(route){g.fillStyle='#dfdac0';for(let k=0;k<10;k++)g.fillRect(x+15+k*12,y+20+(k*13)%57,2,14);}
       g.fillStyle='#375c5d';g.beginPath();g.moveTo(xx,yy);g.lineTo(xx+19,yy-24);g.lineTo(xx+33,yy);g.lineTo(xx+38,yy+35);g.lineTo(xx-6,yy+35);g.fill();
       g.fillStyle='#d9b18a';g.beginPath();g.ellipse(xx+16,yy-13,10,9,.10,0,Math.PI*2);g.fill();
       g.fillStyle='#f5e1b8';g.fillRect(xx+23,yy+9,20,11);g.strokeRect(xx+23,yy+9,20,11);
       g.fillStyle='#5b584d';g.fillRect(x+11,y+237,129-panel*13,2);g.fillRect(x+15,y+248,112-panel*9,2);
     }
   });
   rect(page,wood,0,1.35,0,4.43,2.67,.13);
   const sheets=[0,1].map(i=>{const o=obj(0,0,0,1,page);part(new T.BoxGeometry(4.20,2.43,.059),stage.toon('#fff',{map:proof(i)}),0,1.36,.086,1,1,1,o);return o;});
   for(const s of [-1,1])rect(page,brass,s*1.62,2.55,.14,.29,.18,.15);
   actions.push((_,f)=>{page.rotation.x=-1.23*(1-q(f));sheets[0].visible=b.route<0;sheets[1].visible=b.route>=0;});
 }else{
   for(let j=0;j<34;j++){const s=j%2?1:-1;rock(fixed,j%4?ice:'#a3bdc4',s*(6.71+j*3%19),-1.21,7.02-j*5%36,1.7+j%5,.58+j%4*.42,2.48);}
   function gauge(o:T.Group){plinth(o,2.85,.63,1.27);rect(o,ink,0,1.16,0,2.25,.98,.20);
    for(const s of [-1,1]){rod(o,ice,[-1.03,1.21+s*.16,.15],[1.03,1.21+s*.16,.15],.047);peg(o,brass,s*.99,1.21,.13,.073,.44);}
    for(let j=0;j<11;j++)rect(o,j===4||j===6?gold:cream,(j-5)*.17,1.48,.14,.031,j%2?.12:.18,.049);
    const bubble=obj(0,1.22,.17,1,o);ball(bubble,gold,0,0,0,.153,.108,.069);return bubble;}
   const near=obj(-3.31,.03,4.54,1.10);near.rotation.y=.37;const spirit=gauge(near);const hut=obj(0,.04,-12.18,1.26);
   for(const x of [-1.26,1.26])for(const z of [-.77,.77])peg(hut,ink,x,.11,z,.12,.31);
   rect(hut,red,0,1.04,0,3.13,1.76,1.86);rect(hut,cream,0,2.02,0,3.44,.19,2.11);
   for(const x of [-1.09,1.09]){rect(hut,cream,x,1.14,.99,.67,.66,.092);rect(hut,teal,x,1.17,1.051,.49,.47,.036);}
   rect(hut,ink,0,.86,.98,.66,1.30,.1);const dome=obj(0,2.17,0,1,hut);
   part(new T.SphereGeometry(1,24,10,0,Math.PI*2,0,Math.PI/2),stage.toon(ice,{side:T.DoubleSide}),0,.042,0,.87,.64,.72,dome);
   const lip=ring(dome,slate,0,.050,0,.87,.043);lip.rotation.x=Math.PI/2;lip.scale.y=.83;
   for(const x of [-.82,.82]){
     peg(hut,slate,x,2.62,-.24,.057,1.12);peg(hut,brass,x,3.18,-.24,.080,.088);
     rect(dome,brass,x,.091,-.24,.20,.14,.24);}
   peg(hut,slate,0,2.19,0,.29,.18);const tube=obj(0,2.39,0,1,hut);
   rod(tube,ink,[-.28,-.12,0],[.44,.39,.17],.146);ball(tube,teal,.45,.40,.18,.139,.109,.132);
   const desk=obj(1.89,.01,1.04,.84,hut);plinth(desk,1.50,.65,.87);
   const journal=obj(0,.83,.02,1,desk);rect(journal,wood,0,0,0,1.28,.085,.72);
   for(const side of [-1,1]){const page=rect(journal,cream,side*.31,.058,0,.61,.053,.65);page.rotation.z=side*.047;}
   for(let j=0;j<3;j++){const mark=obj(-.34+j*.31,.108,0,1,journal);ring(mark,teal,0,0,0,.097,.018).rotation.x=Math.PI/2;
     for(const sx of [-.035,.035])rect(mark,ink,sx,.015,0,.015,.019,.13);
     actions.push(()=>mark.visible=b.round>j);}
   for(let j=0;j<3;j++){const z=.04-j*2.64,s=b.initialSide*(j%2?-1:1);const g=obj(-s*2.56,.05,z-.99,.46);const n=gauge(g);actions.push(()=>n.position.x=b.round===j?b.bubble*.72:0);}
   for(let j=0;j<3;j++){const s=b.initialSide*(j%2?-1:1),z=.04-j*2.64-1.19;
     const x=1.48*s;ramp('weather-roof',x,z,s,2.11,.44,1.07,'#94b1b3');
     // Two narrow fascia boards face the snow; the player walks on the baked roof itself.
     for(const zz of [-1,1]){const fz=z+zz*.56;rect(fixed,red,x,.17,fz,.62,.31,.046);rect(fixed,ice,x,.37,fz,.54,.07,.055);}
     for(const t of [-1,1]){const sx=-1.44*s+t*.67;rock(fixed,ice,sx,.052,z,.23,.12,.53);}
   }
   for(const s of [-1,1])for(let j=0;j<7;j++){const z=6.36-j*2.81;rod(fixed,wood,[s*4.83,-.42,z],[s*4.83,.96,z],.053);
     if(j<6)rod(fixed,red,[s*4.83,.81,z],[s*4.83,.77,z-2.81],.027);}
   actions.push((t,f)=>{spirit.position.x=(b.engaged?b.bubble:.33*Math.sin(t))* .79;dome.position.y=2.17+q(f)*.87;tube.rotation.z=q(f)*.21;journal.rotation.x=-q(f)*.39;});
 }
 const marker=obj();ring(marker,gold,0,.088,0,.75,.049).rotation.x=-Math.PI/2;
 const branches=b.layout.branches.map(([x,,z],i)=>{const o=obj(x,.080,z);ring(o,i?brass:ice,0,0,0,.78,.055).rotation.x=-Math.PI/2;return o;});
 const world=bakeDesk(stage,root);world.bounds={min:[-6.15,-2,-12.75],max:[6.15,12,11.4]};[fixed,...groups].forEach(batch);
 return {world,update(t:number,f:number){const p=b.phase==='warmup'?b.layout.warm:b.phase==='finale'?b.layout.end:b.nextSpot;marker.position.set(p[0],0,p[2]);
   marker.visible=b.phase!=='route'&&b.phase!=='curtain';branches.forEach(o=>o.visible=b.phase==='route');actions.forEach(fn=>fn(t,f));}};
}
