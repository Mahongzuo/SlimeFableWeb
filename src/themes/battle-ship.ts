import * as T from 'three';
import type {Stage} from '../level/stage';
import type {Vec, Box} from '../slime/types';
import type {WorldDefinition} from '../slime/world';
import {rng} from '../templates/random';
import {Kit} from './folio-landmarks';

const hold = -2.45, poop = 2.1, edge = 5.25;
type Timber = Box & {color:string};
const timber:Timber[] = [];
function plank(name:string,min:Vec,max:Vec,color='#cc9a64'){
 timber.push({name,min,max,color,camera:true});
}
// The main deck ends at the rim of each hatch. Its underside is the actual hold ceiling.
plank('hold sole',[-edge,hold-.16,-7.6],[edge,hold,9.2],'#a57b56');
plank('forecastle',[-edge,-.19,-7.6],[edge,0,-6]);
plank('main deck centre',[-3.25,-.19,-6],[3.25,0,-.6]);
plank('main deck aft',[-edge,-.19,-.6],[edge,0,9.2]);
plank('quarterdeck',[-edge,poop-.24,6.55],[edge,poop,9.2],'#d9ae77');

function stair(name:string,x0:number,x1:number,z0:number,z1:number,bottom:number,top:number,count:number){
 for(let i=0;i<count;i++){
  const y=bottom+(top-bottom)*(i+1)/count, z=z0+(z1-z0)*i/count;
  plank(name+' '+(i+1),[x0,y-.22,z],[x1,y,z0+(z1-z0)*(i+1)/count],'#c19364');
 }
}
for(const s of [-1,1]){
 const side=s===-1?'port':'starboard',lo=s===-1?-edge:3.25,hi=s===-1?-3.25:edge;
 // Flat low landing from z=-6 to -5.1 gives a full-width cross passage below the main deck.
 stair(side+' lower stair',lo,hi,-5.1,-.6,hold,0,13);
 stair(side+' upper stair',lo,hi,2.35,6.55,0,poop,12);
 const hullX=s===-1?-edge-.22:edge;
 plank(side+' sill',[hullX,hold-.16,-7.6],[hullX+.22,-1.95,9.2],'#38545a');
 plank(side+' hull wale',[hullX,-.65,-7.6],[hullX+.22,.43,9.2],'#36565a');
 plank(side+' quarterdeck bulwark',[hullX,.43,6.55],[hullX+.22,poop+.43,9.2],'#426168');
 for(let j=0;j<12;j++){
  const rise=poop*(j+1)/12,z=2.35+j*4.2/12;
  plank(side+' climbing bulwark '+j,[hullX,.43,z],[hullX+.22,.43+rise,2.35+(j+1)*4.2/12],'#426168');
 }
 for(let i=0;i<9;i++){
  const z=-7.6+i*2;
  plank(side+' gunport pier '+i,[hullX,-1.95,z],[hullX+.22,-.65,z+.77],'#7f5d46');
 }
}
for(const [name,z] of [['bow',-7.84],['stern',9.2]] as const){
 plank(name+' bulkhead',[-edge-.22,hold-.16,z],[edge+.22,.31,z+.24],'#645449');
}
plank('stern gallery',[-edge-.22,.31,9.2],[edge+.22,poop+.43,9.44],'#344e58');
plank('bow breast rail',[-edge-.22,.31,-7.84],[edge+.22,.47,-7.6],'#36565a');
plank('port cargo',[-2.95,0,1.05],[-1.55,.84,2.16],'#8f674e');
plank('starboard cargo',[2.02,0,-2.34],[2.91,1.04,-1.21],'#8f674e');
plank('forward bitt',[-2.02,0,-3.78],[-1.54,.6,-3.22],'#715046');
plank('lower tea chest',[-1.35,hold,-3.5],[.15,hold+.8,-2.35],'#81664b');
plank('lower second chest',[.15,hold,-3.42],[1.04,hold+.62,-2.48],'#aa7953');
plank('lower beam',[-3.25,-.55,-5.15],[3.25,-.19,-4.93],'#624d3e');
plank('lower aft beam',[-edge,-.57,1.85],[edge,-.19,2.06],'#624d3e');
plank('helm foundation',[-.31,poop,7.87],[.31,poop+.76,8.17],'#856348');

