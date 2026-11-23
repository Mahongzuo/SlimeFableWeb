import * as T from 'three';
import type {Stage} from '../level/stage';
import type {Box,Vec} from '../slime/types';
import type {WorldDefinition} from '../slime/world';
import {Kit} from './folio-landmarks';
import {buildBattleShip,shipWorld,woodSurface,type ShipOpening} from './battle-ship';

export const fleetPoints:Record<'table'|'winch'|'upper'|'lower'|'chart'|'log'|'first'|'gunner'|'rigger'|'guardian'|'shortcut',Vec>={
 table:[1.55,0,4.25],winch:[2.35,2.1,7.53],upper:[15.7,2.1,7.5],lower:[15.7,-2.45,-5.65],
 chart:[19.6,0,.9],log:[20.9,0,3.75],first:[-.9,0,-3],gunner:[17.7,2.1,7.7],
 rigger:[17.3,-2.45,-5.2],guardian:[17.35,0,1.5],shortcut:[15.7,0,1.52],
};
export interface FleetState {revealed:boolean;bridged:boolean;journal:boolean;chart:boolean;delivered:boolean;guardianDead:boolean}
const closed:FleetState={revealed:false,bridged:false,journal:false,chart:false,delivered:false,guardianDead:false};
const low=-2.45,high=2.1,left=14.85,right=22.8,bank=5.25;
const passages=[
 {id:'upper',z:7.5,width:1.52,y:high},
 {id:'lower',z:-5.65,width:1.42,y:low},
 {id:'shortcut',z:1.52,width:1.56,y:0}
] as const;
const openings:ShipOpening[]=passages.map(p=>({from:p.z-p.width/2,to:p.z+p.width/2,base:p.y-.22,crown:p.y+2.1}));
type Part=Box&{color:string};
const beams:Part[]=[];
function box(name:string,min:Vec,max:Vec,color:string){beams.push({name,min,max,color,camera:true});}
const oak='#c08a61',blue='#535d63',red='#904c42',tan='#d2ad7c',dark='#674d41';
box('lower deck',[left,low-.24,-7.9],[right,low,8.8],oak);
// U-shaped central floor leaves the midship companionway open from hold to daylight.
box('forward central deck',[left,-.22,-7.9],[right,0,-5.45],tan);
box('main deck port',[left,-.22,-5.45],[19.15,0,-.15],tan);
box('main deck starboard',[21.3,-.22,-5.45],[right,0,-.15],tan);
box('aft central deck',[left,-.22,-.15],[right,0,8.8],tan);
box('raised stern',[left,high-.24,6.55],[right,high,8.8],oak);
function stairs(name:string,x0:number,x1:number,z0:number,z1:number,y0:number,y1:number,count:number){
 for(let i=0;i<count;i++){
  const h=y0+(i+1)*(y1-y0)/count;
  box(name+' '+i,[x0,h-.205,z0+i*(z1-z0)/count],[x1,h,z0+(i+1)*(z1-z0)/count],oak);
 }
}
stairs('cargo stair',19.15,21.3,-4.75,-.15,low,0,14);
stairs('quarter stair',left,16.97,2.36,6.55,0,high,13);
// The low hatch, high bridge and emergency plank cut the port hull at different elevations.
const cuts=[-7.9,...openings.flatMap(o=>[o.from,o.to]),8.8].sort((a,b)=>a-b);
for(let i=1;i<cuts.length;i++){
 const z0=cuts[i-1],z1=cuts[i],z=(z0+z1)/2,opening=openings.find(o=>z>o.from&&z<o.to);
 const top=z<2.36?.47:z>=6.55?high+.47:.47;
 const lintel=opening?Math.min(opening.base,top):top;
 if(lintel>low-.24)box('port outer planking '+i,[left-.16,low-.24,z0],[left,lintel,z1],red);
 if(opening&&opening.crown<top)box('port hatch lintel '+i,[left-.16,opening.crown,z0],[left,top,z1],red);
}
box('starboard hull sill',[right,low-.24,-7.9],[right+.18,-1.95,8.8],blue);
box('starboard gunwale',[right,-.71,-7.9],[right+.18,.46,8.8],red);
for(let i=0;i<8;i++)box('starboard port frame '+i,[right,-1.95,-7.9+i*2.08],[right+.18,-.71,-7.25+i*2.08],dark);
box('fore hull',[left-.16,low-.24,-8.08],[right+.18,.46,-7.9],red);
box('stern windowsill',[left-.16,low-.24,8.8],[right+.18,high+.45,9],red);
box('second ship main mast',[18.72,low,-2.74],[19.08,5.26,-2.38],dark);
box('ropemaker low chest',[17.80,low,-5.29],[18.50,low+.41,-4.87],'#885e42');
box('lower ribs',[left,-.56,-3.61],[19.15,-.22,-3.37],dark);
box('lower lashed crate',[20.6,low,-6.98],[21.67,low+.85,-6.14],oak);
box('port upper defense',[16.81,high,8.1],[17.64,high+.7,8.66],dark);
box('folded sail bundle',[18.1,0,-2.04],[18.74,.77,-1.03],oak);
box('stern workbench',[19.13,0,.55],[20.06,.47,1.23],dark);
box('navigator stand',[1.01,0,3.82],[2.09,.61,4.68],dark);
box('navigator berth',[21.38,0,2.85],[22.46,.38,4.42],'#715b4b');
box('cabin reading shelf',[20.47,0,3.5],[21.35,.62,4.0],dark);
box('archive rear wall',[18.82,0,4.64],[22.67,2.03,4.82],'#4e6e72');
box('archive outer sill',[22.51,0,-.30],[22.71,.84,4.64],'#586467');
box('archive outer lintel',[22.51,1.69,-.30],[22.71,2.03,4.64],'#526467');
for(const z of [-.3,1.61,3.82])box('archive sash',[22.51,.84,z],[22.71,1.69,z+.15],dark);
box('archive entrance jamb',[18.83,0,3.23],[19.04,2.03,3.46],'#685b49');
box('archive canopy',[18.73,2.03,-.32],[22.75,2.20,4.82],'#932f2c');
box('record ship bulwark',[right,.46,6.55],[right+.18,high+.45,8.80],red);
box('windlass pedestal',[2.06,high,7.24],[2.64,high+.46,7.82],oak);