/** Openings through the starboard hull. The same clipped pieces drive rendering and collision. */
export interface ShipOpening {from:number;to:number;base:number;crown:number}
function splitForBoarding<B extends Box>(part:B,openings:readonly ShipOpening[]):B[]{
 if(part.min[0]<edge-.001||!openings.length)return [part];
 let pieces:Rect[]=[[part.min[2],part.min[1],part.max[2],part.max[1]]];
 for(const gate of openings)pieces=pieces.flatMap(piece=>subtract(piece,[gate.from,gate.base,gate.to,gate.crown]));
 return pieces.map(([z0,y0,z1,y1])=>({...part,min:[part.min[0],y0,z0],max:[part.max[0],y1,z1]}));
}
export function shipWorld(openings:readonly ShipOpening[]=[]):WorldDefinition {
 const boxes:Box[]=timber.map(({name,min,max})=>({name,min:[...min],max:[...max],camera:true}));
 boxes.push({name:'mast',min:[-1.32,hold,-.92],max:[-.68,6.65,-.28],camera:true},
  {name:'mizzenmast',min:[-.13,poop,8.60],max:[.13,6.94,8.86],camera:true},
  {name:'helm wheel',min:[-.81,poop+.31,7.75],max:[.81,poop+1.95,7.9],camera:true});
 for(const s of [-1,1]){
  const x=s===-1?-edge-.22:edge;
  for(const [a,b,y] of [[-7.55,2.38,.83],[6.55,9.2,poop+.83]]){
   boxes.push({name:'rail cap',min:[x,y-.062,a],max:[x+.22,y+.062,b],camera:false});
  }
 }
 boxes.push({name:'bow rail',min:[-edge,.83,-7.84],max:[edge,.95,-7.6],camera:false},
  {name:'stern rail',min:[-edge,poop+.79,9.2],max:[edge,poop+.92,9.44],camera:false});
 return {surfaces:[],boxes:boxes.flatMap(b=>splitForBoarding(b,openings)),bounds:{min:[-7,-3.9,-9],max:[7,13,11]}};
}