const stationary=beams.filter(b=>b.max[0]<bank);
const courierParts=beams.filter(b=>b.max[0]>=bank);
const arrivalOffset:[number,number]=[8.2,-19.5];
export const fleetFinalView={eye:[1.54,2.05,4.94] as Vec,look:[1.55,.62,4.25] as Vec};
function shifted(part:Box,dx=0,dz=0):Box{
 return {name:part.name,camera:part.camera,min:[part.min[0]+dx,part.min[1],part.min[2]+dz],max:[part.max[0]+dx,part.max[1],part.max[2]+dz]};
}
export function fleetWorld():WorldDefinition{
 const home=shipWorld(openings);
 return {...home,boxes:[...home.boxes,...stationary.map(p=>shifted(p))],
  bounds:{min:[-7,-3.89,-10],max:[right+1.6,14,11]}};
}
type Access=Pick<FleetState,'bridged'|'journal'>&Partial<Pick<FleetState,'revealed'|'chart'|'guardianDead'>>;
function blockaded(state:Access){return state.chart===true&&!state.guardianDead;}
export function fleetDynamicBoxes(state:Access,offset:readonly [number,number]=state.revealed===false&&!state.bridged?arrivalOffset:[0,0]):Box[]{
 const [dx,dz]=offset,berthed=Math.abs(dx)+Math.abs(dz)<.01;
 const dynamic:Box[]=courierParts.map(b=>shifted(b,dx,dz));
 for(const p of passages){
  const opened=berthed&&!blockaded(state)&&(p.id==='shortcut'?state.journal:state.bridged);
  const z0=p.z-p.width/2,z1=p.z+p.width/2;
  if(opened){
   dynamic.push({name:p.id+' gangway',min:[bank,p.y-.195,z0],max:[left,p.y,z1],camera:true});
   for(const z of [z0,z1])dynamic.push({name:p.id+' curb',min:[bank,p.y,z-.04],max:[left,p.y+.46,z+.04],camera:true});
  }else{
   for(const [x,z] of [[bank,0],[left-.15+dx,dz]])dynamic.push({name:p.id+' folded gate',min:[x,p.y,z0+z],max:[x+.15,p.y+2.15,z1+z],camera:true});
  }
 }
 return dynamic;
}
function chartPaper(stage:Stage){
 const c=document.createElement('canvas');c.width=512;c.height=352;
 const g=c.getContext('2d')!;
 g.fillStyle='#d7bf8b';g.fillRect(0,0,c.width,c.height);
 g.strokeStyle='#8c7960';g.lineWidth=2;g.strokeRect(9,9,494,334);
 g.fillStyle='#93a38e';g.beginPath();g.moveTo(386,8);g.lineTo(374,51);g.lineTo(402,100);
 g.lineTo(364,141);g.lineTo(381,169);g.lineTo(416,176);g.lineTo(429,230);g.lineTo(457,258);g.lineTo(452,342);g.lineTo(501,342);g.lineTo(501,9);g.fill();g.stroke();
 g.strokeStyle='#b4a07c';g.lineWidth=1;
 for(let x=41;x<490;x+=42){g.beginPath();g.moveTo(x,11);g.lineTo(x,341);g.stroke();}
 for(let y=32;y<340;y+=40){g.beginPath();g.moveTo(10,y);g.lineTo(501,y);g.stroke();}
 for(const [y,col] of [[90,'#4d7778'],[183,'#a65a40']] as const){
  g.beginPath();g.setLineDash([9,6]);g.strokeStyle=col;g.lineWidth=4;g.moveTo(40,y+50);
  g.bezierCurveTo(160,y+53,210,y-18,338,y-8);g.stroke();g.setLineDash([]);
  for(let i=0;i<4;i++){g.fillStyle=col;g.beginPath();g.ellipse(66+i*58,y+42-i*12,9,3,-.25,0,Math.PI*2);g.fill();}
 }
 g.fillStyle='#65533e';g.font='bold 23px Georgia';g.fillText('21 · X · 1805',27,316);
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
 const background=g.getImageData(0,0,c.width,c.height);
 let previous=-1;
 function finish(amount:number){
  const frame=Math.round(amount*60);if(previous===frame)return;previous=frame;
  g.putImageData(background,0,0);
  for(const [i,label] of ['纳尔逊','科林伍德'].entries()){
   const y=i?185:79;
   g.strokeStyle=i?'#933d2d':'#265961';g.fillStyle=g.strokeStyle;g.lineWidth=4.4;
   g.beginPath();
   for(let j=0;j<=Math.floor(amount*100);j++){
    const t=j/100,x=45+296*t,v=y+52-57*t+(i?-12:14)*Math.sin(t*Math.PI);
    if(j===0)g.moveTo(x,v);else g.lineTo(x,v);
   }
   g.stroke();g.globalAlpha=Math.min(1,amount*4);
   g.fillStyle='#f0ddb0';g.fillRect(48,y-36,153,38);g.fillStyle=i?'#6e382b':'#244f53';
   g.font='bold 30px "Microsoft YaHei",sans-serif';g.fillText(label,53,y-7);g.globalAlpha=1;
  }
  texture.needsUpdate=true;
 }
 return {material:stage.toon('#fff',{map:texture}),finish};
}
export function buildFleet(stage:Stage){
 const home=buildBattleShip(stage,openings),root=new T.Group();root.name='Companion ship, log and brass signals';stage.scene.add(root);
 const courier=new T.Group();courier.name='Blue flag records ship';root.add(courier);
 root.add(woodSurface(stage,stationary));courier.add(woodSurface(stage,courierParts));
 const toon=stage.toon('#fff'),unlit=new T.MeshBasicMaterial({color:0xffffff});
 const k=new Kit({toon,lit:toon,glow:unlit,glass:toon,lamp:unlit},'two-ships');
 const brass='#d8ae6a',cream='#eee1bf',rope='#6c5845',wine='#954b43',ink='#344b53',teal='#428783';
 const mid=(left+right)/2;
 // The second vessel is a narrow courier with red clinker sides, a pointed prow and signal pennants.
 function hullEnd(z:number,point:number,cap:number){
  const mesh=new T.BufferGeometry(),pos:number[]=[],colors:number[]=[];
  function face(a:Vec,b:Vec,c:Vec,color:string){pos.push(...a,...b,...c);const tint=new T.Color(color);for(let j=0;j<3;j++)colors.push(tint.r,tint.g,tint.b);}
  for(const x of [left-.16,right+.18]){
   const rim:Vec=[x,cap,z],tip:Vec=[mid,cap+.31,point],heel:Vec=[x,low-.24,z],toe:Vec=[mid,low+.67,point];
   face(rim,heel,toe,wine);face(rim,toe,tip,wine);face(rim,tip,[mid,cap,z],tan);k.beam(courier,brass,rim,tip,.066);
  }
  mesh.setAttribute('position',new T.Float32BufferAttribute(pos,3));mesh.setAttribute('color',new T.Float32BufferAttribute(colors,3));mesh.computeVertexNormals();
  const m=stage.toon('#fff',{side:T.DoubleSide}).clone();m.vertexColors=true;const shipEnd=new T.Mesh(mesh,m);shipEnd.castShadow=shipEnd.receiveShadow=true;courier.add(shipEnd);
 }
 hullEnd(-8.08,-12.35,.46);hullEnd(9,10.18,high+.45);
 for(const [i,r] of [.19,.15,.11].entries())k.ring(courier,i%2?'#b69b6e':'#baa476',18.15,low+.43,-5.08,r,Math.PI/2);
 // Gunport lamps and timber knees give the lower passage a visible destination.
 for(let i=0;i<7;i++){
  const z=-6.1+i*2.04;
  k.box(courier,brass,right+.205,-.36,z,.05,.075,1.80);k.box(courier,brass,right+.20,-2.08,z,.05,.07,1.80);
  k.beam(courier,dark,[right-.13,-.24,z],[right-.13,-.92,z+.36],.073);
 }
 for(const [x,y,z] of [[15.43,-1.4,-6.48],[19.07,-1.42,-4.85],[21.63,.82,3.8],[17.02,high+.59,7.74],[19.58,.93,1.21]]){
  k.box(courier,ink,x,y+.13,z,.21,.07,.21);k.ball(courier,'#ffc97b',x,y,z,.089,.12,.088,'glow');k.box(courier,ink,x,y-.13,z,.18,.045,.18);
 }
 for(let i=0;i<9;i++){
  const z=-7.5+i*1.9;
  k.box(courier,dark,right+.09,.64,z,.09,.45,.09);
 }
 k.beam(courier,brass,[right+.09,.87,-7.83],[right+.09,.87,8.78],.055);
 const sails:T.Mesh[]=[];
 function lateen(w:number,h:number,x:number,y:number,z:number,material:T.Material){
  const geom=new T.PlaneGeometry(w,h,20,9),pa=geom.attributes.position;
  for(let i=0;i<pa.count;i++){
   const u=pa.getX(i)/w+.5,v=.5-pa.getY(i)/h;
   pa.setXYZ(i,(u-.5)*w*(1-.16*v),-v*h+.38*w*(u-.5)+.12*v*v*Math.sin(2*Math.PI*u),w*Math.sin(Math.PI*v)*.13+w*Math.sin(Math.PI*u)*v*.078);
  }
  geom.computeVertexNormals();const m=new T.Mesh(geom,material);m.position.set(x,y,z);m.receiveShadow=m.castShadow=true;courier.add(m);sails.push(m);
  k.beam(courier,dark,[x-w*.53,y-w*.19,z],[x+w*.53,y+w*.19,z],.084);
 }
 const sailMat=stage.toon('#d6b587',{side:T.DoubleSide}),redSail=stage.toon('#be7660',{side:T.DoubleSide});
 k.cyl(courier,dark,18.9,6.25,-2.56,.12,2.0);k.cyl(courier,brass,18.9,5.14,-2.56,.26,.12);
 lateen(6.45,2.46,18.9,6.61,-2.56,sailMat);lateen(3.26,1.1,18.96,7.85,-2.56,redSail);
 for(const z of [-7.25,4.66])for(const x of [left+.05,right-.05])k.beam(courier,rope,[x,.51,z],[18.9,6.88,-2.56],.021);
 for(let i=0;i<5;i++){
  const x=mid-1.83+i*.93;
  k.box(courier,ink,x,1.04,9.035,.72,.89,.068);
  k.box(courier,'#82a7a2',x,1.04,9.083,.60,.75,.046);
  k.box(courier,brass,x,1.04,9.117,.04,.77,.023);
 }
 // The blue swallowtail identifies the records ship from the command deck.
 const bunting=new T.BufferGeometry();
 bunting.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,-.83,0,1.57,-.35,.12,
   0,0,0,1.57,-.35,.12,2.12,.02,-.10, 0,-.83,0,2.04,-.91,-.12,1.57,-.35,.12],3));
 bunting.computeVertexNormals();const pennant=new T.Mesh(bunting,stage.toon('#286b91',{side:T.DoubleSide}));
 pennant.position.set(18.92,8.97,-2.56);courier.add(pennant);
 k.cyl(courier,dark,18.9,7.67,-2.56,.052,2.65);
 // The glazed archive is open to its staircase and the return court. Its ceiling is solid to the camera.
 k.box(courier,brass,20.76,2.25,4.71,4.14,.095,.13);
 k.box(courier,brass,18.78,2.25,2.24,.1,.095,5.06);
 k.box(courier,ink,18.69,1.70,3.36,.18,.48,.64);
 k.ring(courier,brass,18.58,1.70,3.36,.182,0,Math.PI/2);k.beam(courier,brass,[18.55,1.57,3.24],[18.55,1.82,3.47],.021);
 for(const [z,base] of [[-8.09,.49],[9.03,high+.45]]){
  k.beam(courier,brass,[left,base,z],[right,base,z],.063);
 }
 for(const s of [-1,1]){
  const origin=s<0?left-.16:right+.18;
  for(const [y,weight] of [[-.52,.065],[-1.85,.06],[.17,.08]]){
   k.beam(courier,brass,[origin,y,9.04],[mid,y+.35,10.21],weight);
   k.beam(courier,dark,[origin,y-.14,9.04],[mid,y+.19,10.21],.11);
  }
 }
 const chartSurface=chartPaper(stage);
 const table=new T.Mesh(new T.PlaneGeometry(.98,.78),chartSurface.material);table.rotation.x=-Math.PI/2;table.position.set(1.55,.624,4.25);root.add(table);
 const leaders=[k.group(root),k.group(root)];
 for(const [i,marker] of leaders.entries()){
  const tint=i?wine:teal;k.ball(marker,tint,0,.015,0,.069,.022,.029);k.beam(marker,brass,[0,.025,0],[0,.122,0],.007);
  k.box(marker,cream,.018,.089,0,.056,.045,.009);
 }
 const winch=k.group(root,2.35,high+.46,7.53);
 k.cyl(winch,ink,0,.13,0,.31,.24);k.cyl(winch,brass,0,.29,0,.3,.11);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;k.beam(winch,dark,[0,.29,0],[Math.sin(a)*.56,.29,Math.cos(a)*.56],.039);}
 const chartLid=k.group(courier,19.60,.50,.59);
 k.box(chartLid,wine,0,.09,.29,.88,.17,.56);k.box(chartLid,brass,0,.185,.28,.12,.032,.57);
 const spool=k.group(courier,19.6,.63,.95);
 k.put('round',spool,'toon',cream,0,0,0,.074,.53,.074,0,0,Math.PI/2);
 for(const x of [-.28,.28])k.ball(spool,brass,x,0,0,.053,.095,.095);
 k.ball(courier,'#a0b7a7',21.91,.44,3.63,.48,.12,.72);
 k.ball(courier,cream,21.91,.54,4.16,.37,.095,.16);
 k.box(courier,'#526f78',21.91,.51,3.29,.96,.11,.49);
 const diary=k.group(courier,20.90,.65,3.75);k.box(diary,wine,0,.032,0,.58,.065,.39);
 k.box(diary,cream,0,.079,0,.53,.028,.34);k.box(diary,wine,.19,.10,0,.045,.018,.34);
 const chartBadge=k.group(root,1.74,.665,4.02);
 k.ring(chartBadge,brass,0,.01,0,.10,Math.PI/2);
 // Two opposed bascule leaves give each end of each crossing a physical hinge.
 const gangways=passages.map(p=>{
  const leaves=[k.group(root,bank,p.y,p.z),k.group(courier,left,p.y,p.z)];
  const length=(left-bank)/2,boards=13,pitch=length/boards;
  leaves.forEach((leaf,i)=>{
   const d=i?-1:1,color=p.id==='upper'?tan:p.id==='lower'?'#956e54':'#977a57';
   for(let n=0;n<boards;n++)k.box(leaf,color,d*(n+.5)*pitch,-.079,0,pitch-.012,.158,p.width);
   for(const z of [-1,1]){
    const side=z*(p.width/2-.039);
    k.box(leaf,dark,d*length/2,-.174,side,length,.13,.093);
    k.box(leaf,ink,d*length/2,.15,side,length,.3,.074);
    k.beam(leaf,p.id==='upper'?brass:rope,[0,.46,side],[d*length,.46,side],.034);
    for(let n=0;n<3;n++)k.box(leaf,dark,d*(n+.40)*length/3,.32,side,.061,.35,.062);
   }
   k.put('round',leaf,'toon',brass,0,-.10,0,.087,p.width+.17,.087,Math.PI/2);
  });
  return {p,leaves,open:0};
 });
 const signals=passages.map(p=>{
  const signal=k.group(courier,left+.28,p.y+.74,p.z-p.width/2-.19);
  k.cyl(signal,brass,0,0,0,.034,1.46);k.box(signal,p.id==='lower'?teal:wine,.17,.47,0,.36,.23,.025);
  return signal;
 });
 // A miniature pair of sailing columns moves on the actual sea when the briefing brings the chart to life.
 const columns=[k.group(root,-7,-3.05,-25),k.group(root,8,-3.05,-30)];
 for(const [i,col] of columns.entries()){
  for(let j=0;j<4;j++){
   const model=k.group(col,j*.40,0,-j*3.1,0,i?.67:.33,0,.48);
   k.ball(model,ink,0,.38,0,.53,.54,1.56);k.cyl(model,dark,0,1.28,0,.039,1.88);
   k.box(model,i?'#dbad8b':'#e6d8b0',0,1.92,0,1.45,.65,.074);k.box(model,cream,0,1.32,0,1.64,.40,.075);
  }
 }
 k.flush();
 let previous:number|null=null,arrival=0,delivery=0;
 const offset:[number,number]=[...arrivalOffset];
 let lastX=NaN,lastZ=NaN,lastBridge=-1,lastHatch=-1,lastActor:object|null=null;
 function update(time:number,state:FleetState=closed){
  const dt=previous===null?0:Math.max(0,Math.min(.10,time-previous));home.update(time);
  arrival=state.bridged||previous===null&&state.revealed?1:state.revealed?Math.min(1,arrival+dt/3.2):0;
  const eased=arrival*arrival*(3-2*arrival);
  offset[0]=(1-eased)*arrivalOffset[0];offset[1]=(1-eased)*arrivalOffset[1];
  courier.position.set(offset[0],0,offset[1]);
  delivery=state.delivered?Math.min(1,delivery+dt/2.75):0;
  chartSurface.finish(delivery);
  pennant.rotation.y=.19*Math.sin(time*2.7);
  for(const [i,s] of sails.entries())s.rotation.x=.035*Math.sin(time*1.3+i);
  for(const [i,m] of leaders.entries()){
   const t=state.delivered?delivery:state.revealed?.18:0;
   m.position.set(1.22+t*.54,.64,4.19+.19*i-t*.12);
  }
  for(const [i,col] of columns.entries()){
   col.visible=state.revealed;
   col.position.x=(i?8:-7)+Math.sin(time*.027+i)*4.8;
   col.position.z=(i?-30:-25)+Math.sin(time*.051+i*.73)*2.2;
  }
  for(const [i,g] of gangways.entries()){
   const goal=arrival>=1&&!blockaded(state)&&(g.p.id==='shortcut'?state.journal:state.bridged)?1:0;
   g.open=previous===null?goal:T.MathUtils.damp(g.open,goal,5.5,dt);
   if(Math.abs(g.open-goal)<.003)g.open=goal;
   g.leaves[0].rotation.z=(1-g.open)*1.525;
   g.leaves[1].rotation.z=-(1-g.open)*1.525;
   signals[i].rotation.y=.1*Math.sin(time*1.6+i)+(state.guardianDead?.46:0);
  }
  winch.rotation.y=gangways[0].open*Math.PI*3.6;
  chartLid.rotation.x=state.chart?-1.48:0;
  spool.visible=!state.chart;spool.rotation.x=Math.sin(time*.7)*.13;
  diary.rotation.y=state.journal?.25:-.18;chartBadge.visible=state.delivered;
  previous=time;
 }
 return {update,get docked(){return arrival===1;},
  syncCollision(actor:{setDynamicBoxes(boxes:Box[]):void},state:Access){
   // Keep the stops up until the folding boards meet. A restored checkpoint starts at rest.
   const mode=state.bridged&&!blockaded(state)?(gangways[0].open>.992?2:1):0;
   const hatch=state.journal&&!blockaded(state)?(gangways[2].open>.992?2:1):0;
   if(offset[0]===lastX&&offset[1]===lastZ&&mode===lastBridge&&hatch===lastHatch&&actor===lastActor)return;
   actor.setDynamicBoxes(fleetDynamicBoxes({bridged:mode===2,journal:hatch===2},offset));
   [lastX,lastZ]=offset;lastBridge=mode;lastHatch=hatch;lastActor=actor;
  }};
}