type Rect=[number,number,number,number];
// Remove even partially shared faces: e.g. the breast beam only covers a strip of the deck underside.
function subtract(rect:Rect,other:Rect):Rect[]{
 const [l,b,r,t]=rect, x0=Math.max(l,other[0]),y0=Math.max(b,other[1]),x1=Math.min(r,other[2]),y1=Math.min(t,other[3]);
 if(x1<=x0||y1<=y0)return [rect];
 return ([[l,b,x0,t],[x1,b,r,t],[x0,b,x1,y0],[x0,y1,x1,t]] as Rect[]).filter(q=>q[2]-q[0]>.00001&&q[3]-q[1]>.00001);
}
export function woodSurface(stage:Stage,parts:readonly Timber[]){
 const pos:number[]=[],colors:number[]=[],uv:number[]=[];
 for(const part of parts){
  const tone=new T.Color(part.color);
  for(const axis of [0,1,2])for(const sign of [-1,1]){
   const u=(axis+1)%3,v=(axis+2)%3,plane=(sign>0?part.max:part.min)[axis];
   let exposed:Rect[]=[[part.min[u],part.min[v],part.max[u],part.max[v]]];
   for(const other of parts){
    if(other===part||Math.abs((sign>0?other.min:other.max)[axis]-plane)>.00001)continue;
    const clip:Rect=[other.min[u],other.min[v],other.max[u],other.max[v]];
    exposed=exposed.flatMap(q=>subtract(q,clip));
   }
   for(const [a,b,c,d] of exposed){
    const corners=[[a,b],[c,b],[c,d],[a,d]];
    for(const i of sign>0?[0,1,2,0,2,3]:[2,1,0,3,2,0]){
     const p=[0,0,0];p[axis]=plane;p[u]=corners[i][0];p[v]=corners[i][1];
     pos.push(...p);colors.push(tone.r,tone.g,tone.b);
     uv.push(axis===1?p[0]/1.75:p[1]/1.75,axis===2?p[0]/5:p[2]/5);
    }
   }
  }
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;
 const g=canvas.getContext('2d')!,rand=rng('oak-stave');
 for(let i=0;i<8;i++){
  const x=i*32,j=rand.int(35,471);
  const shade=rand.int(213,248);g.fillStyle='rgb('+[shade,shade-5,shade-12].join(',')+')';g.fillRect(x,0,32,512);
  g.fillStyle='#775e48';g.fillRect(x,0,1.4,512);g.fillRect(x,j,32,1.3);
  for(const dx of [5,26])for(const dy of [-4,4])g.fillRect(x+dx,j+dy,1.8,2);
  g.strokeStyle='#85715855';
  for(let k=0;k<26;k++){const xx=x+rand.range(3,29),yy=rand.range(-60,512);g.beginPath();g.moveTo(xx,yy);g.bezierCurveTo(xx+2,yy+14,xx-2,yy+37,xx,yy+rand.range(40,90));g.stroke();}
 }
 const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
 const material=stage.toon('#ffffff',{map:texture});material.vertexColors=true;
 const mesh=new T.Mesh(geo,material);mesh.name='ship joinery';mesh.receiveShadow=mesh.castShadow=true;return mesh;
}
export function buildBattleShip(stage:Stage,openings:readonly ShipOpening[]=[]){
 const scene=new T.Group();scene.name='Wind Between Sails';stage.scene.add(scene);
 scene.add(woodSurface(stage,timber.flatMap(p=>splitForBoarding(p,openings))));
 const toon=stage.toon('#fff'),glow=new T.MeshBasicMaterial({color:0xffffff});
 const kit=new Kit({toon,glow,lamp:glow,lit:toon,glass:toon},'wind-between-sails');
 const oak='#765139',iron='#36494d',brass='#bb945a',rope='#70604c',copper='#b57854';
 const canvas=stage.toon('#eee0bc',{side:T.DoubleSide}),canvasTrim=stage.toon('#c79c68',{side:T.DoubleSide});
 const sails:T.Mesh[]=[];
 // A curved sail has a taut head, stitched vertical panels and a loose, scalloped foot.
 function cloth(parent:T.Group,w:number,h:number,x:number,y:number,z:number,small=false){
  const geometry=new T.PlaneGeometry(w,h,24,8),attr=geometry.attributes.position;
  for(let i=0;i<attr.count;i++){
   const u=attr.getX(i)/w+.5,v=.5-attr.getY(i)/h;
   attr.setXYZ(i,(u-.5)*w*(1-.16*v),-v*h+.11*h*v*v*Math.cos(2*Math.PI*u),
    w*v*(.13*Math.sin(Math.PI*u)+.015*Math.cos(8*Math.PI*u))+.055*w*Math.sin(Math.PI*v));
  }
  geometry.computeVertexNormals();
  geometry.clearGroups();
  for(let row=0;row<8;row++)for(let col=0;col<24;col++)
   geometry.addGroup((row*24+col)*6,6,(!small&&row===7&&(col===2||col===3||col===20||col===21))?1:0);
  // Coalesce contiguous material runs into just a few draw calls.
  for(let i=geometry.groups.length-1;i>0;i--)if(geometry.groups[i].materialIndex===geometry.groups[i-1].materialIndex){
   geometry.groups[i-1].count+=geometry.groups[i].count;geometry.groups.splice(i,1);
  }
  const mesh=new T.Mesh(geometry,[canvas,canvasTrim]);mesh.position.set(x,y,z);
  mesh.castShadow=!small;mesh.receiveShadow=true;parent.add(mesh);sails.push(mesh);
 }
 // Keep outside water lower than the hold sole so it cannot leak into the passage.
 const sea=new T.Mesh(new T.PlaneGeometry(225,225),stage.toon('#539099'));
 sea.rotation.x=-Math.PI/2;sea.position.y=-3.07;scene.add(sea);
 const waterpaper=document.createElement('canvas');waterpaper.width=waterpaper.height=256;
 const brush=waterpaper.getContext('2d')!,swells=rng('shoals');
 brush.fillStyle='#c7e3db';brush.fillRect(0,0,256,256);
 for(let i=0;i<190;i++){
  const x=swells.range(0,256),y=swells.range(0,256),len=swells.range(2,24);
  brush.strokeStyle=i%5?'#adcbc89c':'#ebeddbb8';brush.lineWidth=swells.range(.7,1.6);
  brush.beginPath();brush.moveTo(x,y);brush.quadraticCurveTo(x+len*.55,y-1.4,x+len,y);brush.stroke();
 }
 const seaTexture=new T.CanvasTexture(waterpaper);seaTexture.wrapS=seaTexture.wrapT=T.RepeatWrapping;
 seaTexture.repeat.set(12,12);seaTexture.colorSpace=T.SRGBColorSpace;
 sea.material=stage.toon('#699fa7',{map:seaTexture});
 const ripples=kit.group(scene),rand=rng('fleet-water');
 for(let i=0;i<155;i++){
  const x=rand.range(-57,57),z=rand.range(-51,51);
  if(Math.abs(x)>6.5||Math.abs(z)>14)kit.ball(ripples,i%4?'#72a7a4':'#c0cdb2',x,-3.055,z,rand.range(.3,1.55),.022,.075);
 }
 // Screen the exterior with painted wales and curved end sections, leaving hull windows open.
 for(const side of [-1,1]){
  const x=side*(edge+.12);
  const spans=(a:number,b:number,y:number):[number,number][]=>{
   const part={name:'trim',min:[x,y-.01,a] as Vec,max:[x+.01,y+.01,b] as Vec};
   return splitForBoarding(part,openings).map(box=>[box.min[2],box.max[2]]);
  };
  for(const [y,tone] of [[-.39,brass],[-2.03,copper]] as const)for(const [a,b] of spans(-7.6,9.2,y))
   kit.box(scene,tone,x+side*.125,y,(a+b)/2,.06,.095,b-a);
  for(const [a,b,base] of [[-7.55,2.38,0],[6.55,9.2,poop]]){
   for(const [lo,hi] of spans(a,b,base+.83))kit.beam(scene,brass,[x,base+.83,lo],[x,base+.83,hi],.062);
   for(let z=a+.13;z<b;z+=1.08)if(spans(z-.055,z+.055,base+.46).length)kit.box(scene,oak,x,base+.46,z,.095,.81,.11);
  }
  kit.beam(scene,brass,[x,.83,2.38],[x,poop+.83,6.55],.062);
  for(let i=0;i<4;i++)kit.box(scene,oak,x,.54+poop*(i+.5)/4,2.38+4.17*(i+.5)/4,.095,.78,.11);
  // Sloping inside rails run along the stairs, leaving the landing open.
  kit.beam(scene,rope,[side*3.28,.54,2.4],[side*3.28,poop+.54,6.55],.032);
  for(let i=0;i<3;i++){
   const t=(i+.1)/3;
   kit.box(scene,oak,side*3.28,.31+poop*t,2.4+4.15*t,.085,.6,.085);
  }
  for(const z of [-5.6,-4.6,3.7,5]){
   kit.beam(scene,rope,[x,.75,z],[-1,6.4,-.6],.028);
  }
  // Ratlines narrow toward the masthead. They are high above the central firing window.
  const shrouds:Vec[]=[];
  for(let j=0;j<4;j++){
   const foot:Vec=[x,.78,1.1+j*.42];shrouds.push(foot);
   kit.beam(scene,rope,foot,[-1,6.52,-.6+j*.055],.017);
  }
  for(let j=1;j<14;j++){
   const f=j/15;
   const at=(i:number):Vec=>[x+(-1-x)*f,.78+(6.52-.78)*f,shrouds[i][2]+(-.6+i*.055-shrouds[i][2])*f];
   kit.beam(scene,rope,at(0),at(3),.012);
  }
  // Warm lamplight frames the stairs below. Holes between the ribs expose the sea.
  for(const z of [-5.65,-1.4,3.6]){
   kit.box(scene,iron,side*5.09,-.81,z,.19,.25,.16);
   kit.ball(scene,'#ffd17a',side*4.94,-.86,z,.11,.13,.10,'glow');
  }
 }
 // Silhouette extension past the traversable end rails; geometry tapers towards a rising prow.
 function chiselledEnd(z:number,tip:number){
  const a=5.46,sgn=tip<z?-1:1,points:number[]=[],cols:number[]=[];
  function face(v:Vec[],color:string){
   const c=new T.Color(color);
   for(let k=1;k<v.length-1;k++)for(const p of [v[0],v[k],v[k+1]]){points.push(...p);cols.push(c.r,c.g,c.b);}
  }
  for(const s of [-1,1]){
   const rim:Vec=[s*a,.28,z],keel:Vec=[s*a*.80,-2.65,z],nose:Vec=[s*.10,.93,tip],low:Vec=[s*.16,-1.18,tip-sgn*.7];
   face([rim,keel,low,nose],'#694c41');face([rim,nose,[0,.94,tip],[0,.28,z]],'#bf8e62');
   kit.beam(scene,brass,rim,nose,.071);
   kit.beam(scene,copper,[s*a*.88,-1.96,z],low,.075);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.computeVertexNormals();
  const mat=stage.toon('#fff',{side:T.DoubleSide}).clone();mat.vertexColors=true;const mesh=new T.Mesh(g,mat);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
 }
 // Glazed stern gallery, gilded cornice and the two lamps on the taffrail.
 for(const [z,y] of [[-7.73,.89],[9.32,poop+.85]]){
  kit.beam(scene,brass,[-edge-.1,y,z],[edge+.1,y,z],.061);
  const base=z<0?.47:poop+.43;
  for(let x=-4.8;x<5;x+=.95)kit.box(scene,oak,x,(base+y)/2,z,.093,y-base,.1);
 }
 for(const y of [.58,1.78,poop+.39])kit.box(scene,brass,0,y,9.475,10.9,.08,.085);
 for(let i=-4;i<=4;i++){
  const x=i*1.08;
  kit.box(scene,oak,x,1.18,9.49,.83,.98,.105);
  kit.box(scene,'#76a2a2',x,1.18,9.557,.68,.82,.035);
  kit.box(scene,brass,x,1.18,9.591,.043,.85,.035);
  kit.box(scene,brass,x,1.18,9.616,.69,.039,.021);
 }
 for(const s of [-1,1]){
  const x=s*(edge-.4);
  kit.cyl(scene,iron,x,poop+.73,9.31,.12,.62);
  kit.put('taperDown',scene,'glow','#ffc374',x,poop+1.2,9.31,.20,.43,.20);
  kit.cone(scene,iron,x,poop+1.51,9.31,.25,.21);
 }
 chiselledEnd(-7.84,-12.9);chiselledEnd(9.44,10.95);
 kit.beam(scene,oak,[0,.32,-9.1],[0,2.24,-15.15],.14);
 kit.beam(scene,rope,[0,2.24,-15.15],[-1,7,-.6],.034);
 kit.cyl(scene,oak,-1,2.08,-.6,.32,9.06);
 for(const y of [-1.1,.14,1.54,3.05,4.58,6.18])kit.cyl(scene,iron,-1,y,-.6,.338,.095);
 for(const [y,w,h] of [[6.26,7.6,2.65],[8.41,5.6,1.85]]){
  kit.beam(scene,oak,[-1-w*.54,y,-.6],[-1+w*.54,y,-.6],.091);
  cloth(scene,w,h,-1,y-.05,-.59);
 }
 kit.cyl(scene,oak,-1,7.48,-.6,.12,1.96);
 kit.taper(scene,oak,-1,6.67,-.6,.42,.23,true);
 kit.cyl(scene,iron,-1,6.81,-.6,.46,.082);
 kit.cyl(scene,oak,-1,8.72,-.6,.049,.65);
 const flagGeo=new T.BufferGeometry();
 flagGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,0, 0,-.39,0, .71,-.32,.11, 0,0,0, .71,-.32,.11, .71,.05,.11, .71,.05,.11, .71,-.32,.11, 1.49,-.13,-.08],3));
 flagGeo.computeVertexNormals();
 const pennant=new T.Mesh(flagGeo,stage.toon('#b34036',{side:T.DoubleSide}));pennant.position.set(-1,9.04,-.6);scene.add(pennant);
 kit.cyl(scene,oak,0,4.52,8.73,.13,4.84);
 kit.beam(scene,oak,[-2,6.65,8.73],[2,6.65,8.73],.066);cloth(scene,3.7,1.46,0,6.61,8.74);
 // The helm is the landmark seen from either stair on reaching the quarterdeck.
 kit.box(scene,brass,0,poop+.77,8.02,.5,.12,.34);
 kit.ring(scene,oak,0,poop+1.13,7.82,.6);
 kit.ball(scene,brass,0,poop+1.13,7.82,.135,.135,.11);
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,dx=Math.sin(a),dy=Math.cos(a);
  kit.beam(scene,oak,[dx*.11,poop+1.13+dy*.11,7.82],[dx*.78,poop+1.13+dy*.78,7.82],.038);
  kit.ball(scene,brass,dx*.79,poop+1.13+dy*.79,7.82,.055,.055,.052);
 }
 // Capstan, lashings and distinctive stamped corners on the cargo.
 kit.cyl(scene,iron,-1.78,.68,-3.5,.30,.16);
 kit.cyl(scene,brass,-1.78,.80,-3.5,.21,.09);
 for(let i=0;i<4;i++)kit.beam(scene,oak,[-1.78,.74,-3.5],[-1.78+.53*Math.cos(i*Math.PI/2),.74,-3.5+.53*Math.sin(i*Math.PI/2)],.045);
 for(const box of timber.filter(b=>b.name.includes('cargo')||b.name.includes('chest'))){
  for(const f of [.16,.84]){
   const x=box.min[0]+(box.max[0]-box.min[0])*f;
   kit.box(scene,iron,x,box.max[1]+.016,(box.min[2]+box.max[2])/2,.062,.032,box.max[2]-box.min[2]+.038);
   for(const z of [box.min[2]-.01,box.max[2]+.01])kit.box(scene,iron,x,(box.max[1]+box.min[1])/2,z,.062,box.max[1]-box.min[1],.02);
  }
 }
 for(const [x,z,size] of [[-15,-21,.93],[13,-25,.72],[-24,8,.57]]){
  const vessel=kit.group(scene,x,-3.05,z,0,-.38,0,size);
  kit.ball(vessel,'#4b5553',0,.25,0,3.95,.91,1.03);kit.box(vessel,oak,0,.98,0,6.5,.4,1.11);
  for(const [mx,h] of [[-1.69,5.12],[.16,6],[1.94,4.42]]){
   kit.cyl(vessel,oak,mx,h/2+.8,0,.085,h);cloth(vessel,2.22,1.46,mx,h+.60,0,true);cloth(vessel,2.54,1.33,mx,h-1,.07,true);
  }
 }
 kit.flush();
 return {update(time:number){pennant.rotation.y=.14*Math.sin(time*3.2);seaTexture.offset.y=time*.002; ripples.position.x=Math.sin(time*.22)*.32;
  for(let i=0;i<sails.length;i++)sails[i].rotation.x=.023*Math.sin(time*1.29+i*.77);
 }};
}



